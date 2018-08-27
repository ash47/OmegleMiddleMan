/*
    Client
*/

var websiteTitle = 'Omegle';

// Default settings
var omegleSettings = omegleSettings || {
    defaultTopics: 'noMultiRP,rp,roleplay',
    defaultMessage: 'Please make a copy of static/js/settings_example.js, and call it static/js/settings.js You can change the settings to fit your needs',
    reroll: true,
    moderated: true,
    spy: false,
    ask: false,
    likes: true,
    useCollege: false,
    anyCollge: true,
    video: false,
    delayed: true
};

// The video server
var omegleVideoServer = 'rtmfp://p2p.rtmfp.net';
var omegleVideoServerPassword = '6fd539b64a3ca859d410f2f6-ac89c5a8742e';

// Default topics
var defaultTopics = omegleSettings.defaultTopics;

// Default message to auto send
//var defaultAutoMessage = 'Hi! You\'re talking to multiple people! Type /commands for a list of commands. Any messages that start with a slash will not be sent to other users.';
var defaultAutoMessage = omegleSettings.defaultMessage;

// Is the window focused?
var windowFocused = true;

// Contains key words that cause an auto blackhole
var autoBlackHoleList = [];

// Used for cache callbacks
var cacheCallbacks = {};
var totalCached = 0;

