// Application implementing SMS and Email notification as a result of an Amazon Alexa Intent request.
var Alexa = require('ask-sdk-core');
const { SES } = require('aws-sdk');
const dbdAdapter = require('ask-sdk-dynamodb-persistence-adapter');

// const dbHelper = require('./helpers/dbHelper');
const ddbTableName = 'MyHousekeeper_DB';

const ddbPersistenceAdapter = new dbdAdapter.DynamoDbPersistenceAdapter({
    tableName: ddbTableName,
    createTable: true,
});


// list of permissions granted by user
//address, email and phone number saved in alexa devices account
const ADDR_PERMISSIONS = ['read::alexa:device:all:address'];
const PERMISSIONS = ['alexa::profile:email:read', 'alexa::profile:mobile_number:read'];

// Credentials saved in Environment variables in lambda
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = '+16235522205';

let https = require('https');
let queryString = require('querystring');

// introduction for the skill, asks the user if they are cleaning or to make a damage/maintenance report
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello! Welcome to My Housekeeper. Are you cleaning a room, or would you like to make a damage or maintenance report?';
        const repromptText = 'Sorry, I did not catch that. Are you cleaning a room, or would you like to make a damage or maintenance request? You can also say help for more information';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptText)
            .getResponse();
    }
};

// after user says they are cleaning, if the user has just started cleaning the house, it will ask them to list the number of rooms they are cleaning first
const GetNumRoomsHandler = {
    canHandle(handlerInput) {
        // check to see if number of rooms has already been given; if yes, skip this handler
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        const numRooms = sessionAttributes.hasOwnProperty('numRooms') ? sessionAttributes.numRooms : 0;

        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CleanRoomIntent'
            && (numRooms === 0);
    },
    handle(handlerInput) {
        const speakOutput = 'How many rooms are you cleaning today?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

// after user says they are cleaning, if the user is currently/has been cleaning a room, ask if they have finished cleaning that room
const CleaningRoomHandler = {
    canHandle(handlerInput) {

        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        const room = sessionAttributes.hasOwnProperty('currRoom') ? sessionAttributes.currRoom : 0;

        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CleanRoomIntent'
            && room;

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

// after listing the number of rooms to clean, ask which room they are cleaning
const PostNumRoomsHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NumRoomsIntent';
    },
    async handle(handlerInput) {
        // save the number of rooms from user input into the database first as numRooms
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

// after user says they are cleaning, if none of the other intents apply, ask which room they are cleaning
const StartingRoomHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CleanRoomIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Which room are you starting to clean?';
        const repromptText = 'Once again, which room are you starting to clean?';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptText)
            .getResponse();
    }
};

// after user says which room they are cleaning, save room name as current room being cleaned and allow user to make a damage/maintenance request
const CaptureRoomIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ReportCleaningIntent';
    },
    async handle(handlerInput) {
        // the room name is saved to the database, checking to see if there are any cleaned rooms saved and acting accordingly
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

        const speakOutput = `Ok, starting to clean the ${room}. If there is a damage or maintenance request, please report it now.`;
        const repromptText = 'Once again, if there is a damage or maintenance request, please report it now.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptText)
            .getResponse();
    }
};

// if user makes a damage request, respond with the following and allow the user to make another report
const CaptureIssueIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CaptureIssueIntent';
    },
    handle(handlerInput) {
        const room = handlerInput.requestEnvelope.request.intent.slots.room.value;
        //const number = handlerInput.requestEnvelope.request.intent.slots.number.value;

        //const speakOutput = `Thanks, ${room} ${number} needs assistance, I'll forward the issue to the owner.`;
        const speakOutput = `Thanks, ${room} has damage, I'll forward the damage report to the owner. If there are any other issues, please report it now.`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Is there another issue you would like to report?')
            .getResponse();
    }
};


