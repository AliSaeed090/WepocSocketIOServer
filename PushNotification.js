

const { v4: uuidv4 } = require('uuid');
const apn = require('npm i apn');
const config = {
    production: true, /* change this when in production */
    // cert: topic ? (topic+'.pem') : 'voipCert.pem',
    // key: topic ? (topic+'.pem') : 'voipCert.pem',

    cert: 'ck.pem',
    key: 'ck.pem',
    passphrase: 'wepoc'
};

const apnProvider = new apn.Provider(config);




export default async function PushNotifications(request, response)  {
    const admin = require("firebase-admin");
    const firestore = admin.firestore();
    let participants = request.body.data.participants;
    var options = {
        playSound: true, // (optional) default: true
        soundName: 'default', // (optional) Sound to play when the notification is shown. Value of 'default' plays the default sound. It can be set to a custom sound such as 'android.resource://com.xyz/raw/my_sound'. It will look for the 'my_sound' audio file in 'res/raw' directory and play it. default: 'default' (default sound is played)
        vibrate: true, // (optional) default: true
        vibration: 300, // vibration length in milliseconds, ignored if vibrate=false, default: 1000
        importance: 'high', // (optional) set notification importance, default: high
        allowWhileIdle: false, // (optional) set notification to work while on doze, default: false
        ignoreInForeground: false, // (optional) if true, the notification will not be visible when the app is in the foreground (useful for parity with how iOS notifications appear)
        priority: 'high',
        timeToLive: 60 * 10,
        content_available: true
    };
    const payload = {
        notification: {
            title: request.body.title,
            body: request.body.desc,
            icon: ' ic_notification',
            sound: 'default',
            content_available: "1"
        },

        data: {
            participants: JSON.stringify(participants),
            sender: request.body.data.sender,
            callRoomID: request.body.data.callRoomID,
            roomTitle: request.body.data.roomTitle,
            callType: request.body.data.callType,
            roomTitle: request.body.data.roomTitle,
            groupID: request.body.data.groupID,
            roomImage: request.body.data.roomImage,
            roomType: request.body.data.roomType

        },
    };

    Promise.all(participants)
        .then(async () => {
            for (const eachUserUid of participants) {
                const user = await firestore.collection("Users").doc(eachUserUid.uid).get()
                console.log({ user: JSON.stringify(user) })
                if (user.data().tokens) {

                    user.data().tokens.forEach((token) => {
                        admin
                            .messaging()
                            .sendToDevice(token, payload, options)
                            .then(function (res) {
                                console.log('Succesfully sent message Group', request.body.title + "to " + user.data().userName, { token });
                                return token
                            })
                            .catch(function (error) {
                                // response.json(error)
                                console.log(error, 'Error sending message');
                            });
                    })
                }

                if (user.data().pushKitIosToken) {
                    if (request.body.title === "Incomming Call") {
                        user.data().pushKitIosToken.forEach(async (token) => {

                            if (token.length > 0) {
                                // sendpushKitIosCallNotification(token, request.body.data)
                                let data = request.body.data
                                const payload = {
                                    callerName: "Wepoc",
                                    // handle: recipient.email || recipient.phone || recipient.phoneNumber,
                                    handle: "wepoc",
                                    callRoomID: data.callRoomID,
                                    uuid: uuidv4(),
                                    chatType: data.callType,
                                    roomTitle: data.roomTitle,
                                    roomImage: data.roomImage,

                                };



                                const notification = new apn.Notification({
                                    aps: {
                                        "content-available": 1,
                                        "content-available": true
                                    }
                                });

                                const recepients = [];
                                recepients.push(apn.token(token));

                                // notification.topic = topic ? topic + '.voip' : 'io.instamobile.chat.swift.voip'; // you have to add the .voip suffix here!!
                                notification.topic = "com.chat.wepoc.voip"
                                notification.payload = payload;



                                apnProvider.send(notification, recepients).then((reponse) => {
                                    // console.log("Send push notifications to " + token + " topic: ", "payload", payload);
                                    console.log({ pushKitIosCallNotification: JSON.stringify(notification) });



                                });


                            }

                        })
                    }
                }
            }


        })
        .then(() => {
            response.json({ sent: 'succ' })
        });

}