function painMap() {
    /*
        Setup chat
    */

    // Create the socket
    this.socket = io();

    // The total number of connections so far
    this.totalConnections = 0;

    // Contains all the pains
    this.pains = [];

    // Create a reference to the pain map
    var pMap = this;

    // Hook unlocking
    $('#unlockSearching').click(function() {
        // Ask server to unlock searching
        pMap.socket.emit('omegleUnlock');
    });

    $('#blackholeList').click(function(){
        $('#autoBlackholeList').toggle();
    });

    // Hook auto blackhole
    $('#updateBlackHoleList').click(function() {
        var allText = $('#updateBlackHoleListField').val();
        var allLines = allText.split('\n');

        autoBlackHoleList = [];
        for(var i=0; i<allLines.length; ++i) {
            var theLine = allLines[i].toLowerCase();

            if(theLine.length > 0) {
                var flags = {};

                var matchText = '[exact]';
                if(theLine.indexOf(matchText) != -1) {
                    flags.exact = true;
                    theLine = theLine.replace(matchText, '');
                }

                var matchText = '[first]';
                if(theLine.indexOf(matchText) != -1) {
                    flags.first = true;
                    theLine = theLine.replace(matchText, '');
                }

                var matchText = '[nospaces]';
                if(theLine.indexOf(matchText) != -1) {
                    flags.nospaces = true;
                    theLine = theLine.replace(matchText, '');
                }

                var matchText = '[regex]';
                if(theLine.indexOf(matchText) != -1) {
                    flags.regex = true;
                    theLine = theLine.replace(matchText, '');
                }

                theLine = theLine.trim();

                if(theLine.length > 0) {
                    autoBlackHoleList.push({
                        text: theLine,
                        flags: flags
                    });
                }
            }
        }
    });

    // Handle disconnect
    pMap.socket.on('disconnect', function () {
        // Add disconnect to all pains
        for(var key in pMap.pains) {
            // Grab the container
            var p = pMap.pains[key];

            // Tell the client
            p.addTextLine('Lost connection to the server :(');

            // Reset callbacks
            p.resetCallbacks();
        }
    });

    // Handle errors
    pMap.socket.on('error', function(e) {
        // Add disconnect to all pains
        for(var key in pMap.pains) {
            // Grab the container
            var p = pMap.pains[key];

            // Tell the client
            if(omegleSettings.debug) {
                p.addTextLine('Socket error: '+htmlEntities(e.message));
            }
            throw e;
        }
    });

    // Handle reconnect
    pMap.socket.on('connect', function () {
        // Add disconnect to all pains
        for(var key in pMap.pains) {
            // Grab the container
            var p = pMap.pains[key];

            // Tell the client
            if(p.connected) {
                p.addTextLine('Connected to server, reconnecting to omegle...');
            } else {
                p.addTextLine('Connected to server.');
            }

            // Ask it to reconnect
            p.reconnect();
        }
    });

    // Server sent us info about omegle's status
    pMap.socket.on('omegleStatusInfo', function (statusInfo) {
        if(statusInfo == null) return;

        if(statusInfo.count) {
            $('#totalOmeglers').text(numberWithCommas(statusInfo.count)+' online');
        }
    });

    // Server created a new omegle instance for us
    pMap.socket.on('newOmegle', function(client_id, args) {
        // Search for a new pain
        var found = false;
        for(var key in pMap.pains) {
            // Grab the container
            var p = pMap.pains[key];

            if((p.searching || p.reconnecting) && p.painID == args.painID) {
                // Found a connection
                p.searching = false;
                p.connected = true;
                p.updateClientId(client_id);
                p.confirmDisconnect = false;

                // Are we reconnecting
                if(p.reconnecting) {
                    p.reconnecting = false;
                    p.addTextLine('Reconnected!');
                } else {
                    // Store the start time
                    p.startTime = new Date().getTime();
                }

                // Create the text
                p.updateButton('Disconnect', 'btn-danger');

                // We have found a match
                found = true;
                break;
            }
        }

        // Did we find a pain that needed it?
        if(!found) {
            // Unwanted connection, just drop it
            //pMap.socket.emit('omegleDisconnect', client_id);
        }
    });

    // Recapcha
    pMap.socket.on('omegleNewChallenge', function(args, code) {
        // Search for the one that needs it to be solved
        for(var key in pMap.pains) {
            // Grab the container
            var p = pMap.pains[key];

            if(p.painID == args.painID) {
                // Add the image
                p.addTextLine('You need to do recaptcha and it is currently broken. Jump on the website, do the recaptcha, then come back here.');

                var b = document.createElement('div');
                p.field.append(b);

                grecaptcha.render(b, {
                    sitekey: code,
                    callback: function(answer) {
                        //alert(a);
                        pMap.socket.emit('omegleChallenge', code, answer);
                    }
                })

                

                // Scope fix
                /*(function() {
                    var pp = p;

                    /*$.getScript( 'http://www.google.com/recaptcha/api/challenge?k=' + encodeURIComponent(code), function( data, textStatus, jqxhr ) {
                        pp.addTextLine('<img src="http://www.google.com//recaptcha/api/image?c='+RecaptchaState.challenge+'" height="57">');
                        pp.challenge = RecaptchaState.challenge;

                        /*if(pp.totalCaptchaFails == null || pp.totalCaptchaFails < 10) {
                            // Increase total number of fails
                            pp.totalCaptchaFails = (pp.totalCaptchaFails || 0) + 1;

                            // Tell the user we are trying to read it
                            p.addTextLine('Attempting to guess captcha...');

                            setTimeout(function() {
                                // Let's attempt to auto solve
                                pMap.socket.emit('omegleChallenge', code, RecaptchaState.challenge, 'asd dsa');
                            }, 1);
                        }*/
                    /*});
                })();*/

                // We are doing a captcha
                p.captcha = true;
                p.code = code;
            }
        }
    });

    pMap.socket.on('omegleChallenge', function(args, code, challenge) {
        // Search for the one that needs it to be solved
        for(var key in pMap.pains) {
            // Grab the container
            var p = pMap.pains[key];

            if(p.painID == args.painID) {
                // Add the image
                p.addTextLine('<img src="http://www.google.com//recaptcha/api/image?c='+challenge+'" height="57">');

                // We are doing a captcha
                p.captcha = true;
                p.code = code;
                p.challenge = challenge;
            }
        }
    });

    // Server reported that we are banned
    pMap.socket.on('omegleBanned', function(args) {
        // Search for a new pain
        var found = false;
        for(var key in pMap.pains) {
            // Grab the container
            var p = pMap.pains[key];

            if(p.painID == args.painID) {
                // Found the right pain

                // Disconnect
                p.disconnect()

                // Log the problem
                p.addTextLine('<b><font color="red">You are banned.</font></b> Switching to unmoderated...');

                // Toggle unmoderated off
                p.moderated.prop('checked', false);

                // Begin searching again
                p.createConnection();
            }
        }
    });

    // We got a callback
    pMap.socket.on('omegleCallback', function(client_id, callbackNum, success) {
        var p = pMap.findByID(client_id);

        if(p) {
            if(p.messageCallback[callbackNum]) {
                p.messageCallback[callbackNum](success);
                delete p.messageCallback[callbackNum];
            }
        }
    });

    // We got a log file
    pMap.socket.on('omegleLog', function(cacheNumber, ret) {
        var cacheInto = cacheCallbacks[cacheNumber];
        if(cacheInto) {
            // Cleanup
            delete cacheCallbacks[cacheNumber];

            // Add the news
            if(ret == '' || ret == 'http://logs.Omegle.com/413e674') {
                cacheInto.text('Failed to generate log!');
            } else {
                cacheInto.html('<a href="' + ret + '" target="_blank">' + ret + '</a>');
            }
        }
    });

    // There was an error
    pMap.socket.on('omegleError', function(args, err) {
        // Search for a new pain
        var found = false;
        for(var key in pMap.pains) {
            // Grab the container
            var p = pMap.pains[key];

            if(p.painID == args.painID) {
                // Found the right pain

                // Log the problem
                if(omegleSettings.debug) {
                    p.addTextLine('Error: '+htmlEntities(err));
                }
            }
        }
    });

    // Server created a new clever instance for us
    pMap.socket.on('newClever', function(client_id, args) {
        // Search for a new pain
        var found = false;
        for(var key in pMap.pains) {
            // Grab the container
            var p = pMap.pains[key];

            if(p.searching && p.painID == args.painID) {
                // Found a connection
                p.searching = false;
                p.connected = true;
                p.updateClientId(client_id);

                // Store the start time
                p.startTime = new Date().getTime();

                // Create the text
                p.updateButton('Disconnect', 'btn-danger');

                // Tell the user
                p.addTextLine('Cleverbot has connected!');

                // Update name
                p.nameField.val('Cleverbot');

                // Auto send message
                p.sendAutoMessage(client_id, 400);

                // We have found a match
                found = true;
                break;
            }
        }

        // Did we find a pain that needed it?
        if(!found) {
            // Unwanted connection, just drop it
            pMap.socket.emit('cleverDisconnect', client_id);
        }
    });

    // Omegle is finding us a partner
    pMap.socket.on('omegleWaiting', function(client_id) {
        var p = pMap.findByID(client_id);

        if(p) {
            p.addTextLine('Searching for a stranger...');
        }
    });

    // Omegle connected us to someone
    pMap.socket.on('omegleConnected', function(client_id, peerID) {
        var p = pMap.findByID(client_id);

        // Increase total number of connections
        pMap.totalConnections++;

        if(p) {
            // Reset total number of captcha fails
            p.totalCaptchaFails = 0;

            // Store the time they connected
            p.startTime = new Date().getTime();

            // Clear our message cache
            p.messageCache = [];

            // Tell the person!
            p.addTextLine('A stranger was connected!');

            // Auto send message
            p.sendAutoMessage(client_id, 1500);

            // Auto disconnect
            p.autoDisconnect(client_id, (omegleSettings.maxWaitType || 15) * 1000, (omegleSettings.maxWaitMessage || 45) * 1000);

            // Store their name
            p.nameField.val('Stranger ' + pMap.totalConnections);

            // Is there a camera?
            if(peerID != null) {
                // Pass to our streamer
                document.getElementById("flash"+p.painID).gotStrangerPeerID(peerID);
            }

            // Handle notifications
            pMap.notifications();

            // This person hasn't typed yet
            p.hasTyped = false;
            p.hasSpoken = false;
        }
    });

    // Omegle is telling us our common likes
    pMap.socket.on('omegleCommonLikes', function(client_id, commonLikes) {
        var p = pMap.findByID(client_id);

        if(p) {
            var totalLikes = 0;

            // Loop over the likes
            for(var key in commonLikes) {
                if(commonLikes[key].toLowerCase() == 'nomultirp') {
                    // Disconnect
                    pMap.doDisconnect(client_id, null, 'Disconnected: NoMultiRP detected.');
                    return;
                }

                // Increase number of likes
                ++totalLikes;
            }

            // Display the likes
            p.addTextLine('The stranger likes '+htmlEntities(commonLikes.toString()));

            // Do we have this setting?
            if(omegleSettings.maxCommonInterests != null && totalLikes > omegleSettings.maxCommonInterests) {
                // Disconnect
                p.blackhole('Too many interests!');
                return;
            }
        }
    });

    // Omegle is telling us our partner's college
    pMap.socket.on('omeglePartnerCollege', function(client_id, college) {
        var p = pMap.findByID(client_id);

        if(p) {
            // Display the college
            p.addTextLine('Stranger\'s college: '+htmlEntities(college));
        }
    });

    // Omegle sent us a question
    pMap.socket.on('omegleQuestion', function(client_id, question) {
        var p = pMap.findByID(client_id);

        if(p) {
            // Display the college
            p.addTextLine('<b>Question:</b> '+htmlEntities(question));
        }
    });

    // Stranger has disconnected
    pMap.socket.on('omegleStrangerDisconnected', function(client_id) {
        // Do it
        pMap.doDisconnect(client_id);

        // Handle notifications
        pMap.notifications();
    });

    // Proxy issues
    pMap.socket.on('conFailedProxy', function(args) {
        pmap.conFailedProxy(args.painID);
    });

    // Spy disconected
    pMap.socket.on('omegleSpyDisconnected', function(client_id, spy) {
        // Do it
        pMap.doDisconnect(client_id, spy);
    });

    // We got a message
    pMap.socket.on('omegleGotMessage', function(client_id, msg) {
        var p = pMap.findByID(client_id);

        if(p) {
            if(!p.wontAutoDisconnect) {
                // Check for blackhole
                var lowerMsg = msg.toLowerCase().trim();
                for(var i=0; i<autoBlackHoleList.length; ++i) {
                    var info = autoBlackHoleList[i]
                    var word = info.text;
                    var flags = info.flags;

                    var doBlackhole = false;

                    // First Message
                    if(flags.first) {
                        if(p.hasSpoken) continue;
                    }

                    // Remove all the spaces
                    if(flags.nospaces) {
                        lowerMsg = lowerMsg.replace(/ /g, '')
                    }

                    // Exact Match
                    if(flags.exact) {
                        if(lowerMsg == word) {
                            doBlackhole = true;
                        }
                    } else if(flags.regex) {
                        try {
                            var theRegex = new RegExp(word, 'i');

                            if(lowerMsg.match(theRegex)) {
                                doBlackhole = true;
                            }
                        } catch(e) {
                            var errorMessage = 'Check your BlackHole Regex: ' + htmlEntities(e.message);
                            p.addTextLine('<font color="red">Meta:</font> ' + errorMessage, errorMessage, 'Meta');
                        }
                        
                    } else {
                        if(lowerMsg.indexOf(word) != -1) {
                            doBlackhole = true;
                        }
                    }

                    // Should we do the blackhole?
                    if(doBlackhole) {
                        // They are no longer typing
                        p.updateTalking(false);

                        // Add the message
                        p.addTextLine('<font color="red">Stranger:</font> '+htmlEntities(msg), msg, 'Stranger');

                        // Do the blackhole
                        p.blackhole('Client used: ' + word);
                        return;
                    }
                }

                // Check for auto disconnect
                if(omegleSettings.agressiveBotIgnore) {
                    if(!p.hasTyped && p.ignoreBots.is(':checked') && p.getTimeConnected() < 3 && !p.hasSpoken) {
                        p.dontAutoSend = true;

                        setTimeout(function() {
                            if(p.getClientId() == client_id) {
                                pMap.doDisconnect(client_id, null, 'Disconnected: Bot or phone user.');
                            }
                        }, 1000);
                        return;
                    }
                }
            }

            // This person has spoken
            p.hasSpoken = true;

            // They are no longer typing
            p.updateTalking(false);

            // Add the message
            p.addTextLine('<font color="red">Stranger:</font> '+htmlEntities(msg), msg, 'Stranger');

            // Manage notifications
            pMap.notifications();

            // Check for commands
            //if(processCommands(con, msg)) return;

            // Broadcast it
            p.broadcastMessage(msg);
        }
    });

    pMap.socket.on('omegleSpyMessage', function(client_id, spy, msg) {
        var p = pMap.findByID(client_id);

        if(p) {
            // They are no longer typing
            p.updateTalking(false);

            // Add the message
            p.addTextLine('<font color="red">'+htmlEntities(spy)+':</font> '+htmlEntities(msg), msg, 'Spy');

            // Check for commands
            //if(processCommands(con, msg)) return;

            // Broadcast it
            p.broadcastMessage(msg);
        }
    });

    // We got a cleverbot message
    pMap.socket.on('cleverGotMessage', function(client_id, msg) {
        var p = pMap.findByID(client_id);

        if(p) {
            // Add a delay if we need to
            var delay = 0;
            if(p.moderated.is(':checked')) {
                delay = 1500+Math.random()*2000;
            }

            // Add a small delay
            setTimeout(function() {
                // They are no longer typing
                p.updateTalking(false);

                // Add the message
                p.addTextLine('<font color="red">Cleverbot:</font> '+htmlEntities(msg), msg, 'Cleverbot');

                // Broadcast it
                p.broadcastMessage(msg);
            }, delay);
        }
    });

    // Stranger started typing
    pMap.socket.on('omegleTyping', function(client_id) {
        var p = pMap.findByID(client_id);

        if(p) {
            // Show that they're talking
            p.updateTalking(true);

            // Broadcast the typing event
            p.broadcastTyping();
        }
    });

    // Stranger stops typing
    pMap.socket.on('omegleStoppedTyping', function(client_id) {
        var p = pMap.findByID(client_id);

        if(p) {
            p.updateTalking(false);
        }
    });

    pMap.socket.on('debugEvent', function(client_id, reason) {
        var p = pMap.findByID(client_id);

        if(p) {
            // Print time connected
            p.debugEvent(reason);
        }
    });

    // We have disconnected
    pMap.socket.on('omegleDisconnected', function(client_id) {
        var p = pMap.findByID(client_id);

        if(p) {
            // Print time connected
            p.printTimeConnected();

            p.addTextLine('You have disconnected!');
            this.addLineBreak();

            // Unhook
            p.connected = false;
            p.updateClientId();

            // Reset button
            p.updateButton('New', 'btn-primary');

            // Disconnect on the server
            p.socket.emit('omegleDisconnect', client_id);
        }
    });

    pMap.socket.on('proxyMessage', function (msg, args) {
        // Add disconnect to all pains
        for(var key in pMap.pains) {
            // Grab the container
            var p = pMap.pains[key];

            // Ensure it's relevant
            if(args == null || p.painID == args.painID) {
                // Tell the client
                p.addTextLine(msg);
            }
        }
    });

    // Update the times
    this.updateTimes();
}

