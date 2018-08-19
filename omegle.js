/*
    Original Library here: https://github.com/CRogers/omegle
*/

var EventEmitter = require('events').EventEmitter;
var https = require('https');
var qs = require('qs');
var util = require('util');

var version = '1.0';
var settings = require('./settings.json');

// Server list
var serverList = [];

// Callback(s) to run when we are ready
var onReadyCallbacks = [];

// Gets a time stamp
function getTimeStamp() {
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    return hour + ":" + min + ":" + sec;
}

function Omegle(args) {
    // Ensure we have an args object
    if(args == null) args = {};

    // Do we have a client id?
    if(args.client_id) {
        this.client_id = args.client_id;
    }

    // Store data
    this.userAgent = args.userAgent || 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.117 Safari/537.36';
    this.host = args.host || Omegle.getSelectedServer();
    this.language = args.language || settings.defaultLanguage || 'en';
    this.mobile = args.mobile || false;

    // Store group
    this.group = args.group;

    // Attempt to copy the random ID in
    if(args.randid) {
        // It exists, copy it
        this.randid = args.randid;
    } else {
        // Generate a randomID
        this.randid = '';
        var randData = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        for(var i=0; i<8; i++) {
            this.randid += randData.charAt(Math.floor(Math.random() * randData.length));
        }
    }

    // Spy mode?
    if(args.wantsspy) {
        // What kind of spy mode?
        if(args.ask) {
            // User is asking a question
            this.ask = args.ask;
        } else {
            // User is answering questions
            this.wantsspy = args.wantsspy;
        }
    } else {
        // Store college stuff
        if(args.college && args.college_auth) {
            this.college = args.college;
            this.college_auth = args.college_auth;

            if(args.any_college) {
                this.any_college = args.any_college;
            }
        }

        // Check if we should use topics
        if(args.topics != null && this.group != 'unmon') {
            this.topics = args.topics;
            this.use_likes = 1;
        }

        // Check for a camera
        if(args.camera && args.spid) {
            this.camera = args.camera;
            this.spid = args.spid;
        }
    }

    // Reset our ID when the stranger disconnects
    this.on('strangerDisconnected', function() {
        // Remove our ID
        this.client_id = null;
    });
}

// Add event emitter methods
util.inherits(Omegle, EventEmitter);

// Selects a server for us
var serverNumber = 0;
Omegle.getSelectedServer = function() {
    return serverList[serverNumber] || 'omegle.com';
}

// Function to allow callbacks for when the client is ready
Omegle.onReady = function(callback) {
    // We will assume that there WILL be _some_ servers if the client is ready
    if(serverList.length > 0) {
        callback(serverList);
    } else {
        onReadyCallbacks.push(callback);
    }
}

// Store error handler
Omegle.prototype.errorHandler = function(callback) {
    // Store it
    this.errorCallback = callback;
};

Omegle.prototype.requestGet = function(path, callback, proxyInfo) {
    this.requestFull('GET', path, false, true, callback, proxyInfo);
};

Omegle.prototype.requestPost = function(path, data, callback, proxyInfo) {
    this.requestFull('POST', path, data, true, callback, proxyInfo);
};

Omegle.prototype.requestKA = function(path, data, callback, proxyInfo) {
    this.requestFull('POST', path, data, true, callback, proxyInfo);
};

