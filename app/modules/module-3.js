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
    const ddbPayload = {
        'TableName': ddbTable,
        'Item': {
            'name': {'S': name},
            'email': {'S': email},
            'preview': {'S': previewAccess}
        },
        'Expected': { email: { Exists: false } }  
    };

    // SNS payload
    const snsPayload = {
        'Message': 
            `Name: ${name}  \r\n
            Email: ${email} \r\n
            PreviewAccess: ${previewAccess}`,
        'Subject': 'New user sign up!!!',
        'TopicArn': snsTopic
    };

    // Annotations
    // TODO: Capture the current segment and add XRay annotations for name, email and previewAccess
    // If you don't feel like writing code or get stuck you can copy/paste the solution
    // from solutions/module-3.js

    ddb.putItem(ddbPayload, (err, _) => {
        if (err) {
            if (err.code === 'ConditionalCheckFailedException') {
                res.status(409).end("User already exists");
            } else {
                res.status(500).end("DDB Error");
            }
        } else {
            sns.publish(snsPayload, (err, _) => {
                if (err) {
                    res.status(500).end("SNS Error");
                } else {
                    res.status(201).end("Success");
                }
            });            
        }
    });
};

module.exports = API;