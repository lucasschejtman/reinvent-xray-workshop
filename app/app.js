const XRay = require('aws-xray-sdk');
const AWS = XRay.captureAWS(require('aws-sdk'));
const http = XRay.captureHTTPs(require('http'));
const express = require('express');
const bodyParser = require('body-parser');
const queryString = require('querystring');

AWS.config.region = process.env.AWS_REGION;

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
const ddbTable = process.env.STARTUP_SIGNUP_TABLE;
const snsTopic = process.env.NEW_SIGNUP_TOPIC;
const apiCNAME = process.env.API_CNAME || 'localhost';

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({ extended:false }));
app.use(XRay.express.openSegment('myfrontend'));

app.get('/', (_, res) => {
    XRay.captureAsyncFunc('Page Render', seg => {
        res.render('index', {
            static_path: 'static',
            theme: process.env.THEME || 'flatly',
            flask_debug: process.env.FLASK_DEBUG || 'false'
        });
        seg.close();
    });
    
    res.status(200).end();
});

app.post('/signup', ({ body }, res) => {
    const item = {
        'email': {'S': body.email},
        'name': {'S': body.name},
        'preview': {'S': body.previewAccess},
        'theme': {'S': body.theme}
    };

    var seg = XRay.getSegment();
    seg.addAnnotation('email', body.email);
    seg.addAnnotation('theme', body.theme);
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
