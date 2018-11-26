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

// Dynamo and SNS
ddb.putItem(ddbPayload, (err, _) => {
    if (err) {
        // TODO: Check for conditional check failed
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