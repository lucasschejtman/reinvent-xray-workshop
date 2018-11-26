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