// Manages notifications
painMap.prototype.notifications = function() {
    // Check which sttae we are in
    if(!windowFocused) {
        // Stop many updates
        if(this.cantUpdate) return;

        // stop more updates
        this.cantUpdate = true;

        // Invert the focus counter
        this.focus1 = !this.focus1;

        // Build the seperator
        var sep;
        if(this.focus1) {
            sep = '‾‾‾‾';
            $("#favicon").attr("href","images/altfavicon.png");
        } else {
            sep = '____';
            $("#favicon").attr("href","images/favicon.png");
        }

        // Change the title
        document.title = sep + websiteTitle + sep;

        // Queue the next update
        var pMap = this;
        setTimeout(function() {
            // Allow updates
            pMap.cantUpdate = false;

            // Run the update
            pMap.notifications();
        }, 200);
    } else {
        document.title = websiteTitle;
        $("#favicon").attr("href","images/favicon.png");
    }
}

// We got a new peerID
painMap.prototype.setPeerID = function(args) {
    var p = this.findByPainID(args.painID);

    if(p) {
        p.peerID = args.nearID;
        p.cameras = args.cameras;
        p.mics = args.mics;

        for(var i=0; i<args.cameras.length; i++) {
            p.camSelector.append($('<option/>', {
                text: args.cameras[i]
            }));
        }

        for(var i=0; i<args.mics.length; i++) {
            p.micSelector.append($('<option/>', {
                text: args.mics[i]
            }));
        }

        // Set default stuff
        document.getElementById("flash"+args.painID).setCameraName('0');
        document.getElementById("flash"+args.painID).setMicID('0');

        // Show them
        p.camSelector.show();
        p.micSelector.show();
    }
}

painMap.prototype.setCameraSize = function(width, height, fps, quality) {
    if(width == null) width = 320;
    if(height == null) height = 240;
    if(fps == null) fps = 24;
    if(quality == null) quality = 91;

    // Loop over all pains
    for(var key in this.pains) {
        // Grab the pain
        var p = this.pains[key];

        // Do it
        var a = document.getElementById("flash"+p.painID);
        if(a) {
            a.setCameraSize(width, height, fps, quality);
        }
    }
}

// Limits searching or not
painMap.prototype.limitSearching = function(limited) {
    this.limitedSearching = limited;
}

painMap.prototype.updateWidth = function() {
    // Update pain width
    var mainCon = $('#mainCon');
    mainCon.css({
        width: (440*this.pains.length)+'px'
    });
}

// Sets up a new omegle pain
painMap.prototype.setupOmeglePain = function() {
    // Create a new pain
    var p = new pain();
    p.setup(this.socket);

    // Store the pain
    this.pains.push(p);

    // Update the broadcasting
    this.updateBroadcast();

    // Store a reference back to this painMap
    p.painMap = this;

    // Update width
    this.updateWidth();
}

// Sets up a new cleverbot pain
painMap.prototype.setupCleverBotPain = function() {
    // Create a new pain
    var p = new cleverPain();
    p.setup(this.socket);

    // Store the pain
    this.pains.push(p);

    // Update the broadcasting
    this.updateBroadcast();

    // Store a reference back to this painMap
    p.painMap = this;

    // Update width
    this.updateWidth();
}

// Sets up a new chat helper
painMap.prototype.setupChatHelper = function() {
    // Create a new pain
    var p = new helperPain();

    // Store a reference back to this painMap
    p.painMap = this;

    // Do the setup
    p.setup(this.socket);

    // Store the pain
    this.pains.push(p);

    // Update the broadcasting
    this.updateBroadcast();

    // Update width
    this.updateWidth();
}

// Removes the given pain
painMap.prototype.cleanup = function(painID) {
    // Find the slotID of the pain to remove
    var slotID = this.findSlotByPainID(painID);

    // Find and remove the pain
    var p = this.findByPainID(painID, true);
    if(p) {
        // Remove the pain
        p.container.remove();

        // Update the buttons
        this.updateBroadcast(slotID);
    }

    // Update width
    this.updateWidth();
}

// Updates the broadcasting
painMap.prototype.updateBroadcast = function(ignoreID) {
    for(var key=0; key < this.pains.length; key++) {
        // Grab a key
        var p = this.pains[key];

        // Event
        if(p.onbroadcastChanged) {
            p.onbroadcastChanged();
        }

        // Does this pain not support broadcast?
        if(p.noBroadcast) continue;

        // Build a list of previous values
        var values = [];
        for(var b = 0; b < p.broadcastFields.length; b++) {
            if(ignoreID == null || ignoreID != b) {
                values.push(p.broadcastFields[b].is(':checked'));
            }
        }

        // Empty the broadcast holder
        p.broadcast.empty();
        p.broadcastFields = [];

        // Add a checkbox for all windows
        for(var key2=0; key2 < this.pains.length; key2++) {
            (function(p2) {
                // Create and store the checkbox
                var tick = $('<input>', {
                    type: 'checkbox',
                    mouseover: function() {
                        p2.highlightThis(true);
                    },
                    mouseout: function() {
                        p2.highlightThis(false);
                    }
                });

                // Check if the tick is needed
                if(p == p2) {
                    var a = $('<div class="broadcastSelf">');

                    p.broadcast.append(a);

                    a.append(tick);
                    p.broadcastFields.push(tick);
                } else {
                    p.broadcast.append(tick);
                    p.broadcastFields.push(tick);
                }

                // Copy in old value
                if(values.length > 0) {
                    tick.prop('checked', values.shift());
                }
            })(this.pains[key2]);
        }


        // ADD NAMES


        // Build a list of previous values
        var values = [];
        for(var b = 0; b < p.addNameFields.length; b++) {
            if(ignoreID == null || ignoreID != b) {
                values.push(p.addNameFields[b].is(':checked'));
            }
        }

        // Empty the broadcast holder
        p.addName.empty();
        p.addNameFields = [];

        // Add a checkbox for all windows
        for(var key2=0; key2 < this.pains.length; key2++) {
            (function(p2) {
                // Create and store the checkbox
                var tick = $('<input>', {
                    type: 'checkbox',
                    mouseover: function() {
                        p2.highlightThis(true);
                    },
                    mouseout: function() {
                        p2.highlightThis(false);
                    }
                });

                // Check if the tick is needed
                if(p == p2) {
                    var a = $('<div class="broadcastSelf">');

                    p.addName.append(a);

                    a.append(tick);
                    p.addNameFields.push(tick);
                } else {
                    p.addName.append(tick);
                    p.addNameFields.push(tick);
                }

                // Copy in old value
                if(values.length > 0) {
                    tick.prop('checked', values.shift());
                }
            })(this.pains[key2]);
        }
    }
}

// Finds a pain by client_id
painMap.prototype.findByID = function(client_id, remove) {
    // Loop over all pains
    for(var key in this.pains) {
        // Grab the pain
        var p = this.pains[key];

        // Check if this is the one we were looking for
        if(p.getClientId() == client_id) {
            // Check if we need to remove it
            if(remove) {
                // Remove the pain
                this.pains.splice(key, 1);
            }

            return p;
        }
    }

    // Nothing found
    return null;
}

// Finds a pain by client_id
painMap.prototype.findByPainID = function(painID, remove) {
    // Loop over all pains
    for(var key in this.pains) {
        // Grab the pain
        var p = this.pains[key];

        // Check if this is the one we were looking for
        if(p.painID == painID) {
            // Check if we need to remove it
            if(remove) {
                // Remove the pain
                this.pains.splice(key, 1);
            }

            return p;
        }
    }

    // Nothing found
    return null;
}

