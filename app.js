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
                    console.log('Error send '+err);
                }
            });
        }
    });

    // Client started typing
    socket.on('omegleTyping', function(client_id) {
        // Check if the client even exists
        if(omegleClients[client_id]) {
            // Send the message
            omegleClients[client_id].startTyping(function(err) {
                if(err) {
                    console.log('Error typing '+err)
                }
            });
        }
    });

    // Client stopped typing
    socket.on('omegleStopTyping', function(client_id) {
        // Check if the client even exists
        if(omegleClients[client_id]) {
            // Send the message
            omegleClients[client_id].stopTyping(function(err) {
                if(err) {
                    console.log('Error stopping typing '+err)
                }
            });
        }
    });

    // Client is asking for a new omegle client
    socket.on('newOmegle', function(){
        // Create the new omegle instance
        var om = new Omegle({
            topics: [
                'doctor who',
                'harry potter',
                'south park',
                'family guy',
                'american dad',
                'the simpsons',
                'rick and morty'
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

        // Stranger started typing
        om.on('typing', function() {
            // Tell client
            socket.emit('omegleTyping', realClientID);
        });

        // Stranger stopped typing
        om.on('stoppedTyping', function() {
            // Tell client
            socket.emit('omegleStoppedTyping', realClientID);
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
