var Omegle = require('./omegle.js').Omegle;

// Create a new omegle instance
var om = new Omegle({
    topics: [
        'doctor who'
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
    console.log("Got message: " + msg);

    // Send their message back
    om.send(msg, function(err) {
        if (err) {
            console.log("Error send " + err);
        }
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