// Finds a slotID
painMap.prototype.findSlotByPainID = function(painID) {
    // Loop over all pains
    for(var key in this.pains) {
        // Grab the pain
        var p = this.pains[key];

        // Check if this is the one we were looking for
        if(p.painID == painID) {
            return key;
        }
    }

    // Nothing found
    return null;
}

// Handles a dodgy proxy
painMap.prototype.conFailedProxy = function(painID) {
    var p = this.findSlotByPainID(painID);
    if(!p) return;

    // Unhook
    p.connected = false;
    p.updateClientId();

    // Section off
    p.addLineBreak();

    // Reset border color
    p.updateTalking(false);

    // Reset messages
    p.resetCallbacks();

    // New ID
    if(p.newID.is(':checked')) {
        // Get a new randID
        p.newRandid();
    }

    // Should we reroll?
    if(p.roll.is(':checked')) {
        // Create a connection
        p.createConnection();
    } else {
        // Reset button
        p.updateButton('New', 'btn-primary');
    }
}

// Disconnects someone
painMap.prototype.doDisconnect = function(client_id, name, altMessage) {
    // Find and remove the pain
    var p = this.findByID(client_id);
    if(!p) return;

    name = name || 'The stranger';

    // Unhook
    p.connected = false;
    p.updateClientId();

    // Print the connected time
    p.printTimeConnected();

    // Add message to chat
    if(altMessage) {
        p.addTextLine(altMessage);
    } else {
        p.addTextLine(htmlEntities(name)+' has disconnected!');
    }

    // Add the option to generate a log
    p.generateLogOption();

    // Section off
    p.addLineBreak();

    // Reset border color
    p.updateTalking(false);

    // Disconnect on the server
    p.socket.emit('omegleDisconnect', client_id);

    // Should we broadcast?
    /*if(p.addName.is(':checked')) {
        // Send the message to everyone
        p.broadcastMessage(p.name+' has disconnected!');
    }*/

    // Reset messages
    p.resetCallbacks();

    // New ID
    if(p.newID.is(':checked')) {
        // Get a new randID
        p.newRandid();
    }

    // Should we reroll?
    if(p.roll.is(':checked')) {
        // Create a connection
        p.createConnection();
    } else {
        // Reset button
        p.updateButton('New', 'btn-primary');
    }
}

// Updates the times in pains
painMap.prototype.updateTimes = function() {
    // Loop over all pains
    for(var key in this.pains) {
        // Grab the pain
        var p = this.pains[key];

        if(p) {
            p.updateTime();
        }
    }

    // Update the times again in 100ms
    var _this = this;
    setTimeout(function() {
        _this.updateTimes();
    }, 100);
}

// The total number of pains
var totalPains = 0;

// Creates a new pain
function pain() {}

pain.prototype.setup = function(socket) {
    // If we are connected or not
    this.connected = false;

    // If we are reconnecting or not
    this.reconnecting = false;

    // If we are searching or not
    this.searching = false;

    // Store the socket
    this.socket = socket;

    // Store the painID
    this.painID = ++totalPains;

    // Store the messageID
    this.messageID = 0;

    // Store callbacks
    this.resetCallbacks();

    // Generate a new random ID
    this.newRandid();

    // Caches messages for log generation
    this.messageCache = [];

    /*
        Create and setup the interface
    */

    var mainCon = $('#mainCon');

    this.container = $('<div>', {
        class: 'omegleContainer'
    });
    mainCon.append(this.container);

    //var tr = $('<tr>');
    //this.container.append(tr);

    //var td = $('<td>');
    //tr.append(td);

    var flashCon = $('<div class="flashCon">')
        .hide()
        .appendTo(this.container);
    //td.append(flashCon);

    this.flash = $('<object type="application/x-shockwave-flash" data="flash/webcams.swf" width="400" height="240" id="flash'+this.painID+'">');
    this.flash.html('<param name="wmode" value="transparent">');
    flashCon.append(this.flash);

    // Grab a reference to the pain
    var pain = this;

    // Give a short delay for it to load, then send painID
    var painID = this.painID;
    var flash = document.getElementById("flash"+this.painID);
    var initFlash;

    // Function to setup flash
    initFlash = function() {
        // Check if it exists yet
        if(flash.setPainID) {
            // Pass variables
            flash.setPainID(painID, omegleVideoServer, omegleVideoServerPassword);
        } else {
            // Try again shortly
            setTimeout(initFlash, 100);
        }
    }

    // Attempt to setup flash
    initFlash();

    //tr = $('<tr>').appendTo(this.container);

    td = $('<div>', {
        class: 'omegleWindowContainer'
    }).appendTo(this.container);

    this.close = $('<div>', {
        class: 'omegleClose',
        text: 'x',
        click: function() {
            // Check if the window was closed
            if(confirm('Are you sure you want to close this window?')) {
                // Clean up the pain
                pain.cleanup();
            }
        }
    }).appendTo(td);

    this.field = $('<div>', {
        class: 'omegleWindow'
    }).appendTo(td);

    //tr = $('<tr>').appendTo(this.container);

    //this.con = $('<td>').appendTo(tr);

    this.con = $('<div>', {
        class: 'bottomContainer'
    }).appendTo(this.container);

    this.debugField = $('<div>', {
        class: 'form-control omegleDebugField'
    }).appendTo(this.con);

    this.input = $('<textarea>', {
        class: 'form-control omegleField'
    }).appendTo(this.con);

    var buttonHolderTable = $('<tr>').appendTo(
        $('<table>', {
            class: 'buttonHolderTable'
        }).appendTo(this.con)
    );

    var buttonHolder = $('<td>').appendTo(buttonHolderTable);
    var buttonHolder2 = $('<td>').appendTo(buttonHolderTable);

    this.button = $('<button>', {
        text: 'New',
        class: 'btn btn-primary fixedButton'
    }).appendTo(buttonHolder);

    $('<button>', {
        class: 'btn btn-danger',
        text: 'Blackhole',
        click: function() {
            // Fix the input
            pain.focusInput();

            if(pain.connected || pain.searching) {
                if(confirm('Are you sure you want to blackhole this conversation?')) {
                    // Do the blackhole
                    pain.blackhole();
                }
            }
        }
    }).appendTo(buttonHolder);

    this.send = $('<button>', {
        class: 'btn btn-primary',
        text: 'Send',
        click: function() {
            // Send the current message
            pain.sendCurrentMessage();
        }
    }).appendTo(buttonHolder);

    this.autoMessage = $('<textarea>', {
        class: 'form-control omegleAutoMessage',
        type: 'text',
        val: defaultAutoMessage
    }).appendTo(buttonHolder2);

    this.fieldClientId = $('<input>', {
        class: 'form-control omegleClientId',
        type: 'text',
        val: ''
    }).appendTo(buttonHolder2);

    // Helper button container
    var helperButtonRow = $('<div>', {
        class: 'helperButtonRow'
    }).appendTo(buttonHolder);

    // Clear chat
    $('<button>', {
        text: 'Clear Chat',
        class: 'btn btn-danger smallButton',
        click: function() {
            // Fix the input
            pain.focusInput();

            pain.field.empty();
        }
    }).appendTo(helperButtonRow);

    // Prevent Auto Disconnect
    pain.btnAutoDisconnect = $('<button>', {
        text: 'Prevent Auto Disconnect',
        class: 'btn btn-success smallButton',
        click: function() {
            // Prevent auto disconnect
            pain.preventAutoDisconnect();

            // Fix the input
            pain.focusInput();
        }
    }).appendTo(helperButtonRow);

    //this.nameField = $('<textarea class="nameField">');
    //this.con.append(this.nameField);

    var topRow = $('<div>').appendTo(this.con);

    this.roll = $('<input>', {
        id: 'roll' + this.painID,
        type: 'checkbox',
        checked: omegleSettings.reroll
    }).prependTo(
        $('<label>', {
            for: 'roll' + this.painID,
            text: 'Reroll'
        }).appendTo(topRow)
    );

    // Add the moderated button
    this.addModeratedButton(topRow);

    this.nameField = $('<textarea>', {
        class: 'form-control nameField',
        type: 'text',
        val: 'Stranger '+this.painID
    }).appendTo(topRow);

    this.timeField = $('<textarea>', {
        class: 'form-control timeField',
        type: 'text'
    }).appendTo(topRow);

    var middleRow = $('<div>').appendTo(this.con);

    // Spy mode option
    this.spy = $('<input>', {
        id: 'spy' + this.painID,
        type: 'checkbox',
        checked: omegleSettings.spy
    }).prependTo(
        $('<label>', {
            for: 'spy' + this.painID,
            text: 'Spy'
        }).appendTo(middleRow)
    );

    // Ask question option
    this.ask = $('<input>', {
        id: 'ask' + this.painID,
        type: 'checkbox',
        checked: omegleSettings.ask
    }).prependTo(
        $('<label>', {
            for: 'ask' + this.painID,
            text: 'Ask'
        }).appendTo(middleRow)
    );

    // Use likes
    this.useLikes = $('<input>', {
        id: 'likes' + this.painID,
        type: 'checkbox',
        checked: omegleSettings.likes
    }).prependTo(
        $('<label>', {
            for: 'likes' + this.painID,
            text: 'Use Likes'
        }).appendTo(middleRow)
    );

    // College
    this.college = $('<input>', {
        id: 'college' + this.painID,
        type: 'checkbox',
        checked: omegleSettings.useCollege
    }).prependTo(
        $('<label>', {
            for: 'college' + this.painID,
            text: 'College'
        }).appendTo(middleRow)
    );

    // Any College
    this.anyCollge = $('<input>', {
        id: 'any' + this.painID,
        type: 'checkbox',
        checkbox: 'omegleSettings.anyCollge'
    }).prependTo(
        $('<label>', {
            for: 'any' + this.painID,
            text: 'Any College'
        }).appendTo(middleRow)
    );

    var bottomRow = $('<div>').appendTo(this.con);

    // New ID
    this.newID = $('<input>', {
        id: 'newID' + this.painID,
        type: 'checkbox',
        change: function() {
            // Get a new randID
            pain.newRandid();
        }
    }).prependTo(
        $('<label>', {
            for: 'newID' + this.painID,
            text: 'NewID'
        }).appendTo(bottomRow)
    );

    // Auto Broadcast
    this.autoBroadcast = $('<input>', {
        id: 'autoBroadcast' + this.painID,
        type: 'checkbox',
        checked: true
    }).prependTo(
        $('<label>', {
            for: 'autoBroadcast' + this.painID,
            text: 'Auto Broadcast'
        }).appendTo(bottomRow)
    );

    // Ignore Bots
    this.ignoreBots = $('<input>', {
        id: 'ignoreBots' + this.painID,
        type: 'checkbox',
        checked: true
    }).prependTo(
        $('<label>', {
            for: 'ignoreBots' + this.painID,
            text: 'Ignore Bots'
        }).appendTo(bottomRow)
    );

    // Video Options
    this.video = $('<input>', {
        id: 'video' + this.painID,
        type: 'checkbox',
        change: function() {
            // Hide or unhide the video stuff
            if(this.checked) {
                flashCon.show();
                pain.container.addClass('videoEnabled');
            } else {
                flashCon.hide();
                pain.camSelector.hide();
                pain.micSelector.hide();
                pain.container.removeClass('videoEnabled');
            }
        },
        checked: omegleSettings.video
    }).prependTo(
        $('<label>', {
            for: 'video' + this.painID,
                text: 'Video'
        }).appendTo(bottomRow)
    );

    // Should we show the video stuff?
    if(omegleSettings.video) {
        flashCon.show();
    }

    // Append selectors
    this.camSelector = $('<select>', {
        class: 'form-control',
        change: function() {
            document.getElementById('flash' + painID)
                .setCameraName(
                    $(this).find(':selected').index().toString()
                );
        }
    }).appendTo(this.con).hide();

    this.micSelector = $('<select>', {
        class: 'form-control',
        change: function() {
            document.getElementById('flash' + painID)
                .setMicID(
                    $(this).find(':selected').index()
                );
        }
    }).appendTo(this.con).hide();

    this.con.append($('<label>').text('B:'));
    this.broadcast = $('<div class="omegleBroadcast">');
    this.con.append(this.broadcast);

    this.con.append($('<br>'));

    this.con.append($('<label>').text('A:'));
    this.addName = $('<div class="omegleBroadcast">');
    this.con.append(this.addName);

    this.con.append($('<br>'));

    this.topicField = $('<textarea class="topicField">');
    this.con.append(this.topicField);
    this.topicField.val(defaultTopics);

    this.broadcastFields = [];
    this.addNameFields = [];

    // Hook new/disconnect button
    pain.hookButtons();

    // Hook press enter to send
    pain.input.on('keydown', function(e) {
        if (e.which == 13 && ! e.shiftKey) {
            // Send the current message
            pain.sendCurrentMessage();
        }
    });

    // Remove annoying new lines
    pain.input.on('keyup', function(e) {
        if (e.which == 13 && ! e.shiftKey) {
            // Grab the txt
            var txt = pain.input.val();

            // Remove new lines from the end
            while(txt.length > 0 && txt.charAt(txt.length-1) == '\n') {
                txt = txt.substr(0, txt.length-1);
            }

            // Reset the field
            pain.input.val(txt);

            // If the field is empty, stop typing!
            if(txt == '') {
                pain.stopTyping();
            }
        }
    });

    // Hook the typing
    pain.input.on('change keyup paste', function(e) {
        // Ignore enter
        if (e.which == 13) return;

        // Grab the text
        var txt = $(this).val();

        if(txt == '') {
            // Empty text, no longer typing
            pain.stopTyping();
        } else {
            // A string
            pain.startTyping();
        }
    });

    // The ID of our connected client
    this.updateClientId();
}

