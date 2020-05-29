# Airbnb-Voice-Driven-Amazon-Alexa-Application
Amazon voice driven application to optimize turn-over rate at Airbnb's.

# Installation Guide:

## What you will need:
  - Alexa Developer Console account
  - Amazon Web Service Management Console account
  - Twilio account

## How to set up:

  ### Set up Alexa Skill in developer console
  
  1. In developer console create a new custom skill and name it "My Housekeeper". 
  2. Under build click on "JSON editor" and paste in the contents of the [en-US.json] (https://github.com/Carlos231/Airbnb-Voice-Driven-Amazon-Alexa-Application/blob/master/interactionModels/custom/en-US.json) file to load all intents needed.
  3. Open the AWS Management Console and find service "Lambda". 
    - Create two environment variables called, "TWILIO_ACCOUNT_SID" and "TWILIO_AUTH_TOKEN". You will place appropriate Twilio account SID and token here.
    - In IAM service give the lambda function permissions for Amazon SES and DynamoDB.
    - In DynamoDB service create a new table "My_HousekeeperDB" and add trigger to lambda function.
    - In Amazon SES service you will be started in sandbox mode so you will need to add a send to and receive email address (you will have to change this in the code before uploading as a zip)
    - Create a new lambda function. Clone the Airbnb-Voice-Driven-Amazon-Alexa-Application directory and zip the node_modules foldier with index.js, package.json and package-lock.json and upload to your newly created lambda function.
    - Keep this page open
  4. Create a twilio account and purchase a number to use for text messaging. Look for and Twilio SID and token to place in environment variables.
  5. Return to the Alexa Developer console
    - Click on Endpoint.
    - Click on "AWS Lambda ARN" and paste your lambda ARN into the field to link the lambda function to Alexa skill
    - Copy Skill ID to be used in lambda function
    - Click on "Permissions" in sidebar and enable Device Address (Full Address), Customer Email Address and Customer Phone Number.
  6. Return to AWS lambda page
    - Click on "Designer" drop down and click "Add trigger"
    - Add trigger for Alexa Skills Kit and paste Skill ID previously copied
    - Make sure there is a trigger for DynamoDB present and enabled as set up in earlier step
  7. You should be all set up to test your new My Housekeeper Alexa Skill

## How to run and test application:
  Application is in testing face so can only access it if have access to the Amazon account in which the application is being developed. Following the code review and code freeze the application will be submitted to Amazon in order to be review, tested, and approved to go live on the Amazon marketplace. In addition, since we are in the testing face Email and SMS notifications will not be enabled as this this requires each individual user to submit their email for us to add to Amazon SES due to still being in sandbox mode. Code for notifications will be provided.
  
  In order to test please email your Amazon account email to be invited to test the application. 
  
  Permissions required: Full Address, Email, and Phone Number. (Enable through phone application)
  
  Sign into https://developer.amazon.com/
  
  Click on My Housekeeper application
  
  Navigate to code section to review code
  
  Navigate to Test section to test the application
  
    Application intents: 
    
      Say, "Alexa, open my housekeeper". You can also type it in.
        - This will launch the skill.
        - Required before running below commands.
        
      Say, "I am cleaning". You can also type it in.
        - This will start/resume the process of cleaning a room.
      
      Say, "Maintenance needed in {room}". You can also type it in.
        - This will send a maintenance report.
        
      Say, "Damage found in {room}". You can also type it in.
        - This will send a issue report.
        
      Say, "Send a report". You can also type it in.
        - This will notify the account owner that their home is finished cleaning and that an email has been sent with a report using the amazon account linked to alexa device in home.
    
### Send a report:
    In order to send notifications through the Alexa Developer Console the user must enable permissions through the Alexa mobile application. For more information on how to download the app click [here](https://www.amazon.com/gp/help/customer/display.html?nodeId=GMR4JYXHYDSTNQRK). The first thing you will need to do is enable permissions. You can do so by opening the Alexa app on your phone clicking the side menu bar to expand it and clicking on "Skills & Games". Next click on "Your Skills" and then look for the "My Housekeeper". In our case it will be under the "dev" menu since the application is still in development face. Once you see My Housekeeper, look for Settings and click on it to grant the My Housekeeper account permissions needed to send notifications to the account owner. Please enable: Device address, Email number, and mobile number. My Housekeeper will only use this information to send appropriate notifications as requested by the user and is never saved or shared to anyone.
  
## Code Review: 

[Code Review Feedback](https://github.com/Carlos231/Airbnb-Voice-Driven-Amazon-Alexa-Application/blob/master/Assignments/Code%20Review%20Response%20for%20CS6.pdf)
  
  Key Changes:
    - More documentation
    - More testing included such as unit tests
    - Some function restructure 