Omegle.prototype.requestFull = function(method, path, data, keepAlive, callback, proxyInfo) {
    // Grab a reference to this
    var thisOmegle = this;

    // Grab form data
    var formData;
    if (data) {
        formData = formFormat(data);
    }

    // Format the options
    var options = {
        method: method,
        host: this.host,
        port: 443,
        path: path,
        headers: {
            'User-Agent': this.userAgent,
            host: this.host
        },
        agent:false
    };

    // Add in proxy info
    if(proxyInfo) {
        options.host = proxyInfo.ip;
        options.port = proxyInfo.port;
    }

    // Add headers for form data
    if (formData) {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Content-Length'] = formData.length;
    }

    // Setup the keep alive header
    if (keepAlive) {
        options.headers['Connection'] = 'Keep-Alive';
    }

    // Debug mode
    if(settings.debug) {
        console.log('Requesting: https://' + this.host + path);

        if(data) {
            console.log(JSON.stringify(data, null, 4));
        }
    }

    // Create the request
    var req = https.request(options, callback);

    // Allow no more than 65 seconds to complete the request
    setTimeout(function() {
        req.socket.end();
    }, 65 * 1000);

    // Handle disconnect error
    req.on('error', function(error) {
        //console.log('$$$ ERROR!!!! $$$');
        //console.log(error);

        // Grab the message
        var msg = 'ERROR (' + getTimeStamp() + '): ' + error.message;

        thisOmegle.nextServer();

        // Check if we have a callback
        if(thisOmegle.errorCallback) {
            // Run the callback
            thisOmegle.errorCallback(msg);
        } else {
            // Log the error
            console.log(msg);
        }

        // Resend the request after a short delay
        setTimeout(function() {
            thisOmegle.requestFull(method, path, data, keepAlive, callback);
        }, 1000);
    });

    // Submit form data
    if (formData) {
        req.write(formData);
    }

    return req.end();
};

// Attempst to reconnect
Omegle.prototype.reconnect = function(callback) {
    // Ensure we have a client_id
    if(this.client_id == null) {
        callback('No client_id found.');
        return;
    }

    // Emit the new ID event
    this.emit('newid', this.client_id);

    if(settings.debug) {
        this.emit('debugEvent', 'eventsLoop() reconnect');
    }

    // Start the events loop again
    this.eventsLoop();
};

// Cycles to the next server
Omegle.prototype.nextServer = function() {
    if(++serverNumber >= serverList.length) serverNumber = 0;
    this.host = Omegle.getSelectedServer();
}

// Connects
Omegle.prototype.start = function(callback, proxyInfo) {
    var _this = this;

    return this.requestGet('/start?' + qs.stringify({
        rcs: 1,
        firstevents: 1,
        m: mobileValue(this.mobile),
        lang: this.language,
        randid: this.randid,
        use_likes: this.use_likes,
        topics: JSON.stringify(this.topics),
        group: this.group,
        college: this.college,
        college_auth: this.college_auth,
        any_college: this.any_college,
        wantsspy: this.wantsspy,
        ask: this.ask,
        spid: this.spid,
        camera: this.camera,
        caps: 'recaptcha2'
    }), function(res) {
        // Ensure the request worked
        if (res.statusCode !== 200) {
            if (typeof callback === "function") {
                callback(res.statusCode);
                return;
            }
        }

        // Process the event
        getAllData(res, function(data) {
            // Make sure we got some data
            if(data != null) {
                try {
                    // Parse the info
                    var info = JSON.parse(data);

                    // Check for errors
                    if(info.clientID == null) {
                        // Pick a new server
                        _this.nextServer();

                        callback('Error: No clientID allocated.');
                         _this.start(callback, proxyInfo);
                        return;
                    }

                    // Store the clientID
                    _this.client_id = info.clientID;

                    // Run the callback
                    if (typeof callback === "function") {
                        callback();
                    }

                    // Emit the newid event
                    _this.emit('newid', _this.client_id);

                    // Push Events
                    _this.eventReceived(false, JSON.stringify(info.events || {}));
                } catch(e) {
                    // Failure :(
                    callback('Failed to parse JSON: '+e+'\n\n' + String(data));
                } finally {
                    if(settings.debug) {
                        _this.emit('debugEvent', 'eventsLoop() finally');
                    }

                    // Run the event loop
                    _this.eventsLoop();
                }
            } else {
                // Run the fail callback
                callback(-1);
            }
        });
    }, proxyInfo);
};

Omegle.prototype.recaptcha = function(answer) {
    var _this = this;

    this.requestPost('/recaptcha', {
        response: answer
    }, function(res){
    	getAllData(res, function(data) {
            console.log('Recaptcha result: ' + data);
        });
    });
};

Omegle.prototype.send = function(msg, callback) {
    this.requestPost('/send', {
        msg: msg,
        id: this.client_id
    }, function(res) {
        callbackErr(callback, res);
    });
};