pain.prototype.focusInput = function() {
    this.input.focus();
};

// Makes this hilighted
pain.prototype.highlightThis = function(shouldHighlight) {
    if(shouldHighlight) {
        this.container.addClass('highlight');
    } else {
        this.container.removeClass('highlight');
    }
}

// Cleans up a pain
pain.prototype.cleanup = function() {
    // Ask the controller to clean us up
    this.painMap.cleanup(this.painID);
}

// Resets all callbacks
pain.prototype.resetCallbacks = function() {
    // Cleanup old callbacks
    if(this.messageCallback) {
        for(var key in this.messageCallback) {
            // Message failed to send
            this.messageCallback[key](false);
        }
    }

    // Reset the callbacks
    this.messageCallback = {};
}

// Hooks the buttons
pain.prototype.hookButtons = function() {
    // Grab a reference to this
    var pain = this;

    // Hook new/disconnect button
    pain.button.click(function() {
        // No longer talking
        pain.updateTalking(false);

        if(pain.connected) {
            // We need to disconnect

            // Confirm the D/C
            if(pain.confirmDisconnect) {
                // Discconect
                pain.disconnect();
            } else {
                // Confirm the D/C
                pain.updateButton('Confirm', 'btn-danger');
                pain.confirmDisconnect = true;
            }
        } else if(pain.searching) {
            // We need to cancel our search

            // Discconect
            pain.disconnect();
        } else {
            // We need to create a connection

            pain.createConnection();
        }
    });
}

// Creates a connectiom for this pain
pain.prototype.createConnection = function() {
    // We are now searching
    this.searching = true;

    // Allow auto messages
    this.dontAutoSend = false;

    // Allow auto D/C
    this.wontAutoDisconnect = false;
    this.btnAutoDisconnect.prop('disabled', false);

    // Reset message callbacks
    this.resetCallbacks();

    // Unmoderated option
    var group;
    if(!this.moderated.is(':checked')) {
        group = 'unmon';
    }

    // List of parameters
    var params = {
        painID: this.painID,
        topics: this.getTopics(),
        randid: this.randid,
        group: group
    };

    // Spy mode
    if(this.spy.is(':checked')) {
        // We want spy mode
        params.wantsspy = 1;

        // Are we asking a question
        if(this.ask.is(':checked')) {
            params.ask = this.autoMessage.val();
        }
    }

    // College stuff
    if(this.college.is(':checked')) {
        // Ensure they have the correct settings
        if(omegleSettings.college && omegleSettings.college_auth) {
            // Copy in params
            params.college = omegleSettings.college;
            params.college_auth = omegleSettings.college_auth;

            // Do we use any college
            if(this.anyCollge.is(':checked')) {
                params.any_college = 1;
            }
        } else {
            // Tell the user
            this.addTextLine('You need to add <b>college</b> and <b>college_auth</b> to your omegleSettings in static/js/settings.js');
        }
    }

    // Copy in extra stuff
    if(omegleSettings.bonusParams) {
        for(var key in omegleSettings.bonusParams) {
            params[key] = omegleSettings.bonusParams[key];
        }
    }

    // Do we have a camera? (and want webcam mode)
    if(this.video.is(':checked') && this.peerID) {
        params.spid = this.peerID;
        params.camera = "USB 2.0 Web Camera";
    }

    // Check if we should limit the connection or not
    if(!this.painMap.limitedSearching) {
        params.forceSearch = true;
    }

    // Send the request
    this.socket.emit('newOmegle', params);

    // Add a message
    this.addTextLine('Creating a connection...');

    // Change text
    this.updateButton('Cancel Search', 'btn-danger');
}

// Reconnects when a connection to our server fails
pain.prototype.reconnect = function() {
    // Are we still connected?
    if(this.connected) {
        // We are attempting to reconnect
        this.reconnecting = true;

        // Attempt to reconnect this session
        this.socket.emit('reconnectOmegle', {
            painID: this.painID,
            client_id: this.getClientId()
        });
    }
}

