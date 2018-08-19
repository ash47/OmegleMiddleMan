var Omegle = require('./omegle.js').Omegle;
var onOmegleReady = require('./omegle.js').onReady;
var express = require('express');
var app = express();

app.use(express.static(__dirname + '/static'));

var request = require('request');
var http = require('http');
var https = require('https');
var httpServer = http.Server(app);
var io = require('socket.io')(httpServer);

var settings = require('./settings.json');

//var Cleverbot = require('./cleverbot.js');
//var Sham = require('./shamchat.js').Sham;

app.get('/', function(req, res) {
    res.sendFile(__dirname+'/static/index.htm');
});

// Handle connections
io.on('connection', function(socket) {
    // List of omegle clients for this person
    var omegleClients = {};

    // List of clever bot clients
    //var cleverClients = {};

    // Stores challenge omegle clients
    var challenges = {};

    // Stores proxy info
    var proxyInfo = null;
    var proxyEnabled = false;

    var requiredConnections = [];
    var buildingConnection = false;
    var currentPain = null;
    function buildConnections() {
        // Any connections required?
        if(!buildingConnection && requiredConnections.length > 0) {
            // Stop multiple from happening
            buildingConnection = true;
            var args = requiredConnections.shift();

            // Store the current pain
            currentPain = args.painID;

            // Make a connection
            makeConnection(args, false);
        }
    }

    // Makes the actual connection
    function makeConnection(args, reconnect) {
        // Create the new omegle instance
        var om = new Omegle(args);

        // Store the args
        om.args = args;

        // A store for the clientID
        var realClientID;

        // Handle errors
        om.errorHandler(function(msg) {
            socket.emit('omegleError', args, msg);
        });

        om.on('newid', function(client_id) {
            // Store the client
            omegleClients[client_id] = om;

            // Send this ID to the user
            socket.emit('newOmegle', client_id, args);

            // Store client ID
            realClientID = client_id;
        });

        // Omegle has banned us
        om.on('antinudeBanned', function() {
            if(!reconnect) {
                // No longer building a connection
                buildingConnection = false;

                // Move on
                buildConnections();
            }

            // Send this ID to the user
            socket.emit('omegleBanned', args);
        });

        // There was an error
        om.on('error', function(err) {
            // Send this ID to the user
            socket.emit('omegleError', args, err);
        });

        // Omegle is finding a partner
        om.on('waiting', function() {
            // Tell the client
            socket.emit('omegleWaiting', realClientID);
        });

        // Omegle found us a partner
        om.on('connected', function(peerID) {
            // Tell the client
            socket.emit('omegleConnected', realClientID, peerID);

            // Make sure we're not reconnecting
            if(!reconnect) {
                // Give a brief delay before making a new connection
                setTimeout(function() {
                    // No current pain
                    currentPain = null;

                    // No longer building the connection
                    buildingConnection = false;

                    // Try to build any remaining connections
                    buildConnections();
                }, 100);
            }

        });

        // Omegle is telling us our common likes
        om.on('commonLikes', function(commonLikes) {
            // Tell the client
            socket.emit('omegleCommonLikes', realClientID, commonLikes);
        });

        // Omegle is sending us status info
        om.on('statusInfo', function(statusInfo) {
            // Tell the client
            socket.emit('omegleStatusInfo', statusInfo);
        });

        // Omegle is telling us our partner's college
        om.on('partnerCollege', function(college) {
            // Tell the client
            socket.emit('omeglePartnerCollege', realClientID, college);
        });

        // Omegle sent us a question
        om.on('question', function(question) {
            // Tell the client
            socket.emit('omegleQuestion', realClientID, question);
        });

        // Handle the capcha
        function handleCaptcha(code) {
            // Are we trying to avoid this BS?
            if(proxyEnabled && proxyInfo) {
                // Tell them
                socket.emit('proxyMessage', 'Server sent a capcha, seaching for a new proxy...', args);

                // Try to find a new proxy to use
                tryFindNewProxy(function() {
                    // Con failed due to proxy issues
                    socket.emit('conFailedProxy', args);
                });
                return;
            }

            // Use the new captcha method
            socket.emit('omegleNewChallenge', args, code);

            challenges[code] = om;

            // Don't run the old method
            return;

            // URL with challenge data
            var toFetch = 'https://www.google.com/recaptcha/api/challenge?k='+code+'&cahcestop='+Math.random();

            https.get(toFetch, function(res) {
                // Ensure the request worked
                if (res.statusCode !== 200) {
                    socket.emit('omegleError', args, 'Captcha failed.');
                    return;
                }

                // Process the event
                om.getAllData(res, function(data) {
                    // Make sure we got some data
                    if(data != null) {
                        // Copy important data
                        var a = data.indexOf('\'')+1;
                        var b = data.indexOf('\'', a)-1;

                        // Grab the challenge
                        var challenge = data.substring(a, b+1);

                        // Store it
                        challenges[challenge] = om;

                        // Send to client to solve
                        socket.emit('omegleChallenge', args, code, challenge);
                    } else {
                        // Failure
                        socket.emit('omegleError', args, 'Capcha, no data passed!');
                    }
                });
            }).on('error', function(e) {
                // Send to client
                socket.emit('omegleError', args, 'Got capcha error: ' + e.message);
            });
        }

        // Recaptcha
        om.on('recaptchaRejected', handleCaptcha);
        om.on('recaptchaRequired', handleCaptcha);

        // Stranger has disconnected
        om.on('strangerDisconnected', function() {
            // Tell client
            socket.emit('omegleStrangerDisconnected', realClientID);
        });

        // A spy disconnected
        om.on('spyDisconnected', function(spy) {
            // Tell client
            socket.emit('omegleSpyDisconnected', realClientID, spy);
        });

        // Stranger sent us a message
        om.on('gotMessage', function(msg) {
            // Tell client
            socket.emit('omegleGotMessage', realClientID, msg);
        });

        // Got a spy message
        om.on('spyMessage', function(spy, msg) {
            // Tell client
            socket.emit('omegleSpyMessage', realClientID, spy, msg);
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

        // Debug events
        if(settings.debug) {
	        om.on('debugEvent', function(reason) {
	            // Tell client
	            socket.emit('debugEvent', realClientID, reason);
	        });
	    }

        // Are we doing a reconnect?
        if(reconnect) {
            // Reconnect to a client
            om.reconnect(function(err) {
                if (err) {
                    // Send to client
                    socket.emit('omegleError', args, 'Error reconnecting: ' + err);
                }
            });
        } else {
            // Connect to a client
            om.start(function(err) {
                if (err) {
                    if(proxyEnabled && proxyInfo) {
                        // Tell them
                        socket.emit('proxyMessage', 'Broken proxy, seaching for a new proxy...', args);

                        // Try to find a new proxy to use
                        tryFindNewProxy(function() {
                            // Con failed due to proxy issues
                            socket.emit('conFailedProxy', args);
                        });
                    } else {
                        // Send to client
                        socket.emit('omegleError', args, 'Error starting: ' + err);
                    }
                }
            }, proxyEnabled && proxyInfo);
        }
    }

    // Creates a new connection
    function setupNewConnection(args) {
        // Ensure we have args
        if(args == null) args = {};

        // Another connection is required
        requiredConnections.push(args);

        // Set the connection up
        buildConnections();
    }

    // Client wants to fix broken search
    socket.on('omegleUnlock', function() {
        // No longer building the connection
        buildingConnection = false;

        // Try to build any remaining connections
        buildConnections();
    });

    // Cleanup a client when they disconnect
    socket.on('disconnect', function(){
        for(var key in omegleClients) {
            // Remove reference to it
            delete omegleClients[key];
        }

        /*for(var key in cleverClients) {
            if(cleverClients[key] != null) {
                delete cleverClients[key];
            }
        }*/
    });

    // Client wants us to disconnect a stranger
    socket.on('omegleDisconnect', function(client_id, painID) {
        // Check if the client even exists
        if(omegleClients[client_id] != null) {
            // Disconnect it
            omegleClients[client_id].disconnect();

            // Delete it
            omegleClients[client_id] = null;
        }

        // Remove any queued requests for this painID
        for(var i=0;i<requiredConnections.length;i++) {
            // Strip the solutions
            if(requiredConnections[i].painID == painID) {
                requiredConnections.splice(i--, 1);
            }
        }

        // Are we dealing with a pain at the moment?
        if(currentPain == painID) {
            // No current pain anymore
            currentPain = null;

            // No longer building the connection
            buildingConnection = false;

            // Try to build any remaining connections
            buildConnections();
        }
    });

    // Client wants us to blackhole a stranger
    socket.on('omegleBlackhole', function(client_id, painID) {
        // Remove any queued requests for this painID
        for(var i=0;i<requiredConnections.length;i++) {
            // Strip the solutions
            if(requiredConnections[i].painID == painID) {
                requiredConnections.splice(i--, 1);
            }
        }

        // Are we dealing with a pain at the moment?
        if(currentPain == painID) {
            // No current pain anymore
            currentPain = null;

            // No longer building the connection
            buildingConnection = false;

            // Try to build any remaining connections
            buildConnections();
        }
    });

    // Client wants to send a message to a stranger
    socket.on('omegleSend', function(client_id, msg, callbackNum) {
        var om = omegleClients[client_id];

        // Check if the client even exists
        if(om) {
            // Send the message
            om.send(msg, function(err) {
                if (err) {
                    // Send to client
                    socket.emit('omegleError', om.args, 'Error sending: ' + err);

                    // Send callback
                    if(callbackNum) {
                        // Failure callback
                        socket.emit('omegleCallback', client_id, callbackNum, false);
                    }
                } else {
                    // Send callback
                    if(callbackNum) {
                        // Success callback
                        socket.emit('omegleCallback', client_id, callbackNum, true);
                    }
                }
            });
        }
    });

    // Client is trying to answer a captcha
    socket.on('omegleChallenge', function(code, answer) {
        var om = challenges[code];

        if(om != null) {
            om.recaptcha(answer);
        }
    });

    // Client started typing
    socket.on('omegleTyping', function(client_id) {
        var om = omegleClients[client_id];

        // Check if the client even exists
        if(om) {
            // Send the message
            om.startTyping(function(err) {
                if(err) {
                    // Send to client
                    socket.emit('omegleError', om.args, 'Error typing: ' + err);
                }
            });
        }
    });

    // Client stopped typing
    socket.on('omegleStopTyping', function(client_id) {
        var om = omegleClients[client_id];

        // Check if the client even exists
        if(om) {
            // Send the message
            om.stopTyping(function(err) {
                if(err) {
                    // Send to client
                    socket.emit('omegleError', om.args, 'Error stopping typing: ' + err);
                }
            });
        }
    });

    // Client is asking for a new omegle client
    socket.on('newOmegle', function(args){
        // Check if we should force it or not
        if(args.forceSearch) {
            // Check if we are already building
            if(buildingConnection) {
                // Force build
                makeConnection(args, false);
            } else {
                // Setup a new connection
                setupNewConnection(args);
            }
        } else {
            // Setup a new connection
            setupNewConnection(args);
        }
    });

    // Omegle logging feature
    socket.on('omegleLog', function(cacheNumber, toCache) {
        // Make the request
        var postData = 'log=' + toCache + '&host=1';

        // Debug mode
        if(settings.debug) {
            console.log('Requesting: http://logs.omegle.com/generate');
            console.log(postData);
        }

        var postOptions = {
            host: 'logs.omegle.com',
            port: '80',
            path: '/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
            },
            agent:false
        };

        var allData = '';
        var postRequest = http.request(postOptions, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                allData += chunk;
            });
            res.on('end', function() {
                var leftIndexMarker = 'http://logs.Omegle.com/';
                var leftIndex = allData.indexOf(leftIndexMarker);
                var ret = '';
                if(leftIndex != -1) {
                    var rightIndex = allData.indexOf('"', leftIndex + leftIndexMarker.length);
                    if(rightIndex != -1) {
                        ret = allData.substring(leftIndex, rightIndex);
                    }
                }

                socket.emit('omegleLog', cacheNumber, ret);
            });
        });

        // post the data
        postRequest.write(postData);
        postRequest.end();
    });

    // Reconnects a client
    socket.on('reconnectOmegle', function(args) {
        // Attempt to reconnect
        makeConnection(args, true);
    });

    // Client is asking for a new clever client
    /*socket.on('newClever', function(args){
        // Find the first free clientID
        var i = 0;
        while(cleverClients['clever'+(++i)] != null) {};

        // Create the bot
        cleverClients['clever'+i] = new Cleverbot();

        // Forward the handler to them
        socket.emit('newClever', 'clever'+i, args);
    });

    // Send a message to clever bot
    socket.on('cleverSend', function(client_id, msg){
        // Check if the client even exists
        if(cleverClients[client_id]) {
            // Send the message
            cleverClients[client_id].write(msg, function(resp) {
                // Forward message to our client
                socket.emit('cleverGotMessage', client_id, resp['message']);
            });
        }
    });*/

    // Attempt to find a new proxy
    function tryFindNewProxy(callback) {
        if(!proxyEnabled) return;

        request('http://gimmeproxy.com/api/getProxy?get=true&protocol=http', function(err, res, body) {
            if(err) {
                tryFindNewProxy(callback);
                return;
            }

            try {
                var data = JSON.parse(body);
                var ip = data.ip;
                var port = data.port;

                if(ip && port) {
                    request('http://' + ip + ':' + port + '/', {timeout: 500}, function(err, res) {
                        if(err || res.statusCode >= 500) {
                            tryFindNewProxy(callback);
                        } else {
                            // Seems to be working
                            proxyInfo = {
                                ip: ip,
                                port: port
                            };

                            // Tell them their proxy is ready
                            socket.emit('proxyMessage', 'Routing intial connection through ' + ip + ':' + port + ' to avoid captcha!');

                            if(callback) {
                                callback(ip, port);
                            }
                        }
                    });
                } else {
                    // Try again
                    tryFindNewProxy(callback)
                }
            } catch(e) {
                // Try again?
                tryFindNewProxy(callback)
            }
        });
    }

    // Find a new proxy
    socket.on('newProxy', function() {
        proxyEnabled = true;

        // Tell them searching has begun
        socket.emit('proxyMessage', 'Searching for a proxy to route initial connection through...');

        // Try to find a new proxy
        tryFindNewProxy();
    });

    // Disables proxy
    socket.on('disableProxy', function() {
        // Disable proxy
        proxyEnabled = false;

        // Tell them
        socket.emit('proxyMessage', 'Captcha bypass turned off. No proxy will be used.');
    })
});

var omeglePortNumber = 3000;
httpServer.listen(omeglePortNumber, function() {
    console.log('Listening on port ' + omeglePortNumber + ', searching for omegle servers...');
});

// Run callback for when omegle is ready
Omegle.onReady(function(serverList) {
    // Print out the server list
    console.log('Found the following servers: ' + serverList.join(', ') + '\n\n' + Omegle.getSelectedServer() + ' was selected!\n');
    console.log('Visit 127.0.0.1:' + omeglePortNumber + ' in your web browser to view the GUI.');
});

/*var test = new Sham();
test.start(function(err) {
    console.log(err);
});

test.on('newid', function(client_id) {
    console.log('Got a newID: ' + client_id);
});
*/
