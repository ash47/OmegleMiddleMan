var EventEmitter = require('events').EventEmitter;
var http = require('http');
var qs = require('qs');
var util = require('util');
var faye = require('faye');

// The version of our app
var version = '1.0';

// Returns a server to connect to
function pickServer() {
    // The list is currently hard coded
    // We should pull the list from the server really
    return 'bee1'+'.shamchat.com';
}

function Sham(args) {
    // Ensure we have an args object
    if(args == null) args = {};

    // Store data
    this.host = pickServer();
    this.userAgent = args.userAgent || 'Sham node.js ' + version;

    // Do we have a client id?
    if(args.client_id) {
        this.client_id = args.client_id;
    }

    // Our character
    this.character = args.character || 'Unknown character';
}

// Add event emitter methods
util.inherits(Sham, EventEmitter);

Sham.prototype.start = function(callback) {
    var _this = this;

    this.requestPost('/connect', {
        // Our character (our name basically)
        c: this.character,

        // Our nearID (used for video chat)
        nid: null
    }, function(res){
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

                    // Store the clientID
                    _this.client_id = info.clientID;

                    // Emit the newid event
                    _this.emit('newid', _this.client_id);

                    // Cleanup old faye
                    _this.cleanupFaye();

                    // Setup event handlers
                    _this.faye = new faye.Client('http://' + this.host + '/faye');
                    _this.faye.disable("autodisconnect");

                    _this.faye.subscribe("/" + _this.client_id, function(g) {
                        console.log('yes!');
                        _this.messageReceived(g);
                    }).then(function() {
                        console.log('scc');

                        // Find a stranger
                        _this.pair(callback);
                    }, function() {
                        console.log('err');
                    });

                    console.log('done setting up!');
                } catch(e) {
                    // Failure :(
                    callback('Failed to parse JSON: '+e+'\n\n' + String(data));
                }
            } else {
                // Run the fail callback
                callback(-1);
            }
        });
    });
};

// Pairs us with a stranger
Sham.prototype.pair = function(callback) {
    console.log('pairing...');

    var _this = this;

    this.requestPost('/pair', {
        // Our clientID from the server
        id: this.client_id
    }, function(res){
        // Ensure the request worked
        if (res.statusCode !== 200) {
            if (typeof callback === "function") {
                callback(res.statusCode);
                return;
            }
        }

        // Run the callback
        if (typeof callback === "function") {
            callback();
        }

        console.log('Done!');
    });
}

// Message Handler
Sham.prototype.messageReceived = function(g) {
    console.log('got a message!');
    console.log(g);
}

// Cleans up Faye
Sham.prototype.cleanupFaye = function() {
    if(!this.faye) return;

    this.faye.disconnect();
    delete this.faye.fayeClient
}

// Store error handler
Sham.prototype.errorHandler = function(callback) {
    // Store it
    this.errorCallback = callback;
};

Sham.prototype.requestGet = function(path, callback) {
    return this.requestFull('GET', path, false, true, callback);
};

Sham.prototype.requestPost = function(path, data, callback) {
    return this.requestFull('POST', path, data, true, callback);
};

Sham.prototype.requestKA = function(path, data, callback) {
    return this.requestFull('POST', path, data, true, callback);
};

Sham.prototype.requestFull = function(method, path, data, keepAlive, callback) {
    // Grab a reference to this
    var thisSham = this;

    // Grab form data
    var formData;
    if (data) {
        formData = formFormat(data);
    }

    // Format the options
    var options = {
        method: method,
        host: this.host,
        port: 80,
        path: path,
        headers: {
            'User-Agent': this.userAgent
        },
        agent:false
    };

    // Add headers for form data
    if (formData) {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Content-Length'] = formData.length;
    }

    // Setup the keep alive header
    if (keepAlive) {
        options.headers['Connection'] = 'Keep-Alive';
    }

    // Create the request
    var req = http.request(options, callback);

    // Handle disconnect error
    req.on('error', function(error) {
        // Grab the message
        var msg = 'ERROR (' + getTimeStamp() + '): ' + error.message;

        // Check if we have a callback
        if(thisSham.errorCallback) {
            // Run the callback
            thisSham.errorCallback(msg);
        } else {
            // Log the error
            console.log(msg);
        }

        // Resend the request after a short delay
        setTimeout(function() {
            thisSham.requestFull(method, path, data, keepAlive, callback);
        }, 1000);
    });

    // Submit form data
    if (formData) {
        req.write(formData);
    }

    return req.end();
};

// Formats form data
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

// Returns all the data for the given resource object
function getAllData(res, callback) {
    var buffer;

    buffer = [];
    res.on('data', function(chunk) {
        return buffer.push(chunk);
    });

    res.on('end', function() {
        callback(buffer.join(''));
    });
};

// Define exports
exports.Sham = Sham;
