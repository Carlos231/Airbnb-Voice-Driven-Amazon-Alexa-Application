# Airbnb-Voice-Driven-Amazon-Alexa-Application
Amazon voice driven application to optimize turn-over rate at Airbnb's.

How to set up:

  Application is in testing face so can only access it if have access to the Amazon account in which the application is being developed. Following the code review and code freeze the application will be submitted to Amazon in order to be review, tested, and approved to go live on the Amazon marketplace. In addition, since we are in the testing face Email and SMS notifications will not be enabled as this this requires each individual user to submit their email for us to add to Amazon SES due to still being in sandbox mode. Code for notifications will be provided.
  
  In order to test please email your Amazon account email to be invited to test the application. 
  
  Permissions required: Full Address, Email, and Phone Number.
  
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
    
Send a report:
    The amazon developer portal does not support this function but we can access it through the Amazon Alexa Application. For more information on how to download the app click [here](https://www.amazon.com/gp/help/customer/display.html?nodeId=GMR4JYXHYDSTNQRK). The first thing you will need to do is enable permissions. You can do so by opening the Alexa app on your phone clicking the side menu bar to expand it and clicking on "Skills & Games". Next click on "Your Skills" and then look for the "My Housekeeper". In our case it will be under the "dev" menu since the application is still in development face. Once you see My Housekeeper, look for Settings and click on it to grant the My Housekeeper account permissions needed to send notifications to the account owner. Please enable: Device address, Email number, and mobile number. My Housekeeper will only use this information to send appropriate notifications as requested by the user and is never saved or shared to anyone.
  
Code Review: 

[Code Review Feedback](https://github.com/Carlos231/Airbnb-Voice-Driven-Amazon-Alexa-Application/blob/master/Assignments/Code%20Review%20Response%20for%20CS6.pdf)
  
  Key Changes:
    - More documentation
    - More testing included such as unit tests
    - Some function restructure 

