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
        }
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

    // TODO: Put item into the Dynamo table and then publish the SNS notification
    ddb.putItem(ddbPayload, (err, _) => {
        if (err) {
            res.status(500).end("DDB Error");
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