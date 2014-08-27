/*
    Client
*/

// Adds text into a container
function addTextLine(con, msg) {
    con.append($('<li>').html(msg));
}

$(document).ready(function(){
    // Create the socket
    var socket = io();

    // Stores connection states
    var cons = {
        left: {
            con: $('#leftCon'),
            field: $('#leftPain'),
            button: $('#leftButton'),
            send: $('#leftSend'),
            input: $('#leftInput'),
        },
        right: {
            con: $('#rightCon'),
            field: $('#rightPain'),
            button: $('#rightButton'),
            send: $('#rightSend'),
            input: $('#rightInput'),
        }
    };

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
        if(conMap[client_id]) {
            addTextLine(conMap[client_id].field, 'A stranger was connected!');
        }
    });

    // Omegle is telling us our common likes
    socket.on('omegleCommonLikes', function(client_id, common_likes) {
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

            // Reset button
            con.button.attr('value' ,'New');

            // Disconnect on the server
            socket.emit('omegleDisconnect', client_id);
        }
    });

    // We got a message
    socket.on('omegleGotMessage', function(client_id, msg) {
        var con = conMap[client_id];

        if(con != null) {
            addTextLine(con.field, '<font color="red">Stranger:</font> '+msg);

            for(var key in con.broadcast) {
                if(con.broadcast[key] != null) {
                    var bt = cons[key];

                    // Make sure we are connected
                    if(bt.connected) {
                        // Send the message
                        socket.emit('omegleSend', bt.client_id, msg);

                        // Add it to our log
                        addTextLine(bt.field, '<font color="blue">Broadcasted:</font> '+msg);
                    }
                }
            }
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
        Hook buttons
    */

    for(var con in cons) {
        (function() {
            // Grab a reference to the con
            var thisCon = cons[con];

            // Hook new/disconnect button
            thisCon.button.click(function() {
                // Make sure we aren't already searching, etc
                if(!thisCon.connected && !thisCon.searching) {
                    thisCon.searching = true;
                    socket.emit('newOmegle');

                    // Change text
                    $(this).attr('value' ,'disconnect');
                } else {
                    // Check if we are already connected
                    if(thisCon.connected) {
                        // Disconnect
                        socket.emit('omegleDisconnect', thisCon.client_id);
                        thisCon.connected = false;
                        cons[con].searching = false;
                        thisCon.client_id = null;
                    }

                    // Change text
                    $(this).attr('value' ,'New');

                    // Add a message
                    addTextLine(thisCon.field, 'You have disconnected!');
                }
            });

            // Hook send button
            thisCon.send.click(function() {
                // Ensure we are connected
                if(thisCon.connected) {
                    // Grab the txt and reset the field
                    var txt = thisCon.input.val();
                    thisCon.input.val('');

                    // Do we have a message?
                    if(txt != '') {
                        // Send the message
                        socket.emit('omegleSend', thisCon.client_id, txt);

                        // Add it to our log
                        addTextLine(thisCon.field, '<font color="blue">You:</font> '+txt);
                    }
                }
            });

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
                    }
                })();
            }
        })();
    }
});
