// Application implementing SMS and Email notification as a result of an Amazon Alexa Intent request.
var Alexa = require('ask-sdk-core');
const { SES } = require('aws-sdk');
// const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');

// list of permissions granted by user
//address, email and phone number saved in alexa devices account
const ADDR_PERMISSIONS = ['read::alexa:device:all:address'];
const PERMISSIONS = ['alexa::profile:email:read', 'alexa::profile:mobile_number:read'];

// For email integration
var AWS_ACCESS_KEY_ID = "AKIAIN4S5YFN34Q34MSQ";
var AWS_SECRET_ACCESS_KEY = "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";

// Twilio Credentials
let accountSid = 'AC2d5b69919b64f9fa7cd4af8fe15b4ef2';
let authToken = '4b7ba4af577390c7567158666c481520';
let fromNumber = '+16235522205';

const messages = {
  NOTIFY_MISSING_PERMISSIONS: 'Please enable Location permissions in the Amazon Alexa app.',
  NO_ADDRESS: 'It looks like you don\'t have an address set. You can set your address from the companion app.',
  ADDRESS_AVAILABLE: 'Here is your full address: ',
  ERROR: 'Uh Oh. Looks like something went wrong.',
  LOCATION_FAILURE: 'There was an error with the Device Address API. Please try again.',
  UNHANDLED: 'This skill doesn\'t support that. Please ask something else.'
};

let https = require('https');
let queryString = require('querystring');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to My Housekeeper! Enter a room you are cleaning or say send a report to send a report?';
        const repromptText = 'Once again, which room are you starting to clean?';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptText)
            .getResponse();
    }
};

const CleaningRoomHandler = {
    canHandle(handlerInput) {

        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        const room = sessionAttributes.hasOwnProperty('currRoom') ? sessionAttributes.currRoom : 0;

        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest' && room;

    },
    handle(handlerInput) {
        
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        const room = sessionAttributes.hasOwnProperty('currRoom') ? sessionAttributes.currRoom : 0;

        const speakOutput = `Welcome back! It looks like you were cleaning the ${room}. Did you finish cleaning that room?`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

const GetNumRoomsHandler = {
    canHandle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};
        
        const numRooms = sessionAttributes.hasOwnProperty('numRooms') ? sessionAttributes.numRooms : 0;
        
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest' && (numRooms === 0);
    },
    handle(handlerInput) {
        const speakOutput = 'Hello! How many rooms are you cleaning today?';
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

const PostNumRoomsHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NumRoomsIntent';
    },
    async handle(handlerInput) {
        const numRooms = handlerInput.requestEnvelope.request.intent.slots.number.value;
        
        const attributesManager = handlerInput.attributesManager;
        
        const attribute = {
            "numRooms" : numRooms
        };
        
        attributesManager.setPersistentAttributes(attribute);
        await attributesManager.savePersistentAttributes();
        
        const speakOutput = 'Which room are you starting to clean first?';
        const repromptText = 'Once again, which room are you starting to clean?';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptText)
            .getResponse();
    }
};

const CaptureRoomIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ReportCleaningIntent';
    },
    async handle(handlerInput) {
        const room = handlerInput.requestEnvelope.request.intent.slots.room.value;
        
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};
        var roomAttribute;
        
        if (sessionAttributes.hasOwnProperty('rooms')) {
            roomAttribute = {
                "numRooms" : sessionAttributes.numRooms,
                "currRoom" : room,
                "rooms" : sessionAttributes.rooms
            };
        } else {
            roomAttribute = {
                "numRooms" : sessionAttributes.numRooms,
                "currRoom" : room
            };
        }
        
        attributesManager.setPersistentAttributes(roomAttribute);
        await attributesManager.savePersistentAttributes();
        
        const speakOutput = `Ok, starting to clean the ${room}.`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// Report issue
const CaptureIssueIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CaptureIssueIntent';
    },
    handle(handlerInput) {
        const room = handlerInput.requestEnvelope.request.intent.slots.room.value;
        //const number = handlerInput.requestEnvelope.request.intent.slots.number.value;
            
        //const speakOutput = `Thanks, ${room} ${number} needs assistance, I'll forward the issue to the owner.`;
        const speakOutput = `Thanks, ${room} has damage, I'll forward the damage report to the owner.`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Is there any other issue you would like to report?')
            .getResponse();
    }
};

const CaptureMaintenanceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CaptureMaintenanceIntent';
    },
    handle(handlerInput) {
        const room = handlerInput.requestEnvelope.request.intent.slots.room.value;
        //const number = handlerInput.requestEnvelope.request.intent.slots.number.value;
            
        //const speakOutput = `Thanks, ${room} ${number} needs assistance, I'll forward the issue to the owner.`;
        const speakOutput = `Thanks, ${room} needs maintenance assistance, I'll forward the request to the owner.`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Is there any other maintenance request you would like to report?')
            .getResponse();
    }
};


// // Lambda Send SMS function:
// Sends an SMS message using the Twilio API
// to: Phone number to send to
// body: Message body
// completedCallback(status) : Callback with status message when the function completes.
function sendSMS(toNumber, body) {

    // The SMS message to send
    let message = {
        To: toNumber,
        From: fromNumber,
        Body: body
    };

    let messageString = queryString.stringify(message);

    // Options and headers for the HTTP request
    let options = {
        host: 'api.twilio.com',
        port: 443,
        path: '/2010-04-01/Accounts/' + accountSid + '/Messages.json',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(messageString),
            'Authorization': 'Basic ' + new Buffer(accountSid + ':' + authToken).toString('base64')
        }
    };

    // Setup the HTTP request
    let req = https.request(options, function(res) {

        res.setEncoding('utf-8');

        // Collect response data as it comes back.
        let responseString = '';
        res.on('data', function(data) {
            responseString += data;
        });

        // Log the responce received from Twilio.
        res.on('end', function() {
            console.log('Twilio Response: ' + responseString);

            let parsedResponse = JSON.parse(responseString);

            let sessionAttributes = {};
            // let cardTitle = "Sent";
            let speechOutput = "Ok, Sms sent.";
            //
            // let repromptText = "";
            // let shouldEndSession = true;

            if ("queued" === parsedResponse.status) {
            }
            else {
                speechOutput = parsedResponse.message;
            }
        });
    });

    // Handler for HTTP request errors.
    req.on('error', function(e) {
        console.error('HTTP error: ' + e.message);

        let sessionAttributes = {};
        let cardTitle = "Sent";
        let speechOutput = "Unfortunately, sms request has finished with errors.";

        let repromptText = "";
        let shouldEndSession = true;
    });

    // Send the HTTP request to the Twilio API.
    // Log the message we are sending to Twilio.
    console.log('Twilio API call: ' + messageString);
    req.write(messageString);
    req.end();

}

//  // Lambda Send Email function:
// Send Email using  AWS SES API
// template: text for email
// emailTo: email want to send to
// from: email that is sending
// subject: subject of email
// replyEmail: email to reply to
//  https://aws.amazon.com/premiumsupport/knowledge-center/lambda-send-email-ses/
function sendEmail(template, emailTo, from, subject, replyEmail) {
    // parameters to pass to API
    const params = {
        Destination: {
            CcAddresses: [],
            ToAddresses: [emailTo],
        },
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: template,
                },
                Text: {
                    Charset: 'UTF-8',
                    Data: '',
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: subject,
            },
        },
        Source: from,
        ReplyToAddresses: [replyEmail],
    };
    //  return new ses object sending the email
    return new SES({ apiVersion: '2010-12-01', maxRetries: 5, retryDelayOptions: { base: 500 } }).sendEmail(params).promise();
}

