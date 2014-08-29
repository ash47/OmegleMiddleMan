/*
    Client
*/

$(document).ready(function(){
    /*
        Settings
    */

    // Default message to auto send
    var defaultAutoMessage = 'Hi! How are you?';

    /*
        Setup chat
    */

    // Create the socket
    var socket = io();

    // Handle disconnect
    socket.on('disconnect', function () {
        alert('Lost connection to the server :(');
    });

    // Stores connection states
    var cons = [];

    // The total number of connections
    var totalConnections = 0;

    // Adds a new chat pain
    function addPain() {
        var mainCon = $('#mainCon');

        var con = $('<div class="omegleContainer">');
        mainCon.append(con);

        var field = $('<div class="omegleWindow">');
        con.append(field);

        var input = $('<textarea class="omegleField">');
        con.append(input);

        var button = $('<input>').attr('type', 'submit').attr('value', 'New');
        con.append(button);

        var send = $('<input>').attr('type', 'submit').attr('value', 'Send');
        con.append(send);

        var autoMessage = $('<textarea class="omegleAutoMessage">').attr('type', 'text').val(defaultAutoMessage);
        con.append(autoMessage);

        con.append($('<br>'));

        con.append($('<label>').text('Reroll:'));
        var roll = $('<input>').attr('type', 'checkbox');
        con.append(roll);

        con.append($('<label>').text('Add Name:'));
        var addName = $('<input>').attr('type', 'checkbox');
        con.append(addName);

        con.append($('<label>').text('Broadcast:'));

        // Create a reference
        var thisCon = {
            con: con,
            field: field,
            input: input,
            roll: roll,
            button: button,
            send: send,
            addName: addName,
            autoMessage: autoMessage,

            // Prefix for all broadcast messages
            prefix: ''
        }

        // Store it
        cons.push(thisCon);

        // Hook new/disconnect button
        button.click(function() {
            // Make sure we aren't already searching, etc
            if(!thisCon.connected && !thisCon.searching) {
                thisCon.searching = true;
                socket.emit('newOmegle');

                // Change text
                $(this).attr('value' ,'disconnect');
            } else {
                // Discconect
                disconnect(thisCon);

                // Change text
                $(this).attr('value' ,'New');

                // Add a message
                addTextLine(thisCon.field, 'You have disconnected!');

                // Reset border color
                con.input.css({
                    border: '4px solid #AAA'
                });
            }
        });

        // Hook the typing
        input.on('change keyup paste', function() {
            // Grab the text
            var txt = $(this).val();

            if(txt == '') {
                // Empty text, no longer typing
                stopTyping(thisCon);
            } else {
                // A string
                startTyping(thisCon);
            }
        });

        // Hook press enter to send
        input.on('keyup', function(e) {
            if (e.which == 13 && ! e.shiftKey) {
                // Grab the txt and reset the field
                var txt = thisCon.input.val();
                txt = txt.substr(0, txt.length-1)
                thisCon.input.val('');

                // Do we have a message?
                if(txt != '') {
                    // Send the message
                    sendMessage(thisCon, txt);

                    // Add it to our log
                    addTextLine(thisCon.field, '<font color="blue">You:</font> '+txt);
                }
            }
        });

        // Hook send button
        send.click(function() {
            // Ensure we are connected
            if(thisCon.connected) {
                // Grab the txt and reset the field
                var txt = thisCon.input.val();
                thisCon.input.val('');

                // Do we have a message?
                if(txt != '') {
                    // Send the message
                    sendMessage(thisCon, txt);

                    // Add it to our log
                    addTextLine(thisCon.field, '<font color="blue">You:</font> '+txt);
                }
            }
        });
    }

    // Spawn 5 windows
    for(var i=0; i<5; i++) {
        addPain();
    }

    // Adds text into a container
    function addTextLine(con, msg) {
        con.append($('<li>').html(msg));

        // Scroll to the bottom:
        con.scrollTop(con.prop("scrollHeight"));
    }

    // Sends a message to the given controller
    function sendMessage(con, msg) {
        // Send the message
        socket.emit('omegleSend', con.client_id, msg);

        // This controller is no longer typing
        con.isTyping = false;
    }

    // Starts typing on a given controller
    function startTyping(con) {
        if(!con.isTyping) {
            // Send the message
            socket.emit('omegleTyping', con.client_id);

            // This channel is now typing
            con.isTyping = true;
        }
    }

    // Stops typing
    function stopTyping(con) {
        if(con.isTyping) {
            con.isTyping = false;
            socket.emit('omegleStopTyping', con.client_id);
        }
    }

    // Disconnects a controller
    function disconnect(con) {
        // Check if we are already connected
        if(con.connected) {
            // Disconnect
            socket.emit('omegleDisconnect', con.client_id);
            con.connected = false;
            con.searching = false;
            con.client_id = null;
        }
    }

    // Map of connection to con above
    var conMap = {};

    /*
        Hook socket
    */

    // Server created a new omegle instance for us
    socket.on('newOmegle', function(client_id) {
        // Search for a new pain
        var found = false;
        for(var con in cons) {
            if(cons[con].searching) {
                // Left pain wanted it
                cons[con].searching = false;
                cons[con].connected = true;
                cons[con].client_id = client_id;
                conMap[client_id] = cons[con];

                // We have found a match
                found = true;
                break;
            }
        }

        // Did we find a pain that needed it?
        if(!found) {
            // Unwanted connection, just drop it
            socket.emit('omegleDisconnect', client_id);
        }
    });

    // Omegle is finding us a partner
    socket.on('omegleWaiting', function(client_id) {
        if(conMap[client_id]) {
            addTextLine(conMap[client_id].field, 'Searching for a stranger...');
        }
    });

    // Omegle connected us to someone
    socket.on('omegleConnected', function(client_id) {
        var con = conMap[client_id];

        // Increase total number of connections
        totalConnections++;

        if(con) {
            addTextLine(con.field, 'A stranger was connected!');

            // Grab any auto text messages
            var txt = con.autoMessage.val();

            // Do we have an auto message?
            if(txt != '') {
                // Send the message
                sendMessage(con, txt);

                // Add it to our log
                addTextLine(con.field, '<font color="blue">Auto:</font> '+txt);
            }

            // Generate a new name
            con.name = 'Stranger '+totalConnections;
            con.prefix = con.name+': ';

            // Add the name
            var msg = con.name+' has connected!';

            // Should we broadcast?
            if(con.addName.is(':checked')) {
                for(var key in con.broadcast) {
                    if(con.broadcast[key] != null) {
                        var bt = cons[key];

                        // Make sure we are connected
                        if(bt.connected) {
                            // Send the message
                            sendMessage(bt, msg);

                            // Add it to our log
                            addTextLine(bt.field, '<font color="blue">Broadcasted:</font> '+msg);
                        }
                    }
                }
            }
        }
    });

    // Omegle is telling us our common likes
    socket.on('omegleCommonLikes', function(client_id, commonLikes) {
        if(conMap[client_id]) {
            addTextLine(conMap[client_id].field, 'The stranger likes '+commonLikes.toString());
        }
    });

    // Stranger has disconnected
    socket.on('omegleStrangerDisconnected', function(client_id) {
        if(conMap[client_id]) {
            addTextLine(conMap[client_id].field, 'The stranger has disconnected!');

            // Unhook
            var con = conMap[client_id];
            conMap[client_id] = null;
            con.connected = false;
            con.client_id = null;

            // Reset border color
            con.input.css({
                border: '4px solid #AAA'
            });

            // Disconnect on the server
            socket.emit('omegleDisconnect', client_id);

            // Add the name
            var msg = con.name+' has disconnected!';

            // Should we broadcast?
            if(con.addName.is(':checked')) {
                for(var key in con.broadcast) {
                    if(con.broadcast[key] != null) {
                        var bt = cons[key];

                        // Make sure we are connected
                        if(bt.connected) {
                            // Send the message
                            sendMessage(bt, msg);

                            // Add it to our log
                            addTextLine(bt.field, '<font color="blue">Broadcasted:</font> '+msg);
                        }
                    }
                }
            }

            // Should we reroll?
            if(con.roll.is(':checked')) {
                // Set to searching
                con.searching = true;

                // Search
                socket.emit('newOmegle');
            } else {
                // Reset button
                con.button.attr('value' ,'New');
            }
        }
    });

    // We got a message
    socket.on('omegleGotMessage', function(client_id, msg) {
        var con = conMap[client_id];

        if(con != null) {
            // They are no longer typing
            con.input.css({
                border: '4px solid #AAA'
            });

            // Add the message
            addTextLine(con.field, '<font color="red">Stranger:</font> '+msg);

            for(var key in con.broadcast) {
                if(con.broadcast[key] != null) {
                    var bt = cons[key];

                    // Make sure we are connected
                    if(bt.connected) {
                        // Check if we should add a prefix
                        if(con.addName.is(':checked')) {
                            msg = con.prefix + msg;
                        }

                        // Send the message
                        sendMessage(bt, msg);

                        // Add it to our log
                        addTextLine(bt.field, '<font color="blue">Broadcasted:</font> '+msg);
                    }
                }
            }
        }
    });

    // Stranger started typing
    socket.on('omegleTyping', function(client_id) {
        var con = conMap[client_id];

        if(con != null) {
            con.input.css({
                border: '4px solid #000'
            });

            for(var key in con.broadcast) {
                if(con.broadcast[key] != null) {
                    var bt = cons[key];

                    // Make sure we are connected
                    if(bt.connected) {
                        startTyping(bt);
                    }
                }
            }
        }
    });

    // Stranger stops typing
    socket.on('omegleStoppedTyping', function(client_id) {
        var con = conMap[client_id];

        if(con != null) {
            con.input.css({
                border: '4px solid #AAA'
            });
        }
    });

    // We have disconnected
    socket.on('omegleDisconnected', function(client_id) {
        if(conMap[client_id]) {
            addTextLine(conMap[client_id].field, 'You have disconnected!');

            // Unhook
            var con = conMap[client_id];
            conMap[client_id] = null;
            con.connected = false;
            con.client_id = null;

            // Reset button
            con.button.attr('value' ,'New');

            // Disconnect on the server
            socket.emit('omegleDisconnect', client_id);
        }
    });

    /*
        Create broadcast buttons
    */

    for(var con in cons) {
        (function() {
            // Grab a reference to the con
            var thisCon = cons[con];

            // Reset broadcasters
            thisCon.broadcast = {};

            // Build broadcasters
            for(var con2 in cons) {
                (function() {
                    var thisCon2 = cons[con2];
                    var con3 = con2;

                    // Don't hook into ourself
                    if(thisCon2 != thisCon) {
                        var tick = $('<input type="checkbox">');
                        tick.change(function() {
                            if($(this).is(':checked')) {
                                // Store the broadcast
                                thisCon.broadcast[con3] = true;
                            } else {
                                // Remove the broadcast
                                thisCon.broadcast[con3] = null;
                            }
                        });

                        // Add the tick box
                        thisCon.con.append(tick);
                    } else {
                        thisCon.con.append($('<label>').text('_'));
                    }
                })();
            }
        })();
    }
});