Omegle.prototype.getStatus = function(callback, proxyInfo) {
    this.requestGet('/status?nocache=' + Math.random(), function(res) {
        getAllData(res, function(data) {
            callback(JSON.parse(data));
        });
    });
};

Omegle.prototype.postEvent = function(event, callback) {
    this.requestPost("/" + event, {
        id: this.client_id
    }, function(res) {
        callbackErr(callback, res);
    });
};

Omegle.prototype.startTyping = function(callback) {
    this.postEvent('typing', callback);
};

Omegle.prototype.stopTyping = function(callback) {
    this.postEvent('stoppedtyping', callback);
};

Omegle.prototype.disconnect = function(callback) {
    this.postEvent('disconnect', callback);
    this.client_id = null;
};

Omegle.prototype.eventsLoop = function() {
    var _this = this;

    if(settings.debug) {
        this.emit('debugEvent', 'onEventsLoopStart()');
    }

    this.requestKA('/events', {
        id: this.client_id
    }, function(res) {
        if(settings.debug) {
            _this.emit('debugEvent', 'onGetStatusCode() ' + res.statusCode);
        }

        if (res.statusCode === 200) {
            getAllData(res, function(eventData) {
                _this.eventReceived(true, eventData);
            });
        } else {
            // Some kind of error, log i t
            console.log('Got an unknown status code in events loop: ' + res.statusCode);

            if(settings.debug) {
                _this.emit('debugEvent', 'eventsLoop() bad status code');
            }

            // Restart events loop
            _this.eventsLoop();
        }
    });
};

Omegle.prototype.eventReceived = function(shouldLoop, data) {
    if(settings.debug) {
        this.emit('debugEvent', 'onGetEventData() _start_');
    }

    try {
        // Did we get any data?
        if(data != null) {
            var event, _i, _len;

            data = JSON.parse(data);
            if (data != null) {
                for (_i = 0, _len = data.length; _i < _len; _i++) {
                    event = data[_i];

                    if(settings.debug) {
                        this.emit('debugEvent', 'onGetEventData() ' + JSON.stringify(event));
                    }

                    this.emit.apply(this, event);
                }
            }
        }
    } catch(e) {
        // Do nothing
        console.log('event apply error');
        console.log(e);
    }
    
    // Do we still have a client id?
    if (shouldLoop && this.client_id) {
        if(settings.debug) {
            this.emit('debugEvent', 'eventsLoop() events received');
        }

        // Start the events loop
        this.eventsLoop();
    }
};

function getAllData(res, callback) {
    var buffer;

    var finished = false;

    buffer = [];
    res.on('data', function(chunk) {
        return buffer.push(chunk);
    });

    // If we have an error
    res.on('error', function() {
        if(finished) return;
        finished = true;

        callback(buffer.join(''));
    });

    res.on('end', function() {
        if(finished) return;
        finished = true;

        callback(buffer.join(''));
    });
};

// Export it
Omegle.prototype.getAllData = getAllData;

function callbackErr(callback, res) {
    return typeof callback === "function" ? callback((res.statusCode !== 200 ? res.statusCode : void 0)) : void 0;
};

function formFormat(data) {
    var k, v;

    return ((function() {
        var _results;

        _results = [];
        for (k in data) {
            v = data[k];
            _results.push("" + k + "=" + encodeURIComponent(v));
        }

        return _results;
    })()).join('&');
};

function mobileValue(mobileParam) {
    if (mobileParam == null) {
        mobileParam = this.mobile;
    }

    if (mobileParam === true || mobileParam === 1) {
        return 1;
    } else {
        return 0;
    }
};

// Update servers
(function() {
    var om = new Omegle();

    om.getStatus(function(status) {
        // Store the server list
        serverList = ['omegle.com'];

        // Add the entries we just got
        for(var i=0; i<status.servers.length; ++i) {
            serverList.push(status.servers[i] + '.omegle.com');
        }

        // Ensure at least one server was found
        if(serverList.length == 0) {
            console.log('Error: No omegle servers were found!');
        }

        // Run the callbacks
        for(var i=0; i<onReadyCallbacks.length; ++i) {
            onReadyCallbacks[i](serverList);
        }

        // Cleanup
        delete om;
    });
})();

// Define exports
exports.Omegle = Omegle;
