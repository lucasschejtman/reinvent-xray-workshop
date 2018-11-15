const path = require('path');
const XRay = require('aws-xray-sdk');
const AWS = XRay.captureAWS(require('aws-sdk'));
const http = XRay.captureHTTPs(require('http'));
const express = require('express');
const bodyParser = require('body-parser');
const queryString = require('querystring');
const ejsLayouts = require("express-ejs-layouts");

AWS.config.region = process.env.AWS_REGION || 'us-east-1';

// XRay configuration
XRay.config([
    XRay.plugins.EC2Plugin, 
    XRay.plugins.ElasticBeanstalkPlugin
]);
XRay.middleware.setSamplingRules('sampling.json');
XRay.middleware.enableDynamicNaming();

const app = express();
const sns = new AWS.SNS();
const ddb = new AWS.DynamoDB();
const ddbTable = process.env.STARTUP_SIGNUP_TABLE || 'awseb-e-dwmigyhgey-stack-StartupSignupsTable-1DTBMQA6XVMJC';
const snsTopic = process.env.NEW_SIGNUP_TOPIC || 'arn:aws:sns:us-east-1:440695699313:awseb-e-dwmigyhgey-stack-NewSignupTopic-N96B84MRJ5SE';
const apiCNAME = process.env.API_CNAME || 'localhost';

const renderPage = (res, page) => {
    XRay.captureAsyncFunc('Page Render', seg => {
        seg.addAnnotation('page', page);
        res.render(page, {
            static_path: 'static',
            theme: process.env.THEME || 'flatly'
        });
        seg.close();
    });
    res.status(200).end();
};

// Express configuration
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set("layout extractScripts", true);
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(bodyParser.urlencoded({ extended:false }));
app.use(ejsLayouts);
app.use(XRay.express.openSegment('myfrontend'));

// Routes configuration
app.get('/',    (_, res) => renderPage(res, 'home'));
app.get('/m-1', (_, res) => renderPage(res, 'm-1'));
app.get('/m-2', (_, res) => renderPage(res, 'm-2'));
app.get('/m-3', (_, res) => renderPage(res, 'm-3'));

app.post('/m-1', ({ body }, res) => {
    const item = {
        'email': {'S': body.email},
        'name': {'S': body.name},
        'preview': {'S': body.previewAccess},
        'theme': {'S': body.theme}
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
                res.status(500).end("DDB Error");
            }
        } else {
            sns.publish({
                'Message': 'Name: ' + body.name + "\r\nEmail: " + body.email 
                                    + "\r\nPreviewAccess: " + body.previewAccess 
                                    + "\r\nTheme: " + body.theme,
                'Subject': 'New user sign up!!!',
                'TopicArn': snsTopic
            }, function(err, _) {
                if (err) {
                    res.status(500).end("SNS Error");
                } else {
                    res.status(201).end("Success");
                }
            });            
        }
    });
});

app.post('/signup', async ({ body }, res) => {
    const item = {
        'email': {'S': body.email},
        'name': {'S': body.name},
        'preview': {'S': body.previewAccess},
        'theme': {'S': body.theme}
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
                res.status(500).end("DDB Error");
            }
        } else {
            sns.publish({
                'Message': 'Name: ' + body.name + "\r\nEmail: " + body.email 
                                    + "\r\nPreviewAccess: " + body.previewAccess 
                                    + "\r\nTheme: " + body.theme,
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
    seg.addAnnotation('theme', req.body.theme);
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

app.use(XRay.express.closeSegment());

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running at http://127.0.0.1:${port}/`);
});
