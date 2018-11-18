1) cd app/
2) eb init
3) eb create -ip aws-beanstalk-workshop-profile
4) eb terminate -all

IAM Creation
============
aws iam create-role --assume-role-policy-document file://iam-trust-relationship.json --role-name aws-beanstalk-workshop-role
aws iam put-role-policy --role-name aws-beanstalk-workshop-role --policy-name aws-beanstalk-workshop-policy --policy-document file://iam-policy-document.json
aws iam create-instance-profile --instance-profile-name aws-beanstalk-workshop-profile
aws iam add-role-to-instance-profile --instance-profile-name aws-beanstalk-workshop-profile --role-name aws-beanstalk-workshop-role

Lambda Deployment
=================
aws lambda update-function-code --function-name XrayReinventBuilderLambda --zip-file fileb://lambda.zip