var Cleverbot = require('../lib/cleverbot');
var CBots = [new Cleverbot,new Cleverbot]
  , i = 0
  , name = ['Bob Loblaw', 'Stan Sitwell']
  , callback = function callback(resp){
    CBots[i].write(resp['message'],callback);
    console.log(name[i = ( ( i + 1 ) %2)],' : ',  resp['message'])
  };

callback({message:'Just a small town girl'})
