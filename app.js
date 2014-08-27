var Omegle = require('./omegle.js').Omegle;
var express = require('express');
var app = express();

app.use(express.static(__dirname + '/static'));

var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res) {
    res.sendFile(__dirname+'/static/index.htm');
});

// Handle connections
io.on('connection', function(socket) {
    // List of omegle clients for this person
    var omegleClients = {};

    // Cleanup a client when they disconnect
    socket.on('disconnect', function(){
        for(var key in omegleClients) {
            // Disconnect the client
            if(omegleClients[key] != null) {
                omegleClients[key].disconnect();
            }

            // Remove reference to it
            omegleClients[key] = null;
        }
    });

    // Client wants us to disconnect a stranger
    socket.on('omegleDisconnect', function(client_id) {
        // Check if the client even exists
        if(omegleClients[client_id] != null) {
            // Disconnect it
            omegleClients[client_id].disconnect();

            // Delete it
            omegleClients[client_id] = null;
        }
    });

    // Client wants to send a message to a stranger
    socket.on('omegleSend', function(client_id, msg) {
        // Check if the client even exists
        if(omegleClients[client_id]) {
            // Send the message
            omegleClients[client_id].send(msg, function(err) {
                if (err) {
                    console.log("Error send " + err);
                }
            });
        }
    });

    // Client is asking for a new omegle client
    socket.on('newOmegle', function(){
        // Create the new omegle instance
        var om = new Omegle({
            topics: [
                'rp',
                'role play'
            ]
        });

        // A store for the clientID
        var realClientID;

        om.on('newid', function(client_id) {
            // Store the client
            omegleClients[client_id] = om;

            // Send this ID to the user
            socket.emit('newOmegle', client_id);

            // Store client ID
            realClientID = client_id;
        });

        // Omegle is finding a partner
        om.on('waiting', function() {
            // Tell the client
            socket.emit('omegleWaiting', realClientID);
        });

        // Omegle found us a partner
        om.on('connected', function() {
            // Tell the client
            socket.emit('omegleConnected', realClientID);
        });

        // Omegle is telling us our common likes
        om.on('commonLikes', function(commonLikes) {
            // Tell the client
            socket.emit('omegleCommonLikes', realClientID, commonLikes);
        })

        // Recapture
        om.on('recaptchaRequired', function(code) {
            console.log("Looks like we have to solve this sadly: " + code);
        });

        // Stranger has disconnected
        om.on('strangerDisconnected', function() {
            // Tell client
            socket.emit('omegleStrangerDisconnected', realClientID);
        });

        // Stranger sent us a message
        om.on('gotMessage', function(msg) {
            // Tell client
            socket.emit('omegleGotMessage', realClientID, msg);
        });

        // We have disconnected
        om.on('disconnected', function() {
            // Tell client
            socket.emit('omegleDisconnected', realClientID);
        });

        // Connect to a client
        om.start(function(err) {
            if (err) {
                console.log("Error start " + err);
            }
        });
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});



return;

var Cleverbot = require('cleverbot-node');

// Create a new cleverbot
var cb = new Cleverbot();

// Create a new omegle instance
var om = new Omegle({
    topics: [
        'doctor who',
        'harry potter'
    ]
});

om.on('newid', function(data) {
    console.log(data);
});

om.on('waiting', function() {
    console.log('Looking for someone you can chat with...');
});

om.on('connected', function() {
    console.log('Connected to a stranger!');

    // Log the message
    console.log('You: Hi!');

    // Forward them a hello
    om.send('Hi!', function(err) {
        if (err) {
            console.log("Error send " + err);
        }
    });
});

om.on('commonLikes', function(commonLikes) {
    console.log('You both like: '+commonLikes.toString());
})

om.on('recaptchaRequired', function(code) {
  console.log("Looks like we have to solve this sadly: " + code);
});

om.on('strangerDisconnected', function() {
    console.log('stranger has left');
});

om.on('gotMessage', function(msg) {
    console.log("Stranger: " + msg);

    // Start typing
    om.startTyping();

    // Forward the message to clever bot
    cb.write(msg, function(resp) {
        // Log the message
        console.log('You: '+resp['message']);

        // Send the reply
        om.send(resp['message'], function(err) {
            if (err) {
                console.log("Error send " + err);
            }
        });
    });
});

om.on('disconnected', function() {
    console.log('You disconnected!');
});

om.start(function(err) {
    if (err) {
        return console.log("Error start " + err);
    }
});

/*var Omegle, om, startconv;
Omegle = require('../lib/omegle').Omegle;
om = new Omegle();
om.on('newid', function(data) {
  console.log('lolhi ' + data);
  return setTimeout(startconv, 1500);
});
om.on('connected', function() {
  return console.log('yay');
});
om.on('recaptchaRequired', function(code) {
  return console.log("Looks like we have to solve this sadly: " + code);
});
om.start(function(err) {
  if (err) {
    return console.log("Error start " + err);
  }
});
startconv = function() {
  return om.send('hi', function(err) {
    if (err) {
      console.log("Error send " + err);
    }
    return om.disconnect(function(err) {
      if (err) {
        return console.log("Error disconnect " + err);
      }
    });
  });
};*/