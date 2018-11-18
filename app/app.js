const path = require('path');
const XRay = require('aws-xray-sdk');
// Capture all AWS activity
const AWS = XRay.captureAWS(require('aws-sdk'));
const express = require('express');
const bodyParser = require('body-parser');
const queryString = require('querystring');
const ejsLayouts = require("express-ejs-layouts");

require('dotenv').config();

AWS.config.region = process.env.AWS_REGION;

// XRay configuration
XRay.config([
    // Log EC2 and Elastic Beanstalk information out of the box
    XRay.plugins.EC2Plugin, 
    XRay.plugins.ElasticBeanstalkPlugin
]);
XRay.middleware.setSamplingRules('sampling.json');
XRay.middleware.enableDynamicNaming();
// Capture all HTTP activity
XRay.captureHTTPsGlobal(require('http'));
XRay.captureHTTPsGlobal(require('https'));

const app = express();
const sns = new AWS.SNS();
const ddb = new AWS.DynamoDB();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const renderPage = (res, page, opts) => {
    XRay.captureAsyncFunc('Page Render', seg => {
        seg.addAnnotation('page', opts.name);
        res.render(page, {
            static_path: opts.static || 'static',
            locals: opts.locals || {}
        });
        seg.close();
    });
    res.status(200).end();
};

// Express configuration
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set("layout extractScripts", true);
// Serve static content from express instead of Nginx when not production
if(process.env.ENVIRONMENT !== "PROD") 
    app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(bodyParser.urlencoded({ extended:  false }));
app.use(ejsLayouts);
// Open an XRay segment the beginning of the request
app.use(XRay.express.openSegment('myfrontend'));

// Routes configuration
app.get('/', (_, res) => renderPage(res, 'home', { name: 'home' }));
app.get('/modules/:id', (req, res) => 
    renderPage(res, 'module', {
            static: '../static',
            name: `module-${req.params.id}`,
            locals: { endpoint: `/modules/${req.params.id}` }
        }
    )
);

// API configuration
app.post('/modules/:id', (req, res) => {
    const module = require(`./modules/module-${req.params.id}`)(XRay, ddb, sns);
    return module(req, res);
});

app.post('/signup', async ({ body }, res) => {
    const item = {
        'email': {'S': body.email},
        'name': {'S': body.name},
        'preview': {'S': body.previewAccess}
    };

    let seg = XRay.getSegment();
    seg.addAnnotation('name', body.name);
    seg.addAnnotation('email', body.email);
    seg.addAnnotation('previewAccess', body.previewAccess);

    ddb.putItem({
        'TableName': ddbTable,
        'Item': item,
        'Expected': { email: { Exists: false } }        
    }, (err, _) => {
        if (err) {
            if (err.code === 'ConditionalCheckFailedException') {
                res.status(409).end("User already exists");
            } else {
                console.log(err);
                res.status(500).end("DDB Error");
            }
        } else {
            sns.publish({
                'Message': 'Name: ' + body.name + "\r\nEmail: " + body.email 
                                    + "\r\nPreviewAccess: " + body.previewAccess,
                'Subject': 'New user sign up!!!',
                'TopicArn': snsTopic
            }, (err, _) => {
                if (err) {
                    res.status(500).end("SNS Error");
                } else {
                    res.status(201).end("Success");
                }
            });            
        }
    });
});

app.post('/remoteSignup', function(req, res) {
    var seg = XRay.getSegment();
    seg.addAnnotation('previewAccess', req.body.previewAccess);

    var reqData = queryString.stringify(req.body);

    var options = {
        host: apiCNAME,
        port: '80',
        path: '/signup',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(reqData)
        }
    };

    // Set up the request
    var remoteReq = http.request(options, function(remoteRes) {
        var body = '';
        remoteRes.setEncoding('utf8');
        
        remoteRes.on('data', function(chunk) {
            body += chunk;
        });

        remoteRes.on('end', function() {
            res.status(remoteRes.statusCode).send(body);                
        });
    });

    remoteReq.on('error', function(err) {
        res.status(500).end("Remote error");
    });

    // post the data
    remoteReq.write(reqData);
    remoteReq.end();
});

// Close the XRay segment at the end of the request
app.use(XRay.express.closeSegment());

const server = app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${server.address().address}:${server.address().port}/`);
});
