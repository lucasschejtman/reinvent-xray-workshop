const request = require('request');

const API_ID = process.env.API_ID;

const API = (_, __, ___) => ({ body }, res) => {
    const {
        name,
        email,
        previewAccess
    } = body;

    request({
        url: `https://${API_ID}.execute-api.us-east-1.amazonaws.com/XrayReinventBuilderStage/xrayreinvent`,
        json: true,
        method: "POST",
        body: { name, email, previewAccess }
    }, (err, resp, body) => {
        if(err) 
            return res.status(500).end('HTTP error');
        if(body.message === 'DuplicateUser') 
            return res.status(409).end('User already exists"');
        res.status(201).end('Success');
    });
};

module.exports = API;