pain.prototype.updateClientId = function(newClientId) {
    // Store the change
    //this.client_id = newClientId();

    // Update the value
    this.fieldClientId.val(newClientId || '');
};

pain.prototype.getClientId = function(newClientId) {
    // Store the change
    //this.client_id = newClientId();

    // Update the value
    try {
        var theVal = this.fieldClientId.val();
    } catch(e) {
        return null;
    }

    if(theVal == '') {
        return null;
    } else {
        return theVal;
    }
};

// Sends out the auto message after the given delay
pain.prototype.sendAutoMessage = function(client_id, delay) {
    // Grab a reference to self
    var p = this;

    // Grab any auto text messages
    var txt = p.autoMessage.val();

    // Do we have an auto message?
    if(txt != '' && !p.ask.is(':checked')) {
        // Start typing
        p.startTyping();

        // Give a short delay before sending the message
        setTimeout(function() {
            // Check if the same client is connected
            if(p.getClientId() == client_id && !p.dontAutoSend) {
                // Get the updated message
                var txt = p.autoMessage.val();

                // Add it to our log
                var highlight = p.addTextLine('<font color="blue">Auto:</font> '+htmlEntities(txt), txt, 'Me');

                // Send the message
                p.sendMessage(txt, highlight);
            }
        }, delay);
    }
}

// Auto disconnects after the given delay, if the stranger hasn't started typing
pain.prototype.autoDisconnect = function(client_id, delay, delay2) {
    // Grab a reference to self
    var p = this;

    // Should we auto disconnect?
    if(p.ignoreBots.is(':checked')) {
        // Give a short delay before sending the message
        setTimeout(function() {
            // Check if the same client is connected
            if(p.getClientId() == client_id && !p.hasTyped && !p.hasSpoken && p.ignoreBots.is(':checked') && !p.wontAutoDisconnect) {
                // Disconnect
                p.painMap.doDisconnect(client_id, null, 'Disconnected: Slow responder or bot.');
                return;
            }
        }, delay);

        // Give a short delay before sending the message
        setTimeout(function() {
            // Check if the same client is connected
            if(p.getClientId() == client_id && !p.hasSpoken && p.ignoreBots.is(':checked') && !p.wontAutoDisconnect) {
                // Disconnect
                p.painMap.doDisconnect(client_id, null, 'Disconnected: Slow responder or bot.');
                return;
            }
        }, delay2);
    }
}

// Generates a new randid
pain.prototype.newRandid = function() {
    // Should we notify the user
    if(this.randid != null) {
        this.addTextLine('Allocated a new randID.');
    }

    this.randid = '';
    var randData = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    for(var i=0; i<8; i++) {
        this.randid += randData.charAt(Math.floor(Math.random() * randData.length));
    }
}

// Returns this pain's topics (as an array)
pain.prototype.getTopics = function() {
    if(!this.useLikes.is(':checked'))  {
        return
    }

    // Grab the topics field's value
    var val = this.topicField.val();

    // If there is nothing in it, don't use topics
    if(val.length == 0) return;

    // Return the topics
    return val.split(',');
}

// Updates a button
pain.prototype.updateButton = function(newText, newClass) {
    // Update the text
    this.button.text(newText);

    // Remove the old class
    if(this.button.oldClass) {
        this.button.removeClass(this.button.oldClass);
    }

    // Add the new class
    this.button.oldClass = newClass;
    this.button.addClass(newClass);
}

// Starts typing on a given controller
pain.prototype.startTyping = function() {
    if(this.connected && !this.isTyping) {
        // Send the message
        this.socket.emit('omegleTyping', this.getClientId());

        // This channel is now typing
        this.isTyping = true;
    }
}

// Stops typing
pain.prototype.stopTyping = function() {
    if(this.connected && this.isTyping) {
        this.socket.emit('omegleStopTyping', this.getClientId());
    }

    this.isTyping = false;
}

// Updates the talking state of this pain
pain.prototype.updateTalking = function(talking) {
    if(talking) {
        // They are talking
        this.input.css({
            border: '4px solid #000'
        });

        // Mark this window as a "real person"
        this.hasTyped = true;
    } else {
        // They are no longer talking
        this.input.css({
            border: '4px solid #AAA'
        });
    }
}

pain.prototype.debugEvent = function(reason) {
    this.debugLastEvent = new Date();

    this.debugField.prepend(
        $('<div>', {
            text: niceTime(true) + ' - ' + reason
        })
    );
};

// Sends a message to the given controller
pain.prototype.sendMessage = function(msg, highlight) {
    // Ensure we are connected
    if(this.captcha) {
        // Send captcha
        this.socket.emit('omegleChallenge', this.code, this.challenge, msg);

        // No longer asking for a captcha
        this.captcha = false;
    } else if(this.connected) {
        // Do highlighting
        var myNum;
        if(highlight) {
            // Grab a new ID
            myNum = ++this.messageID;

            // Store callback
            this.messageCallback[myNum] = function(success) {
                if(success) {
                    // Mark it as successful
                    highlight.css({
                        'background-color': ''
                    });
                } else {
                    // Mark it as a failure
                    highlight.css({
                        'background-color': '#c0504d'
                    });
                }
            }

            // Mark it as sending
            highlight.css({
                'background-color': '#9bbb59'
            });
        }

        // Send the message
        this.socket.emit('omegleSend', this.getClientId(), msg, myNum);
    }

    // This controller is no longer typing
    this.isTyping = false;

    // Fire the stop talking event
    this.stopTyping();

    // No need to confirm anymore
    if(this.connected) {
        this.updateButton('Disconnect', 'btn-danger');
        this.confirmDisconnect = false;
    }
}

// Option to genereate a log file
pain.prototype.generateLogOption = function() {
    // Add a powered by message
    this.messageCache.unshift(['Powered by https://github.com/ash47/OmegleMiddleMan']);

    var cache = JSON.stringify(this.messageCache);

    // Clear message cache
    this.messageCache = [];

    var shouldScroll = false;
    if(Math.ceil(this.field.scrollTop() + this.field.innerHeight()) >= Math.floor(this.field.prop('scrollHeight'))) {
        shouldScroll = true;
    }

    var _this = this;

    // Add the message
    var cacheContainer = $('<pre>')
        .append(
            $('<a>', {
                text: 'Click here to generate a chat log',
                click: function() {
                    var ourCacheNumber = ++totalCached;
                    cacheCallbacks[ourCacheNumber] = cacheContainer;
                    cacheContainer.text('Generating log...');
                    _this.socket.emit('omegleLog', ourCacheNumber, cache);
                    cache = null;
                }
            })
        )
        .appendTo(this.field);

    // Scroll to the bottom:
    if(shouldScroll) {
        this.field.scrollTop(this.field.prop('scrollHeight'));
    }
}

// Broadcasts a message to everyone this controller is set to broadcast to
pain.prototype.broadcastMessage = function(msg, override, nameOverride) {
    var pains = this.painMap.pains;

    // Ensure auto broadcast is on
    if(!this.autoBroadcast.is(':checked') && !override) return;

    // Loop over all pains
    for(var i=0; i<pains.length; i++) {
        // Attempt to grab a pain
        var p = pains[i];
        if(p && p.connected && !p.captcha) {
            // Attempt to grab the tick that coorosponds with it
            var tick = this.broadcastFields[i];
            var tick2 = this.addNameFields[i];
            if(tick && tick2) {
                // Check if it's ticked
                if(tick.is(':checked')) {
                    // Add name?
                    if(tick2.is(':checked') && !nameOverride) {
                        // Add it to our log
                        var highlight = p.addTextLine('<font color="blue">Broadcasted:</font> '+this.getPrefix()+htmlEntities(msg), msg, 'Broadcasted');

                        // Send the message
                        p.sendMessage(this.getPrefix()+msg, highlight);
                    } else {
                        // Add it to our log
                        var highlight = p.addTextLine('<font color="blue">Broadcasted:</font> '+htmlEntities(msg), msg, 'Broadcasted');

                        // Send the message
                        p.sendMessage(msg, highlight);
                    }
                }
            }
        }
    }
}

// Broadcasts a message to everyone this controller is set to broadcast to
pain.prototype.broadcastTyping = function() {
    var pains = this.painMap.pains;

    // Loop over all pains
    for(var i=0; i<pains.length; i++) {
        // Attempt to grab a pain
        var p = pains[i];
        if(p) {
            // Attempt to grab the tick that coorosponds with it
            var tick = this.broadcastFields[i];
            if(tick) {
                // Check if it's ticked
                if(tick.is(':checked')) {
                    // Send the message
                    p.startTyping();
                }
            }
        }
    }
}

