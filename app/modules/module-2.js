const ddbTable = process.env.DDB_TABLE;
const snsTopic = process.env.SNS_TOPIC;

const API = (XRay, ddb, sns) => ({ body }, res) => {
    // Extract properties from the request body
    const {
        name,
        email,
        previewAccess
    } = body;

    // DDB payload
    // TODO: Add conditional check for existing email
    // If you don't feel like writing code or get stuck you can copy/paste the solution
    // from solutions/module-2.js

    // SNS payload
    const snsPayload = {
        'Message': 
            `Name: ${name}  \r\n
            Email: ${email} \r\n
            PreviewAccess: ${previewAccess}`,
        'Subject': 'New user sign up!!!',
        'TopicArn': snsTopic
    };

    // Dynamo and SNS
    // TODO: Put item into the Dynamo table and then publish the SNS notification and
    // also check for conditional check failed. Return a 409 for that use case
    // If you don't feel like writing code or get stuck you can copy/paste the solution
    // from solutions/module-2.js
    
};

module.exports = API;