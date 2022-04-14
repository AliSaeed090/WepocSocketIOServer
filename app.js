/**
 * rewebrtc-server project
 *
 * Tho Q Luong <thoqbk@gmail.com>
 * Feb 12, 2017
 */

var express = require('express');
var app = express();
var path = require('path');
var fs = require('fs');
var open = require('open');
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
    open('https://localhost:' + serverPort)
  }
});

//------------------------------------------------------------------------------
//  WebRTC Signaling
function socketIdsInRoom(socketRoomID, socketId) {
  // var socketIds = io.nsps['/'].adapter.rooms[roomId];
  const clients = io.sockets.adapter.rooms.get(socketRoomID);
  let arr = Array.from(clients)
  arr = arr.filter((id) => id != socketId)
  console.log({ arr })
  return  arr
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
    const uid =  joinData.uid
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