// Send Report
// checks for and gets user permission to retrieve their information and then sends approprite notifications
const sendReport = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;

    return request.type === 'IntentRequest' && request.intent.name === 'sendReport';
  },
  async handle(handlerInput) {
    const { requestEnvelope, serviceClientFactory, responseBuilder } = handlerInput;

    const consentToken = requestEnvelope.context.System.user.permissions
      && requestEnvelope.context.System.user.permissions.consentToken && requestEnvelope.context.System.apiAccessToken;
    if (!consentToken) {
      return responseBuilder
        .speak(messages.NOTIFY_MISSING_PERMISSIONS)
        .withAskForPermissionsConsentCard(PERMISSIONS)
        .getResponse();
    }
    try {
      const { deviceId } = requestEnvelope.context.System.device;
      const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
      const address = await deviceAddressServiceClient.getFullAddress(deviceId);

      console.log('Address successfully retrieved, now responding to user.');
      
      const client = serviceClientFactory.getUpsServiceClient();
      
      const number = await client.getProfileMobileNumber();
      if (number == null) {
          console.log('Number un-successfully retrieved.');
      } else {
        console.log('Number successfully retrieved.');
      }
      
      
    //   save the profiles number
      let toNumber = number.countryCode + number.phoneNumber;
      console.log('Phone number successfully retrieved.');
     
    //   save the profiles email
      const email = await client.getProfileEmail();
      if (email == null) {
          console.log('Email un-successfully retrieved.');
      } else {
        console.log('Email successfully retrieved.');
      }
      
      let response;
      
      if (address.addressLine1 === null && address.stateOrRegion === null) {
        response = responseBuilder.speak(messages.NO_ADDRESS).getResponse();
      } else {
          
        const userAddress = `${address.addressLine1}, ${address.stateOrRegion}, ${address.postalCode}`;
        
        let message = "Dear Customer, Cleaning services has completed cleaning location: " + userAddress + " and is ready to be re-listed. Here is your cleaning report:";

        // send email
        try {
            // sendEmail(message, emailTo, emailFrom, subject, replyEmail);
            sendEmail(
                message, 
                email,
                'myhousekeeperskill@gmail.com', 
                'My Housekeeper - Home at ' + userAddress + 'is ready.', 
                'myhousekeeperskill@gmail.com')
            ;
        }
        catch (e) {
            console.log('Error encountered while sending an email');
            console.log(e);
        }

        // Send SMS
        try {
            sendSMS(toNumber, "Cleaning services have finished cleaning the rental at " + userAddress + " and a report has been emailed.");
        }
        catch (e) {
            console.log('Error encountered while sending an SMS');
            console.log(e);
        }
        
        response = responseBuilder.speak("Success! Notifications have been sent.").getResponse();
      }
      return response;
    } catch (error) {
      if (error.name !== 'ServiceError') {
        const response = responseBuilder.speak(messages.ERROR).getResponse();
        return response;
      }
      throw error;
    }
  },
};


// retrieves users information when granted
const getUserInformation = {
    canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;

    return request.type === 'IntentRequest' && request.intent.name === 'GetInfo';
  },
  async handle(handlerInput) {
    const { requestEnvelope, serviceClientFactory, responseBuilder } = handlerInput;

    const consentToken = requestEnvelope.context.System.user.permissions
      && requestEnvelope.context.System.user.permissions.consentToken;
    if (!consentToken) {
      return responseBuilder
        .speak(messages.NOTIFY_MISSING_PERMISSIONS)
        .withAskForPermissionsConsentCard(ADDR_PERMISSIONS)
        .getResponse();
    }
    try {
      const { deviceId } = requestEnvelope.context.System.device;
      const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
      const address = await deviceAddressServiceClient.getFullAddress(deviceId);

      console.log('Address successfully retrieved, now responding to user.');

      let response;
      if (address.addressLine1 === null && address.stateOrRegion === null) {
        response = responseBuilder.speak(messages.NO_ADDRESS).getResponse();
      } else {
        const ADDRESS_MESSAGE = `${messages.ADDRESS_AVAILABLE + address.addressLine1}, ${address.stateOrRegion}, ${address.postalCode}`;
        response = responseBuilder.speak(ADDRESS_MESSAGE).getResponse();
      }
      return response;
    } catch (error) {
      if (error.name !== 'ServiceError') {
        const response = responseBuilder.speak(messages.ERROR).getResponse();
        return response;
      }
      throw error;
    }
  },
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const YesIntent = {
    canHandle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};
        
        const room = sessionAttributes.hasOwnProperty('currRoom') ? sessionAttributes.currRoom : 0;
          
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' 
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
            && (room !== 0);
    },
    handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};
        //handlerInput.attributesManager.deletePersistentAttributes();
        
        const numRooms = sessionAttributes.hasOwnProperty('numRooms') ? sessionAttributes.numRooms : 0;
        const room = sessionAttributes.hasOwnProperty('currRoom') ? sessionAttributes.currRoom : 0;
        const rooms = sessionAttributes.hasOwnProperty('rooms') ? sessionAttributes.rooms : 0;
        var roomsAttribute;
        
        if (rooms) {
            roomsAttribute = {
                "numRooms" : numRooms,
                "rooms" : rooms.concat(room)
            };
            
            attributesManager.setPersistentAttributes(roomsAttribute);
        } else {
            roomsAttribute = {
                "numRooms" : numRooms,
                "rooms" : [ room ]
            };
            
            attributesManager.setPersistentAttributes(roomsAttribute);
        }
        
        attributesManager.savePersistentAttributes();
    
        var speakOutput;
        if ((rooms.length + 1) === parseInt(numRooms)) {
            speakOutput = "Awesome! Thank you for your hard work. Hope you have a great rest of the day!";
        } else {
            speakOutput = "Nice work!";
        }
    
        return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
    }
};