// Adds a line of text
pain.prototype.addTextLine = function(msg, raw, prefix) {
    // Scroll detection
    var shouldScroll = false;
    if(Math.ceil(this.field.scrollTop() + this.field.innerHeight()) >= Math.floor(this.field.prop('scrollHeight'))) {
        shouldScroll = true;
    }

    var canRaw = true;
    if(raw == null) {
        raw = msg;
        canRaw = false;
    }

    // Add to our log
    var rawCacheMsg = htmlEntities(raw).replace(/&/g,'%26');
    if(!prefix) {
        this.messageCache.push([rawCacheMsg]);
    } else {
        var pp = prefix
        if(prefix == 'Me') pp = 'You';

        this.messageCache.push([pp + ':', rawCacheMsg]);
    }

    // The return value
    var ret;

    // Patch the msg
    var pos = msg.indexOf('</font>');
    if(pos != -1) {
        var left = msg.substring(0, pos+7);
        var right = msg.substring(pos+7);

        msg = '<div class="chatMain"><div class="chatLeft">' + left + '</div>' + right + '</div>';
    }

    // Add the message
    var pre = $('<pre>');
    this.field.append(pre.html(msg));

    var tbl = $('.chatLeft', pre);
    if(tbl.length > 0) {
        pre = tbl.first();
    }

    // Add the time
    pre.attr('title', niceTime());

    // Check if there is a raw container
    if(canRaw) {
        var thisPain = this;

        // Crete the send button
        ret = $('<span>', {
            class: 'easySend',
            html: '<b>&gt;</b>'
        }).click(function() {
            // Decide how to send the message
            if(prefix == 'Me') {
                thisPain.broadcastMessage(raw, true, true);
            } else {
                thisPain.broadcastMessage(raw, true);
            }
        });

        // Add the send button
        pre.prepend(ret);
    }

    // Scroll to the bottom:
    if(shouldScroll) {
        this.field.scrollTop(this.field.prop('scrollHeight'));
    }

    // Return it
    return ret;
}

// Adds a line break
pain.prototype.addLineBreak = function() {
    var shouldScroll = false;
    if(Math.ceil(this.field.scrollTop() + this.field.innerHeight()) >= Math.floor(this.field.prop('scrollHeight'))) {
        shouldScroll = true;
    }

    this.field.append($('<hr>'));

    // Scroll to the bottom:
    if(shouldScroll) {
        this.field.scrollTop(this.field.prop("scrollHeight"));
    }
}

// Disconnects if we are connected
pain.prototype.disconnect = function() {
    // Check if we are already connected
    if(this.connected || this.searching) {
        // Disconnect
        this.socket.emit('omegleDisconnect', this.getClientId(), this.painID);
    }

    // Reset vars
    this.connected = false;
    this.searching = false;
    this.updateClientId();
    this.reconnecting = false;

    // Cleanup callbacks
    this.resetCallbacks();

    // Change text
    this.updateButton('New', 'btn-primary');

    // Print time connected
    this.printTimeConnected();

    // Add a message
    this.addTextLine('You have disconnected!');

    // Add the option to generate a log
    this.generateLogOption();

    // Section off
    this.addLineBreak();

    // New ID
    if(this.newID.is(':checked')) {
        // Get a new randID
        this.newRandid();
    }
}

// Attempts to send the current message
pain.prototype.sendCurrentMessage = function() {
    // Grab the txt and reset the field
    var txt = this.input.val();

    // Reset the field
    this.input.val('');

    // Remove new lines from the end
    while(txt.length > 0 && txt.charAt(txt.length-1) == '\n') {
        txt = txt.substr(0, txt.length-1);
    }

    // Do we have a message?
    if(txt != '') {
        // Add it to our log
        var highlight = this.addTextLine('<font color="blue">You:</font> '+htmlEntities(txt), txt, 'Me');

        // Send the message
        this.sendMessage(txt, highlight);

        // Confirm the D/C
        if(this.connected) {
            this.updateButton('Disconnect', 'btn-danger');
            this.confirmDisconnect = false;
        }

        // Prevent auto disconnect
        this.preventAutoDisconnect();
    }
};

// Prevent auto disconnect
pain.prototype.preventAutoDisconnect = function() {
    this.wontAutoDisconnect = true;
    this.btnAutoDisconnect.prop('disabled', true);
};

// Performs a blackhole
pain.prototype.blackhole = function(reason) {
    // Check if we are already connected
    if(this.connected || this.searching) {
        // Disconnect
        this.socket.emit('omegleBlackhole', this.getClientId(), this.painID);
    }

    // Reset vars
    this.connected = false;
    this.searching = false;
    this.updateClientId();
    this.reconnecting = false;

    // Cleanup callbacks
    this.resetCallbacks();

    // Change text
    this.updateButton('New', 'btn-primary');

    // Print time connected
    this.printTimeConnected();

    var extra = '';
    if(reason) {
        extra = ' Reason: ' + reason;
    }

    // Add a message
    this.addTextLine('You have disconnected! Stranger was blackholed.' + extra);

    // Logging option
    this.generateLogOption();

    // Break
    this.addLineBreak();

    // Reset messages
    this.resetCallbacks();

    // New ID
    if(this.newID.is(':checked')) {
        // Get a new randID
        this.newRandid();
    }

    // Should we reroll?
    if(this.roll.is(':checked')) {
        // Create a connection
        this.createConnection();
    } else {
        // Reset button
        this.updateButton('New', 'btn-primary');
    }
}

// Returns the prefix for this pain
pain.prototype.getPrefix = function() {
    return this.getName() + ': ';
}

// Returns the name for this pain
pain.prototype.getName = function() {
    return this.nameField.val();
}

// Calculates how long we have been connected
pain.prototype.getTimeConnected = function() {
    var time = (new Date().getTime()) - this.startTime;

    // Convert to seconds
    return Math.floor(time / 1000);
}

// Prints the time we have been connected
pain.prototype.printTimeConnected = function() {
    if(this.startTime != null) {
        // Workout how long we have been connected
        var time = (new Date().getTime()) - this.startTime;

        // Convert to something useful
        var min = (time/1000/60) << 0;
        var sec = Math.floor((time/1000) % 60);

        // Build nice minute handler
        var minCon = '';
        if(min > 0) {
            if(min > 1) {
                minCon = min+' minutes and ';
            } else {
                minCon = '1 minute and ';
            }
        }

        // Build nice second handler
        var secCon = sec+' seconds.';
        if(sec == 1) {
            secCon = '1 second.'
        }

        // Log it
        this.addTextLine('Connected for '+minCon+secCon);
    }
}

// Adds a moderate option button
pain.prototype.addModeratedButton = function(topRow) {
    this.moderated = $('<input>', {
        id: 'mod' + this.painID,
        type: 'checkbox',
        checked: omegleSettings.moderated
    }).prependTo(
        $('<label>', {
            for: 'mod' + this.painID,
            text: 'Moderated'
        }).appendTo(topRow)
    );
}

// Updates the time display for this window
pain.prototype.updateTime = function() {
    if(!this.startTime || !this.connected) return;

    // Workout how long we have been connected
    var time = (new Date().getTime()) - this.startTime;

    // Convert to something useful
    var hrs = (time/1000/60/60) << 0;
    var min = ((time/1000/60) << 0) % 60;
    var sec = Math.floor((time/1000) % 60);

    // Build the hour handler
    var hrCon = '';
    if(hrs > 0) {
        hrCon = hrs+'h ';
    }

    // Build nice minute handler
    var minCon = '';
    if(min > 0) {
        minCon = min+'m ';
    }

    // Build nice second handler
    var secCon = '';
    if(sec > 0) {
        secCon = sec+'s';
    }

    // Log it
    this.timeField.val(hrCon+minCon+secCon);
}

/*
    Helper Pain
*/

function helperPain() {};
helperPain.prototype = new pain();

helperPain.prototype.setup = function() {
    // Disable broadcast stuff
    this.noBroadcast = true;

    // Grab the main con
    var mainCon = $('#mainCon');

    this.container = $('<table>', {
        class: 'chatHelperContainer'
    }).appendTo(mainCon);

    // Container for x
    var td = $('<td>', {
        class: 'closeButtonHolder'
    }).appendTo(
        $('<tr>').appendTo(this.container)
    )

    // Container for text strings
    this.textStringCon = $('<table>', {
        class: 'chatHelperStringTable'
    }).appendTo(
        $('<div>').appendTo(
            $('<div>', {
                class: 'chatHelperForceScrollParent'
            }).appendTo(
                $('<td>', {
                    class: 'chatHelperMain'
                }).appendTo(
                    $('<tr>').appendTo(this.container)
                )
            )
        )
    );

    // A store for stuff
    this.messageList = [];

    var _this = this;

    // Lower control buttons
    $('<tr>').append(
        $('<td>', {
            class: 'chatHelperBottomButtonCon'
        }).append(
            $('<button>', {
                class: 'btn btn-primary',
                text: 'Add Message',
                click: function() {
                    _this.addHelper();
                }
            })
        )
        .append(
            $('<button>', {
                class: 'btn btn-primary chatHelperBottomButtonConMargin',
                text: 'Import Messages',
                click: function() {
                    _this.doImport();
                }
            })
        )
        .append(
            $('<button>', {
                class: 'btn btn-primary',
                text: 'Export Messages',
                click: function() {
                    _this.doExport();
                }
            })
        )
    ).appendTo(this.container);

    // Add close button
    $('<div>', {
        class: 'omegleClose alt',
        text: 'x',
        click: function() {
            // Check if the window was closed
            if(confirm('Are you sure you want to close this window?')) {
                // Clean up the pain
                _this.cleanup();
            }
        }
    }).appendTo(td);
}

