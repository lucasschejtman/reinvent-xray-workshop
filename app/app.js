const path = require('path');
// Import XRay
const XRay = require('aws-xray-sdk');
// Capture all AWS activity
const AWS = XRay.captureAWS(require('aws-sdk'));
const express = require('express');
const bodyParser = require('body-parser');
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

// Close the XRay segment at the end of the request
app.use(XRay.express.closeSegment());

const server = app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${server.address().address}:${server.address().port}/`);
});