// const CaptureIssueIntentHandler = {
//   canHandle(handlerInput) {
//     return handlerInput.requestEnvelope.request.type === 'IntentRequest'
//       && handlerInput.requestEnvelope.request.intent.name === 'CaptureIssueIntentHandler';
//   },
//   async handle(handlerInput) {
//     const {responseBuilder } = handlerInput;
//     const id = handlerInput.requestEnvelope.context.System.user.id;
//     const slots = handlerInput.requestEnvelope.request.intent.slots;
//     const input = slots.input.value;
//     return dbHelper.addtoReport(input, id)
//       .then((data) => {
//         const speechText = `You have added movie ${input}. You can say add to add another one or remove to remove movie`;
//         return responseBuilder
//           .speak(speechText)
//           .reprompt("What would you like to do?")
//           .getResponse();
//       })
//       .catch((err) => {
//         console.log("Error occured while saving movie", err);
//         const speechText = "we cannot save your movie right now. Try again!"
//         return responseBuilder
//           .speak(speechText)
//           .getResponse();
//       })
//   },
// };


// if user makes a maintenance request, respond with the following and allow the user to make another report
const CaptureMaintenanceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CaptureMaintenanceIntent';
    },
    handle(handlerInput) {
        const room = handlerInput.requestEnvelope.request.intent.slots.room.value;
        //const number = handlerInput.requestEnvelope.request.intent.slots.number.value;

        //const speakOutput = `Thanks, ${room} ${number} needs assistance, I'll forward the issue to the owner.`;
        const speakOutput = `Thanks, ${room} needs maintenance assistance, I'll forward the request to the owner. If there is another maintenance request, please report it now.`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Is there another maintenance request you would like to report?')
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

// if user says they've finished cleaning their current room, save the room onto the database with the list of all other rooms cleaned
// end message depends on whether or not it is the last room being cleaned
const YesIntent = {
    canHandle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        // makes sure there is a current room being cleaned
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

        // if there are already save cleaned rooms, concat current cleaned room to list, otherwise create new list
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

        // if this is the last room, display goodbye message
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

// if user says they have not finished cleaning their current room, return a message and do nothing
const NoIntent = {
    canHandle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        // makes sure there is a current room being cleaned
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

// // Lambda Send SMS function:
// Sends an SMS message using the Twilio API assumes permissions have been granted
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

            if ("queued" === parsedResponse.status) {}
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

//     Lambda Send Email function:
// Send Email using  AWS SES API, assumes permissions have been granted
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

//   Send Report
// checks for and gets user permission to retrieve their information and then sends approprite notifications
const SendReport = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;

        return request.type === 'IntentRequest' && request.intent.name === 'sendReport';
    },
    async handle(handlerInput) {
        const { requestEnvelope, serviceClientFactory, responseBuilder } = handlerInput;

        const consentToken = requestEnvelope.context.System.user.permissions &&
            requestEnvelope.context.System.user.permissions.consentToken && requestEnvelope.context.System.apiAccessToken;
        if (!consentToken) {
            return responseBuilder
                .speak("Please enable Location permissions in the Amazon Alexa app.")
                .withAskForPermissionsConsentCard(PERMISSIONS)
                .getResponse();
        }
        try {
            const { deviceId } = requestEnvelope.context.System.device;
            const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
            const client = serviceClientFactory.getUpsServiceClient();

            // Retrieve address
            const address = await deviceAddressServiceClient.getFullAddress(deviceId);

            // Retrieve phone number
            const number = await client.getProfileMobileNumber();

            // Retrieve email
            const email = await client.getProfileEmail();

            let response;

            if (address.addressLine1 === null && address.stateOrRegion === null) {
                console.log("~~~~ Error 204: Address has no content");
                response = responseBuilder.speak('It looks like you don\'t have an address set. You can set your address from the companion app.').getResponse();
            } else if (number == null) {
                console.log("~~~~ Error 204: Number has no content");
                response = responseBuilder.speak('It looks like you don\'t have a number set. You can set your number from the companion app.').getResponse();
            } else if (email == null) {
                console.log("~~~~ Error 204: Email has no content");
                response = responseBuilder.speak('It looks like you don\'t have an email set. You can set your email from the companion app.').getResponse();
            } else {
                //save the profiles address
                const userAddress = `${address.addressLine1}, ${address.stateOrRegion}, ${address.postalCode}`;
                console.log('Adress successfully retrieved: ' + userAddress);

                //save the profiles number
                let toNumber = number.countryCode + number.phoneNumber;
                console.log('Phone number successfully retrieved: ' + toNumber);

                //log out the email
                console.log('Email successfully retrieved: ' + email);

                let message = "Dear Customer, Cleaning services has completed cleaning location: " + userAddress + " and is ready to be re-listed. Here is your cleaning report:";

                // send email
                try {
                    // sendEmail(message, emailTo, emailFrom, subject, replyEmail);
                    sendEmail(message, email, 'myhousekeeperskill@gmail.com', 'My Housekeeper - Home at ' + userAddress + 'is ready.', 'myhousekeeperskill@gmail.com');
                } catch (e) {
                    console.log('Error encountered while sending an email');
                    console.log(e);
                }

                // Send SMS
                try {
                    sendSMS(toNumber, "Cleaning services have finished cleaning the rental at " + userAddress + " and a report has been emailed.");
                } catch (e) {
                    console.log('Error encountered while sending an SMS');
                    console.log(e);
                }

                response = responseBuilder.speak("Success! Notifications have been sent.").getResponse();
            }
            return response;
        }
        catch (error) {
            if (error.name !== 'ServiceError') {
                const response = responseBuilder.speak('Uh Oh. Looks like something went wrong.').getResponse();
                return response;
            }
            throw error;
        }
    },
};

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

// loads all information from the database for use in skill
// if the number of rooms cleaned match the number of rooms said to be cleaned, the database will be wiped instead, assuming it is a new cleaning session
const LoadRoomInterceptor = {
    async process(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = await attributesManager.getPersistentAttributes() || {};

        const numRooms = sessionAttributes.hasOwnProperty('numRooms') ? sessionAttributes.numRooms : 0;
        const room = sessionAttributes.hasOwnProperty('currRoom') ? sessionAttributes.currRoom : 0;
        const rooms = sessionAttributes.hasOwnProperty('rooms') ? sessionAttributes.rooms : 0;

        // if there are saved cleaned rooms, load the data
        if (rooms !== 0) {
            // delete all data for new cleaning session if number of rooms cleaned matches numRooms listed, otherwise load data
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

// Error handler for User Permissions
const ProfileError = {
    canHandle(handlerInput, error) {
        return error.name === 'ServiceError';
    },
    handle(handlerInput, error) {
        // if user has not granted permissions
        //    "Unauthorized: The authentication token does not have access to the resource."
        if (error.statusCode === 403) {
            return handlerInput.responseBuilder
                .speak("Please enable Customer Profile permissions in the Amazon Alexa app. My Housekeeper will only use the Device Address, Email Address, and Mobile Number to send an SMS notification and an Email report when requested by the user.")
                .withAskForPermissionsConsentCard(PERMISSIONS)
                .getResponse();
        }
         // if user has granted permissions but the information is not available, like they havent provided it in their account.
            //  No Content: The query did not return any results.
        else if (error.statusCode === 204) {
            return handlerInput.responseBuilder
                .speak("Please make sure your account contains your appropriate information in Device Address, Email Address, and Mobile Number. You can enter these details in your Amazon account, and then invoke the skill again.")
                .withAskForPermissionsConsentCard(PERMISSIONS)
                .getResponse();
        }
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    },
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder

    .withPersistenceAdapter(ddbPersistenceAdapter)
    // handlers will be called in this order
    .addRequestHandlers(
        LaunchRequestHandler,
        GetNumRoomsHandler,
        CleaningRoomHandler,
        PostNumRoomsHandler,
        StartingRoomHandler,
        CaptureRoomIntentHandler,
        CaptureIssueIntentHandler,
        CaptureMaintenanceIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        YesIntent,
        NoIntent,
        SendReport,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(ProfileError)
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();