// Do an export
helperPain.prototype.doExport = function() {
    var allItems = [];

    for(var i=0; i<this.messageList.length; ++i) {
        var messageItem = this.messageList[i].inputHelper.val().trim();

        if(messageItem.length > 0) {
            allItems.push(messageItem);
        }
    }

    var outputString = JSON.stringify(allItems);

    prompt('Export String:', outputString);
}

// Do an import
helperPain.prototype.doImport = function() {
    try {
        // Cleanup
        this.textStringCon.empty();
        this.messageList = [];

        var msg = prompt('Import String:', '');

        if(msg && msg.length > 0) {
            var res = JSON.parse(msg);

            for(var i=0; i<res.length; ++i) {
                this.addHelper(res[i]);
            }
        }
    } catch(e) {
        // Do nothing
    }
}

// Adds a helper button
helperPain.prototype.addHelper = function(msg) {
    var infoCon = $('<tr>').appendTo(this.textStringCon);
    var buttonCon = $('<td>', {
        class: 'chatHelperButtonCon'
    }).appendTo(infoCon);
    var textCon = $('<td>', {
        class: 'chatHelperInput'
    }).appendTo(infoCon);

    var inputHelper = $('<textarea>', {
        type: 'text',
        class: 'chatHelperInput form-control'
    }).appendTo(textCon);

    if(msg) {
        inputHelper.val(msg);
    }

    this.messageList.push({
        buttonCon: buttonCon,
        inputHelper: inputHelper
    });

    this.rebuildButtons();
}

// Reloads / creates the braodcast buttons
helperPain.prototype.rebuildButtons = function() {
    var allPains = this.painMap.pains;

    for(var i=0; i<this.messageList.length; ++i) {
        // Create a new scope
        (function(buttonCon, inputHelper) {
            // Cleanup
            buttonCon.empty();

            for(var key=0; key < allPains.length; key++) {
                // Grab a key
                var p = allPains[key];

                // Does this pain not support broadcast?
                if(p.noBroadcast) continue;

                // Create a new scope
                (function(painID, pain) {
                    $('<button>', {
                        class: 'btn btn-primary smallerChatButton',
                        text: (painID+1),
                        click: function() {
                            // focus the input field of this pain
                            pain.focusInput();

                            var myMessage = inputHelper.val().trim();

                            var _this = $(this);

                            if(myMessage.length > 0) {
                                // Do replacements
                                myMessage = myMessage.replace(/\{\{name\}\}/g, pain.getName() || '');

                                // Start typing
                                pain.startTyping();

                                // Change the color
                                _this.addClass('btn-danger');
                                _this.removeClass('btn-primary');
                                _this.prop('disabled', true);
                                pain.highlightThis(false);

                                var delay = 300 + 60 * myMessage.length;
                                setTimeout(function() {
                                    var shouldScroll = false;
                                    if(Math.ceil(pain.field.scrollTop() + pain.field.innerHeight()) >= Math.floor(pain.field.prop('scrollHeight'))) {
                                        shouldScroll = true;
                                    }

                                    // Add it to our log
                                    var highlight = pain.addTextLine('<font color="blue">Broadcasted:</font> ' + htmlEntities(myMessage), myMessage, 'Broadcasted');

                                    // Send the message
                                    pain.sendMessage(myMessage, highlight);

                                    if(shouldScroll) {
                                        pain.field.scrollTop(pain.field.prop('scrollHeight'));
                                    }

                                    // Reset the color
                                    _this.removeClass('btn-danger');
                                    _this.addClass('btn-primary');
                                    _this.prop('disabled', false);;
                                }, delay);
                            }
                        },
                        mouseover: function() {
                            pain.highlightThis(true);
                        },
                        mouseout: function() {
                            pain.highlightThis(false);
                        }
                    }).appendTo(buttonCon);
                })(key, p);
            }
        })(this.messageList[i].buttonCon, this.messageList[i].inputHelper);
    }
}

helperPain.prototype.onbroadcastChanged = function() {
    this.rebuildButtons();
}

helperPain.prototype.addTextLine = function() {
    // do nothing
}

/*
    Cleverbot pain
*/

function cleverPain() {};
cleverPain.prototype = new pain();

// Creates a connectiom for this pain
cleverPain.prototype.createConnection = function() {
    // We are now searching
    this.searching = true;
    this.socket.emit('newClever', {
        painID: this.painID
    });

    // Add a message
    this.addTextLine('Creating a connection...');

    // Change text
    this.updateButton('Cancel Search', 'btn-danger');
}

// Sends a message to the given controller
cleverPain.prototype.sendMessage = function(msg) {
    // Ensure we are connected
    if(this.connected) {
        // Send the message
        this.socket.emit('cleverSend', this.getClientId(), msg);

        // Show that they're talking
        this.updateTalking(true);

        // Tell others
        this.broadcastTyping();
    }

    // This controller is no longer typing
    this.isTyping = false;
}

// Called when we want to disconnect from a cleverbot
cleverPain.prototype.disconnect = function() {
    // Check if we are already connected
    if(this.connected) {
        // Disconnect
        this.socket.emit('cleverDisconnect', this.getClientId());
    }

    // Reset vars
    this.connected = false;
    this.searching = false;
    this.reconnecting = false;
    this.updateClientId();

    // Change text
    this.updateButton('New', 'btn-primary');

    // Print time connected
    this.printTimeConnected();

    // Add a message
    this.addTextLine('You have disconnected!');
    this.addLineBreak();
}

// Add the modereted (actually a delayed) button
cleverPain.prototype.addModeratedButton = function() {
    this.con.append($('<label for="mod'+this.painID+'">').text('Delayed:'));
    this.moderated = $('<input id="mod'+this.painID+'">').attr('type', 'checkbox').prop('checked', omegleSettings.delayed);
    this.con.append(this.moderated);
}

// Adds commas to numbers
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// The main pain map
var mainPainMap;

// peerID stuff for streaming video
function setPeerID(painID, newPeerID) {
    // Pass the event
    mainPainMap.setPeerID(painID, newPeerID);
}

// Returns the currnt time, formatted nicely
function niceTime(addSeconds) {
    var months = {
        0: 'January',
        1: 'Febuary',
        2: 'March',
        3: 'April',
        4: 'May',
        5: 'June',
        6: 'July',
        7: 'August',
        8: 'September',
        9: 'October',
        10: 'November',
        11: 'December',
    }

    // Grab teh current time
    var d = new Date();

    // Grab the minutes, formatted correctly
    var minutes = d.getMinutes();
    if(minutes < 10) {
        minutes = '0' + minutes;
    }

    var seconds = '';
    if(addSeconds) {
        var dateSeconds = d.getSeconds();
        if(dateSeconds < 10) dateSeconds = '0' + dateSeconds;
        seconds = ':' + dateSeconds;
    }

    // Format the time nicely
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getHours() + ':' + minutes + seconds;
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Set all camera sizes
function setCameraSize(width, height, fps, quality) {
    mainPainMap.setCameraSize(width, height, fps, quality);
}



$(document).ready(function(){
    // Create the pain manager
    mainPainMap = new painMap();
    mainPainMap.limitSearching(true);

    // Hook the new window buttons
    $('#newOmegleWindow').click(function() {
        // Setup a new pain
        mainPainMap.setupOmeglePain();
    });

    $('#newCleverBot').click(function() {
        // Setup a new pain
        mainPainMap.setupCleverBotPain();
    });

    $('#newChatHelper').click(function() {
        // Setup a new pain
        mainPainMap.setupChatHelper();
    });

    $('#limitSearching').click(function() {
        // Toggle the limited searchingness
        mainPainMap.limitSearching($(this).is(':checked'));
    });

    // Bypassing captcha
    $('#bypassCaptcha').click(function() {
        if($(this).is(':checked')) {
            mainPainMap.socket.emit('newProxy');
        } else {
            mainPainMap.socket.emit('disableProxy');
        }
    });

    // Stop accidental navigation away
    window.onbeforeunload = function() {
        var message = "Are you sure?";

        if (confirm(message)) {
            return true;
        } else {
            return false;
        }
    }

    // Manage the window focus
    $(window).focus(function() {
        // Gained focus
        windowFocused = true;

        // Reset website title
        mainPainMap.notifications();
    }).blur(function() {
        // Lost Focus
        windowFocused = false;
    });

    // Set the website title
    document.title = websiteTitle;
});
