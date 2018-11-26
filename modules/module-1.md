# Module 1 - Integration

In this module you'll understand how to integrate AWS X-Ray into your codebase to start capturing meaningful application insights.

Start by reviewing the `app.js` file to understand the bootstrapping process for AWS X-Ray.

Once you're ready, head into the `modules/module-1.js` file and follow the instructions. After the missing code has been implemented, you can deploy the application to start capturing `Module 1` tracing information.

## Deploy app
From the `app` folder run

>eb deploy

Once its finished, open the application by running

>eb open

Sign up a few users, try to sign up with the same user more than once as well.

## Review traces

### Service Map
After playing with the application, head into the AWS X-Ray [console](https://console.aws.amazon.com/xray) and select `Service map`. You should now see an average of all your requests.

[Service Map Image]

### Traces
You can also select a particular trace from the `Traces` view.

[Traces Image]

## Wrap up
Now you know how to integrate AWS X-Ray into your application and start capturing insights, as well as navigating the console to review your traces' behavior.