const NoIntent = {
    canHandle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};
        
        const room = sessionAttributes.hasOwnProperty('currRoom') ? sessionAttributes.currRoom : 0;
        
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' 
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
            && (room !== 0);
    },
    handle(handlerInput) {
        const speakOutput = "Ok, keep up the good work!";
        
        return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const LoadRoomInterceptor = {
    async process(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = await attributesManager.getPersistentAttributes() || {};

        const numRooms = sessionAttributes.hasOwnProperty('numRooms') ? sessionAttributes.numRooms : 0;
        const room = sessionAttributes.hasOwnProperty('currRoom') ? sessionAttributes.currRoom : 0;
        const rooms = sessionAttributes.hasOwnProperty('rooms') ? sessionAttributes.rooms : 0;

        if (rooms !== 0) {
            if (rooms.length === parseInt(numRooms)) {
                handlerInput.attributesManager.deletePersistentAttributes();
            } else {
                attributesManager.setSessionAttributes(sessionAttributes);
            }
        } else {
            attributesManager.setSessionAttributes(sessionAttributes);
        }
    }
};


const GetAddressError = {
  canHandle(handlerInput, error) {
    return error.name === 'ServiceError';
  },
  handle(handlerInput, error) {
    if (error.statusCode === 403) {
      return handlerInput.responseBuilder
        .speak(messages.NOTIFY_MISSING_PERMISSIONS)
        .withAskForPermissionsConsentCard(ADDR_PERMISSIONS)
        .getResponse();
    }
    return handlerInput.responseBuilder
      .speak(messages.LOCATION_FAILURE)
      .reprompt(messages.LOCATION_FAILURE)
      .getResponse();
  },
};

// const s3PersistenceAdapter = new persistenceAdapter.S3PersistenceAdapter({ 
//     bucketName: process.env.S3_PERSISTENCE_BUCKET
// });

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    // .withApiClient(new Alexa.DefaultApiClient())
    // .withPersistenceAdapter(
    //     new persistenceAdapter.S3PersistenceAdapter({bucketName:process.env.S3_PERSISTENCE_BUCKET})
    // )
    // .withPersistenceAdapter(s3PersistenceAdapter)
    
    .addRequestHandlers(
        GetNumRoomsHandler,
        CleaningRoomHandler,
        LaunchRequestHandler,
        PostNumRoomsHandler,
        CaptureRoomIntentHandler,
        CaptureIssueIntentHandler,
        CaptureMaintenanceIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        YesIntent,
        NoIntent,
        sendReport,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    // .addRequestInterceptors(
    //     LoadRoomInterceptor
    // )
    .withApiClient(new Alexa.DefaultApiClient())
    .addErrorHandlers(
        ErrorHandler,
        GetAddressError
    )

    .lambda();