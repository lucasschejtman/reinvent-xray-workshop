# AWS X-Ray Workshop
Welcome to the AWS X-Ray workshop. In this workshop, you will manage a web application using AWS Elastic Beanstalk, that will integrate with various AWS services as well as remote HTTP calls in which you will be able to understand every interaction that happens from client to server.

## Backstory
You are weeks away from launching your new start up so you've decided to create a landing page to track interest from the market. Whenever a new person adds their interest, you wants to save their details, get an email notification
as well as integrating that event with an external API.

### Current Challenges
The architecture for your application makes use of microservices and managed services when possible in order to remain agile and have a fast go to market strategy. The benefits of such a decentralized architecture are clear but you're starting to realize that tracking errors and potential issues is becoming a really hard thing to do.
You want to keep using this approach but also have more clarity with the ins and outs of your application.

### Questions about your app
* How long is my database operation taking?
* What was the error that caused data not being persisted?
* What other services is a downstream API calling?
* How many services is a particular request calling
* From a single request which component is the slowest
* Many more...

## Why AWS X-Ray
* Trivial set up in both cloud or on-premises scenarios
* Fully managed in certain contexts (AWS Beanstalk, AWS Lambda)
* Native integration with AWS services
* Ability to track downstream HTTP(s) calls
* End to end request tracing (from client to server)

# Pre-Requisites
* [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/installing.html)
* [AWS Elastic Beanstalk CLI](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html)
* NodeJS/NPM
    * [From installer](https://nodejs.org/en/download/)
    * [From package manager](https://nodejs.org/en/download/package-manager/)
* IAM credentials to create roles, beanstalk environments and lambda functions

# Setup

### Step 1 - IAM Creation
In this step you will create the necessary IAM roles for your web application.

To do so, cd into the root of this repository and run the following commands

> aws iam create-role --assume-role-policy-document file://iam-trust-relationship.json --role-name aws-beanstalk-workshop-role

>aws iam put-role-policy --role-name aws-beanstalk-workshop-role --policy-name aws-beanstalk-workshop-policy --policy-document file://iam-policy-document.json

>aws iam create-instance-profile --instance-profile-name aws-beanstalk-workshop-profile

>aws iam add-role-to-instance-profile --instance-profile-name aws-beanstalk-workshop-profile --role-name aws-beanstalk-workshop-role

### Step 2 - Application configuration
Navigate into the beanstalk resource configuration folder (`cd app/.ebextensions`).

In the `options.config` file, find the `XrayReinventBuilderEmail` key and add your email addess to be able to receive email notifications!

Before

```yaml
option_settings:
  aws:elasticbeanstalk:customoption:
    XrayReinventBuilderEmail: TODO_REPLACE_WITH_YOUR_EMAIL
```

After

```yaml
option_settings:
  aws:elasticbeanstalk:customoption:
    XrayReinventBuilderEmail: your@email.com
```

### Step 3 - Install application dependencies
Navigate into the `app` folder and install the dependencies with the following command

>npm install

### Step 4 - Create the AWS Elastic Beanstalk application
*Note: If you have deleted the default VPC the creationg will fail. You would need to update the `options.config` file in order to specify a different VPC (Example below). [Documentation](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.managing.vpc.htmlhttps://docs.aws.amazon.com/elasticbeanstalk/latest/dg/vpc-rds.html)*

Navigate into the `app` folder and initialize your app with the following commands

>eb init --region us-east-1 --platform node.js xray-reinvent-builder

>eb create -ip aws-beanstalk-workshop-profile

Enter an environment name, you can keep the default `xray-reinvent-builder-dev` and then enter a unique `DNS CNAME` prefix.

Select `1) classic` as our load balancer type.

While the stack is creating you should receive an email to confirm the subscription to the SNS topic. Confirm it so you can receive emails coming from the app.

#### Example custom VPC
```yaml
option_settings:
   aws:ec2:vpc:
      VPCId: vpc-087a68c03b9c50c84
      AssociatePublicIpAddress: 'true'
      ELBScheme: public
      ELBSubnets: subnet-0fe6b36bcb0ffc462,subnet-032fe3068297ac5b2
      Subnets: subnet-0fe6b36bcb0ffc462,subnet-032fe3068297ac5b2
```

### Step 5 - Open the application
In the same `app` folder run

>eb open

# Modules

* [Module 1 - Integration](modules/module-1.md)
* [Module 2 - Errors](modules/module-2.md)
* [Module 3 - Annotations](modules/module-3.md)
* [Module 4 - Third Party](modules/module-4.md)

# Cleanup

### Step 1 - Terminate the AWS Elastic Beanstalk application

In the `app` folder run and enter your application name (default is `xray-reinvent-builder`)

>eb terminate --all

### Step 2 - Remove IAM roles and instance profiles

>aws iam remove-role-from-instance-profile --instance-profile-name aws-beanstalk-workshop-profile --role-name aws-beanstalk-workshop-role

>aws iam delete-role-policy --role-name aws-beanstalk-workshop-role --policy-name aws-beanstalk-workshop-policy

>aws iam delete-role --role-name aws-beanstalk-workshop-role

>aws iam delete-instance-profile --instance-profile-name aws-beanstalk-workshop-profile