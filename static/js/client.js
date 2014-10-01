/*
    Client
*/

// Default message to auto send
//var defaultAutoMessage = 'Hi! You\'re talking to multiple people! Type /commands for a list of commands. Any messages that start with a slash will not be sent to other users.';
var defaultAutoMessage = 'hi';

// Default topics
var defaultTopics = [
    'doctor who',
    'harry potter',
    'south park',
    'family guy',
    'american dad',
    'the simpsons',
    'rick and morty',
    'multiRP',
    'noMultiRP',
    'firsttime1',
    'gingerfirsttime',
    'breaking bad',
    'supernatural',
    'soul eater',
    'jackandjess',
    'Supernatural',
    'zoemonster',
    'KiraHatesCats'
].join();

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

    // Handle disconnect
    pMap.socket.on('disconnect', function () {
        // Add disconnect to all pains
        for(var key in pMap.pains) {
            // Grab the container
            var p = pMap.pains[key];

            // Tell the client
            p.addTextLine('Lost connection to the server :(');
        }
    });

    // Server created a new omegle instance for us
    pMap.socket.on('newOmegle', function(client_id, args) {
        // Search for a new pain
        var found = false;
        for(var key in pMap.pains) {
            // Grab the container
            var p = pMap.pains[key];

            if(p.searching && p.painID == args.painID) {
                // Found a connection
                p.searching = false;
                p.connected = true;
                p.client_id = client_id;
                p.confirmDisconnect = false;

                // Create the text
                p.updateButton('Disconnect');

                // We have found a match
                found = true;
                break;
            }
        }

        // Did we find a pain that needed it?
        if(!found) {
            // Unwanted connection, just drop it
            pMap.socket.emit('omegleDisconnect', client_id);
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
                p.client_id = client_id;

                // Create the text
                p.updateButton('Disconnect');

                // Tell the user
                p.addTextLine('Cleverbot has connected!');

                // Update name
                p.name = 'Cleverbot';
                p.nameField.val(p.name);

                // Auto send message
                p.sendAutoMessage(client_id, 500);

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
    pMap.socket.on('omegleConnected', function(client_id) {
        var p = pMap.findByID(client_id);

        // Increase total number of connections
        pMap.totalConnections++;

        if(p) {
            p.addTextLine('A stranger was connected!');

            // Auto send message
            p.sendAutoMessage(client_id, 1500);

            // Generate a new name
            p.name = 'Stranger '+pMap.totalConnections;
            p.prefix = p.name+': ';

            // Store their name
            p.nameField.val(p.name);

            // Tell them their name
            //sendMessage(con, 'You are known as: '+con.name);

            // Add the name
            var msg = p.name+' has connected!';

            // Should we broadcast?
            if(p.addName.is(':checked')) {
                p.broadcastMessage(msg);
            }
        }
    });

    // Omegle is telling us our common likes
    pMap.socket.on('omegleCommonLikes', function(client_id, commonLikes) {
        var p = pMap.findByID(client_id);

        if(p) {
            // Loop over the likes
            for(var key in commonLikes) {
                if(commonLikes[key].toLowerCase() == 'nomultirp') {
                    // Disconnect
                    pMap.doDisconnect(client_id);
                    return;
                }
            }

            // Display the likes
            p.addTextLine('The stranger likes '+commonLikes.toString());
        }
    });

    // Stranger has disconnected
    pMap.socket.on('omegleStrangerDisconnected', function(client_id) {
        // Do it
        pMap.doDisconnect(client_id);
    });

    // We got a message
    pMap.socket.on('omegleGotMessage', function(client_id, msg) {
        var p = pMap.findByID(client_id);

        if(p) {
            // They are no longer typing
            p.updateTalking(false);

            // Add the message
            p.addTextLine('<font color="red">Stranger:</font> '+msg);

            // Check for commands
            //if(processCommands(con, msg)) return;

            // Check if we should add a prefix
            if(p.addName.is(':checked')) {
                msg = p.prefix + msg;
            }

            // Broadcast it
            p.broadcastMessage(msg);
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

    // We have disconnected
    pMap.socket.on('omegleDisconnected', function(client_id) {
        var p = pMap.findByID(client_id);

        if(p) {
            p.addTextLine('You have disconnected!');

            // Unhook
            p.connected = false;
            p.client_id = null;

            // Reset button
            p.updateButton('New');

            // Disconnect on the server
            p.socket.emit('omegleDisconnect', client_id);
        }
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
}

painMap.prototype.updateBroadcast = function() {
    for(var key=0; key < this.pains.length; key++) {
        // Grab a key
        var p = this.pains[key];

        // Build a list of previous values
        var values = [];
        for(var b = 0; b < p.broadcastFields.length; b++) {
            values.push(p.broadcastFields[b].is(':checked'));
        }

        // Empty the broadcast holder
        p.broadcast.empty();
        p.broadcastFields = [];

        // Add a checkbox for all windows
        for(var key2=0; key2 < this.pains.length; key2++) {
            var p2 = this.pains[key2];

            // Create and store the checkbox
            var tick = $('<input type="checkbox">');
            p.broadcast.append(tick);
            p.broadcastFields.push(tick);

            // Check if the tick is needed
            if(p == p2) {
                // Disable the checkbox
                tick.prop("disabled", true);
            }

            // Copy in old value
            if(values.length > 0) {
                tick.prop('checked', values.shift());
            }
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
        if(p.client_id == client_id) {
            // Check if we need to remove it
            if(remove) {
                // Remove the pain
                this.pains.splice(key);
            }

            return p;
        }
    }

    // Nothing found
    return null;
}

// Disconnects someone
painMap.prototype.doDisconnect = function(client_id) {
    // Find and remove the pain
    var p = this.findByID(client_id);
    if(!p) return;

    // Unhook
    p.connected = false;
    p.client_id = null;

    // Add message to chat
    p.addTextLine('The stranger has disconnected!<br><br>');

    // Reset border color
    p.updateTalking(false);

    // Disconnect on the server
    p.socket.emit('omegleDisconnect', client_id);

    // Should we broadcast?
    if(p.addName.is(':checked')) {
        // Send the message to everyone
        p.broadcastMessage(p.name+' has disconnected!');
    }

    // Should we reroll?
    if(p.roll.is(':checked')) {
        // Create a connection
        p.createConnection();
    } else {
        // Reset button
        p.updateButton('New');
    }
}

// The total number of pains
var totalPains = 0;

// Creates a new pain
function pain() {}

pain.prototype.setup = function(socket) {
    // The ID of our connected client
    this.client_id = null;

    // If we are connected or not
    this.connected = false;

    // If we are searching or not
    this.searching = false;

    // Store the socket
    this.socket = socket;

    // Store the painID
    this.painID = ++totalPains;

    // Generate a new random ID
    this.newRandid();

    /*
        Create and setup the interface
    */

    var mainCon = $('#mainCon');

    this.con = $('<div class="omegleContainer">');
    mainCon.append(this.con);

    this.field = $('<div class="omegleWindow">');
    this.con.append(this.field);

    this.input = $('<textarea class="omegleField">');
    this.con.append(this.input);

    this.button = $('<input>').attr('type', 'submit').attr('value', 'New');
    this.con.append(this.button);

    this.send = $('<input>').attr('type', 'submit').attr('value', 'Send');
    this.con.append(this.send);

    this.autoMessage = $('<textarea class="omegleAutoMessage">').attr('type', 'text').val(defaultAutoMessage);
    this.con.append(this.autoMessage);

    this.nameField = $('<textarea class="nameField">');
    this.con.append(this.nameField);

    this.con.append($('<br>'));

    this.con.append($('<label>').text('Reroll:'));
    this.roll = $('<input>').attr('type', 'checkbox');
    this.con.append(this.roll);

    this.con.append($('<label>').text('Add Name:'));
    this.addName = $('<input>').attr('type', 'checkbox');
    this.con.append(this.addName);

    this.con.append($('<label>').text('Broadcast:'));
    this.broadcast = $('<div class="omegleBroadcast">');
    this.con.append(this.broadcast);

    this.topicField = $('<textarea class="topicField">');
    this.con.append(this.topicField);
    this.topicField.val(defaultTopics);

    this.broadcastFields = [];

    // Grab a reference to the pain
    var pain = this;

    // Hook new/disconnect button
    pain.hookButtons();

    // Hook the typing
    pain.input.on('change keyup paste', function() {
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

    // Hook press enter to send
    pain.input.on('keyup', function(e) {
        if (e.which == 13 && ! e.shiftKey) {
            // Grab the txt and reset the field
            var txt = pain.input.val();

            // Remove new lines from the end
            while(txt.length > 0 && txt.charAt(txt.length-1) == '\n') {
                txt = txt.substr(0, txt.length-1);
            }


            pain.input.val('');

            // Do we have a message?
            if(txt != '') {
                // Send the message
                pain.sendMessage(txt);

                // Add it to our log
                pain.addTextLine('<font color="blue">You:</font> '+txt);

                // Confirm the D/C
                pain.updateButton('Disconnect');
                pain.confirmDisconnect = false;
            }
        }
    });

    // Hook send button
    pain.send.click(function() {
        // Ensure we are connected
        if(pain.connected) {
            // Grab the txt and reset the field
            var txt = pain.input.val();
            pain.input.val('');

            // Do we have a message?
            if(txt != '') {
                // Send the message
                pain.sendMessage(txt);

                // Add it to our log
                pain.addTextLine('<font color="blue">You:</font> '+txt);

                // Confirm the D/C
                pain.updateButton('Disconnect');
                pain.confirmDisconnect = false;
            }
        }
    });
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

                // Change text
                pain.updateButton('New');

                // Add a message
                pain.addTextLine('You have disconnected!<br><br>');
            } else {
                // Confirm the D/C
                pain.updateButton('Confirm');
                pain.confirmDisconnect = true;
            }
        } else if(pain.searching) {
            // We need to cancel our search

            // Discconect
            pain.disconnect();

            // Change text
            pain.updateButton('New');

            // Add a message
            pain.addTextLine('Cancelled search!<br><br>');
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
    this.socket.emit('newOmegle', {
        painID: this.painID,
        topics: this.getTopics(),
        randid: this.randid
    });

    // Add a message
    this.addTextLine('Creating a connection...');

    // Change text
    this.updateButton('Cancel Search');
}

// Sends out the auto message after the given delay
pain.prototype.sendAutoMessage = function(client_id, delay) {
    // Grab a reference to self
    var p = this;

    // Grab any auto text messages
    var txt = p.autoMessage.val();

    // Do we have an auto message?
    if(txt != '') {
        // Start typing
        p.startTyping();

        // Give a short delay before sending the message
        setTimeout(function() {
            // Check if the same client is connected
            if(p.client_id == client_id) {
                // Send the message
                p.sendMessage(txt);

                // Add it to our log
                p.addTextLine('<font color="blue">Auto:</font> '+txt);
            }
        }, delay);
    }
}

// Generates a new randid
pain.prototype.newRandid = function() {
    this.randid = '';
    var randData = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    for(var i=0; i<8; i++) {
        this.randid += randData.charAt(Math.floor(Math.random() * randData.length));
    }
}

// Returns this pain's topics (as an array)
pain.prototype.getTopics = function() {
    // Return the topics
    return this.topicField.val().split(',');
}

// Updates a button
pain.prototype.updateButton = function(newText) {
    // Update the text
    this.button.attr('value' ,newText);
}

// Starts typing on a given controller
pain.prototype.startTyping = function() {
    if(this.connected && !this.isTyping) {
        // Send the message
        this.socket.emit('omegleTyping', this.client_id);

        // This channel is now typing
        this.isTyping = true;
    }
}

// Stops typing
pain.prototype.stopTyping = function() {
    if(this.connected && this.isTyping) {
        this.socket.emit('omegleStopTyping', this.client_id);
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
    } else {
        // They are no longer talking
        this.input.css({
            border: '4px solid #AAA'
        });
    }
}

// Sends a message to the given controller
pain.prototype.sendMessage = function(msg) {
    // Ensure we are connected
    if(this.connected) {
        // Send the message
        this.socket.emit('omegleSend', this.client_id, msg);
    }

    // This controller is no longer typing
    this.isTyping = false;

    // No need to confirm anymore
    this.confirmDisconnect = false;
}

// Broadcasts a message to everyone this controller is set to broadcast to
pain.prototype.broadcastMessage = function(msg) {
    var pains = this.painMap.pains;

    // Loop over all pains
    for(var i=0; i<pains.length; i++) {
        // Attempt to grab a pain
        var p = pains[i];
        if(p && p != this && p.connected) {
            // Attempt to grab the tick that coorosponds with it
            var tick = this.broadcastFields[i];
            if(tick) {
                // Check if it's ticked
                if(tick.is(':checked')) {
                    // Send the message
                    p.sendMessage(msg);

                    // Add it to our log
                    p.addTextLine('<font color="blue">Broadcasted:</font> '+msg);
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
        if(p && p != this) {
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
pain.prototype.addTextLine = function(msg) {
    this.field.append($('<li>').html(msg));

    // Scroll to the bottom:
    this.field.scrollTop(this.field.prop("scrollHeight"));
}

// Disconnects if we are connected
pain.prototype.disconnect = function() {
    // Check if we are already connected
    if(this.connected) {
        // Disconnect
        this.socket.emit('omegleDisconnect', this.client_id);
    }

    // Reset vars
    this.connected = false;
    this.searching = false;
    this.client_id = null;
}

/*
    Cleverbot pain
*/

function cleverPain() {}
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
    this.updateButton('Cancel Search');
}

// Sends a message to the given controller
cleverPain.prototype.sendMessage = function(msg) {
    // Ensure we are connected
    if(this.connected) {
        // Send the message
        this.socket.emit('cleverSend', this.client_id, msg);

        // Show that they're talking
        this.updateTalking(true);

        // Tell others
        this.broadcastTyping();
    }

    // This controller is no longer typing
    this.isTyping = false;
}

// Called when we want to disconnect from a cleverbot
pain.prototype.disconnect = function() {
    // Check if we are already connected
    if(this.connected) {
        // Disconnect
        this.socket.emit('cleverDisconnect', this.client_id);
    }

    // Reset vars
    this.connected = false;
    this.searching = false;
    this.client_id = null;
}

$(document).ready(function(){
    // Create the pain manager
    var pains = new painMap();

    // Hook the new window buttons
    $('#newOmegleWindow').click(function() {
        // Setup a new pain
        pains.setupOmeglePain();
    });

    $('#newCleverBot').click(function() {
        // Setup a new pain
        pains.setupCleverBotPain();
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
});
