
var express = require('express');
var app = express();
var path = require('path');
var fs = require('fs');
var open = require('open');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const apn = require('apn');
const admin = require("firebase-admin");
 
//  const { getMessaging } = require('firebase-admin/messaging');
var serviceAccount = require('./wepoc-446d9-firebase-adminsdk-flhzi-2aa00339a8.json');
var bodyParser = require('body-parser')
// create application/json parser
var jsonParser = bodyParser.json()

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  name: 'wepoc'
  // databaseURL: 'https://chat-app-d8550.firebaseio.com',
});
const config = {
  production: false, /* change this when in production */
  // cert: topic ? (topic+'.pem') : 'voipCert.pem',
  // key: topic ? (topic+'.pem') : 'voipCert.pem',

  cert: 'ck.pem',
  key: 'ck.pem',
  passphrase: 'wepoc'
};

const apnProvider = new apn.Provider(config);
// var PushNotification = require("./PushNotification")
var httpsOptions = {
  key: fs.readFileSync('./fake-keys/privatekey.pem'),
  cert: fs.readFileSync('./fake-keys/certificate.pem')
};
let isLocal = process.env.PORT == null;
var serverPort = (process.env.PORT || 4443);
var server = null;
if (isLocal) {
  server = require('https').createServer(httpsOptions, app);
} else {
  server = require('http').createServer(app);
}
var io = require('socket.io')(server);

let socketIdToNames = {};
//------------------------------------------------------------------------------
//  Serving static files
app.get('/', function (req, res) {
  console.log('get /');
  res.sendFile(__dirname + '/index.html');
});

app.get('/draw', function (req, res) {
  console.log('get /');
  res.sendFile(__dirname + '/draw.html');
});

// app.use('/style', express.static(path.join(__dirname, 'style')));
// app.use('/script', express.static(path.join(__dirname, 'script')));
// app.use('/image', express.static(path.join(__dirname, 'image')));

server.listen(serverPort, function () {
  console.log('Rewebrtc-server is up and running at %s port', serverPort);
  if (isLocal) {
    // open('https://localhost:' + serverPort)
  }
});


