const XRay = require('aws-xray-sdk');
const AWS = XRay.captureAWS(require('aws-sdk'));

AWS.config.region = process.env.REGION;

const sns = new AWS.SNS();
const ddb = new AWS.DynamoDB();

const ddbTable = process.env.DDB_TABLE;
const snsTopic = process.env.SNS_TOPIC;

exports.handler = ({ body }, _, callback) => {
    // Extract properties from the request body
    const {
        name,
        email,
        previewAccess
    } = JSON.parse(body);

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

    let seg = XRay.getSegment().addNewSubsegment('lambda-segment');
    seg.addAnnotation('name', name);
    seg.addAnnotation('email', email);
    seg.addAnnotation('previewAccess', previewAccess);

    ddb.putItem(ddbPayload, (err, _) => {
        if (err) {
            if (err.code === 'ConditionalCheckFailedException') {
                seg.close();
                callback(null, { statusCode: 200, body: JSON.stringify({ message: 'DuplicateUser' }) });
            } else {
                console.log(err);
                seg.close(err, false);
                callback(null, { statusCode: 500, body: JSON.stringify({ message: 'DDBError' }) });
            }
        } else {
            sns.publish(snsPayload, (err, _) => {
                if (err) {
                    console.log(err);
                    seg.close(err, false);
                    callback(null, { statusCode: 500, body: JSON.stringify({ message: 'SNSError' }) });
                } else {
                    seg.close();
                    callback(null, { statusCode: 200, body: JSON.stringify({ message: 'Success' }) });
                }
            });            
        }
    });
};