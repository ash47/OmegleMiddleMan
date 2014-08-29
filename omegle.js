/*
    Original Library here: https://github.com/CRogers/omegle
*/

var EventEmitter = require('events').EventEmitter;
var http = require('http');
var qs = require('qs');
var util = require('util');

var version = '1.0';

function Omegle(args) {
    // Ensure we have an args array
    if(args == null) args = {};

    // Store data
    this.userAgent = args.userAgent || "omegle node.js npm package/" + version;
    this.host = args.host || 'front8.omegle.com';
    this.language = args.language || 'en';
    this.mobile = args.mobile || false;

    // Check if we should use topics
    if(args.topics != null) {
        this.topics = args.topics;
        this.use_likes = 1;
    }

    // Generate a randomID
    this.randid = '';
    var randData = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    for(var i=0; i<8; i++) {
        this.randid += randData.charAt(Math.floor(Math.random() * randData.length));
    }

    // Reset our ID when the stranger disconnects
    this.on('strangerDisconnected', function() {
        // Remove our ID
        this.client_id = null;
    });
}

// Add event emitter methods
util.inherits(Omegle, EventEmitter);

Omegle.prototype.requestGet = function(path, callback) {
    return this.requestFull('GET', path, void 0, void 0, callback);
};

Omegle.prototype.requestPost = function(path, data, callback) {
    return this.requestFull('POST', path, data, void 0, callback);
};

Omegle.prototype.requestKA = function(path, data, callback) {
    return this.requestFull('POST', path, data, true, callback);
};

Omegle.prototype.requestFull = function(method, path, data, keepAlive, callback) {
    if (data) {
        data = formFormat(data);
    }

    var options = {
        method: method,
        host: this.host,
        port: 80,
        path: path,
        headers: {
            'User-Agent': this.userAgent
        }
    };

    if (data) {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Content-Length'] = data.length;
    }

    if (keepAlive) {
        options.headers['Connection'] = 'Keep-Alive';
    }

    var req = http.request(options, callback);

    // Handle disconnect error
    req.on('error', function(error) {
        console.log('ERROR' + error.message);
    });

    if (data) {
        req.write(data);
    }

    return req.end();
};

Omegle.prototype.start = function(callback) {
    var _this = this;

    return this.requestGet('/start?' + qs.stringify({
        rcs: 1,
        firstevents: 1,
        m: mobileValue(this.mobile),
        lang: this.language,
        randid: this.randid,
        use_likes: this.use_likes,
        topics: JSON.stringify(this.topics)
    }), function(res) {
        // Ensure the request worked
        if (res.statusCode !== 200) {
            if (typeof callback === "function") {
                callback(res.statusCode);
            }
        }

        // Process the event
        getAllData(res, function(data) {
            // Make sure we got some data
            if(data != null) {
                // Parse the info
                var info = JSON.parse(data);

                // Store the clientID
                _this.client_id = info.clientID;

                // Run the callback
                callback();

                // Emit the newid event
                _this.emit('newid', _this.client_id);

                // Run the event loop
                _this.eventsLoop();

                // Push Events
                _this.eventReceived(JSON.stringify(info.events));
            } else {
                // Run the fail callback
                callback(-1);
            }
        });
    });
};

Omegle.prototype.send = function(msg, callback) {
    return this.requestPost('/send', {
        msg: msg,
        id: this.client_id
    }, function(res) {
        return callbackErr(callback, res);
    });
};

Omegle.prototype.getStatus = function(callback) {
    return this.requestGet('/status?nocache=' + Math.random(), __bind(function(res) {
        return getAllData(res, __bind(function(data) {
            callback(JSON.parse(data));
            return data;
        }, this));
    }, this));
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
    return this.client_id = null;
};

Omegle.prototype.eventsLoop = function() {
    var _this = this;

    return this.requestKA('/events', {
        id: this.client_id
    }, function(res) {
        if (res.statusCode === 200) {
            return getAllData(res, function(eventData) {
                return _this.eventReceived(eventData);
            });
        }
    });
};

Omegle.prototype.eventReceived = function(data) {
    var event, _i, _len;

    data = JSON.parse(data);
    if (data != null) {
        for (_i = 0, _len = data.length; _i < _len; _i++) {
            event = data[_i];
            this.emit.apply(this, event);
        }
    }

    if (this.client_id) {
        return this.eventsLoop();
    }
};

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
            _results.push("" + k + "=" + v);
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

// Define exports
exports.Omegle = Omegle;