app.post("/PushNotification", jsonParser, (request, response) => {
  console.log({ request: request.body })
  //code to perform particular action.
  //To access POST variable use req.body()methods.

  const firestore = admin.firestore();
  let participants = request.body.data.participants;
  // var options = {
  //   playSound: true, // (optional) default: true
  //   soundName: 'default', // (optional) Sound to play when the notification is shown. Value of 'default' plays the default sound. It can be set to a custom sound such as 'android.resource://com.xyz/raw/my_sound'. It will look for the 'my_sound' audio file in 'res/raw' directory and play it. default: 'default' (default sound is played)
  //   vibrate: true, // (optional) default: true
  //   vibration: 300, // vibration length in milliseconds, ignored if vibrate=false, default: 1000
  //   importance: 'high', // (optional) set notification importance, default: high
  //   allowWhileIdle: false, // (optional) set notification to work while on doze, default: false
  //   ignoreInForeground: false, // (optional) if true, the notification will not be visible when the app is in the foreground (useful for parity with how iOS notifications appear)
  //   priority: 'high',
  //   timeToLive: 60 * 10,
  //   content_available: true
  // };
  // const payload = {
  //   notification: {
  //     title: request.body.title,
  //     body: request.body.desc,
  //     icon: ' ic_notification',
  //     sound: 'default',
  //     content_available: "1"
  //   },

  //   data: {
  //     participants: JSON.stringify(participants),
  //     allParticipants: JSON.stringify(request.body.data.allParticipants),
  //     sender: request.body.data.sender,
  //     callRoomID: request.body.data.callRoomID,
  //     roomTitle: request.body.data.roomTitle,
  //     callType: request.body.data.callType,
  //     roomTitle: request.body.data.roomTitle,
  //     groupID: request.body.data.groupID,
  //     roomImage: request.body.data.roomImage,
  //     roomType: request.body.data.roomType

  //   },
  // };
  const newData = {
    title: request.body.title,
    body: request.body.desc,
    participants: JSON.stringify(participants),
    allParticipants: JSON.stringify(request.body.data.allParticipants),
    sender: request.body.data.sender,
    callRoomID: request.body.data.callRoomID,
    roomTitle: request.body.data.roomTitle,
    callType: request.body.data.callType,
    roomTitle: request.body.data.roomTitle,
    groupID: request.body.data.groupID,
    roomImage: request.body.data.roomImage,
    roomType: request.body.data.roomType

  }
  var newPayload = {
    notification: {
      title: request.body.title,
      body: request.body.desc,
    },
    data: {
      title: request.body.title,
      body: request.body.desc,
      participants: JSON.stringify(participants),
      allParticipants: JSON.stringify(request.body.data.allParticipants),
      sender: request.body.data.sender,
      callRoomID: request.body.data.callRoomID,
      roomTitle: request.body.data.roomTitle,
      callType: request.body.data.callType,
      roomTitle: request.body.data.roomTitle,
      groupID: request.body.data.groupID,
      roomImage: request.body.data.roomImage,
      roomType: request.body.data.roomType
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
  };

  console.log({newData })
  Promise.all(participants)
    .then(async () => {
      for (const eachUserUid of participants) {
        const user = await firestore.collection("Users").doc(eachUserUid.uid).get()
        console.log({ user: JSON.stringify(user) })
        if (user.data().tokens) {
          newPayload.tokens = user.data().tokens; //Needed for sendMulticast
          
          admin.messaging().sendMulticast(newPayload)
            .then((response) => {
              console.log(response.successCount + ' messages were sent successfully');
            });

          // user.data().tokens.forEach((token) => {
            // admin
            //   .messaging()
            //   .sendToDevice(token, payload, options)
            //   .then(function (res) {
            //     console.log('Succesfully sent message Group', request.body.title + "to " + user.data().userName, { token });

            //   })
            //   .catch(function (error) {
            //     // response.json(error)
            //     console.log(error, 'Error sending message');
            //   });


          // })
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
});

//------------------------------------------------------------------------------
//  WebRTC Signaling
function socketIdsInRoom(socketRoomID, socketId) {
  // var socketIds = io.nsps['/'].adapter.rooms[roomId];
  const clients = io.sockets.adapter.rooms.get(socketRoomID);
  let arr = Array.from(clients)
  arr = arr.filter((id) => id != socketId)
  console.log({ arr })
  return arr
  if (arr) {
    var collection = [];
    for (var key in socketIds) {
      collection.push(key);
    }
    return collection;
  } else {
    return [];
  }
}

io.on('connection', function (socket) {
  console.log('Connection', { socket: socket.id });
  socket.on('disconnect', function () {
    console.log('Disconnect');
    delete socketIdToNames[socket.id];
    if (socket.room) {
      var room = socket.room;
      io.to(room).emit('leave', socket.id);
      socket.leave(room);
    }
  });

  /**
   * Callback: list of {socketId, name: name of user}
   */
  socket.on('join', function (joinData, callback) { //Join room
    console.log('join');
    let socketRoomID = joinData.socketRoomID;
    const uid = joinData.uid
    let name = joinData.name;
    socket.join(socketRoomID);
    socket.room = socketRoomID;
    socketIdToNames[socket.id] = uid;


    var socketIds = socketIdsInRoom(socketRoomID, socket.id);
    let friends = socketIds.map((socketId) => {
      return {
        socketId: socketId,
        uid: socketIdToNames[socketId]
      }
    }).filter((friend) => friend.socketId != socket.id);
    callback(friends);
    //broadcast
    friends.forEach((friend) => {
      socket.to(friend.socketId).emit("join", {
        socketId: socket.id,
      });
    });
    console.log('Join: ', joinData);
  });

  socket.on('exchange', function (data) {
    console.log('exchange', data);
    data.from = socket.id;
    // var to = io.sockets.connected[data.to];
    // to.emit('exchange', data);
    socket.to(data.to).emit("exchange", data);
  });

  socket.on("count", function (socketRoomID, callback) {
    var socketIds = socketIdsInRoom(socketRoomID);
    callback(socketIds.length);
  });

});
