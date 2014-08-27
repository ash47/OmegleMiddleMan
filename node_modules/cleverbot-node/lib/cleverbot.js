var crypto = require('crypto')
  , http = require('http')
  , Cleverbot = function(){
      this.params = Cleverbot.default_params;
    };

Cleverbot.default_params = {
  'stimulus'         : '' , 'start'      : 'y'    , 'sessionid' : '',
  'vText8'           : '' , 'vText7'     : ''     , 'vText6' : '',
  'vText5'           : '' , 'vText4'     : ''     , 'vText3' : '',
  'vText2'           : '' , 'icognoid'   : 'wsf'  , 'icognocheck' : '',
  'fno'              : '0', 'prevref'    : ''     , 'emotionaloutput' : '',
  'emotionalhistory' : '' , 'asbotname'  : ''     , 'ttsvoice' : '',
  'typing'           : '' , 'lineref'    : ''     , 'sub' : 'Say',
  'islearning'       : '1', 'cleanslate' : 'false',
};
Cleverbot.parserKeys = [
  'message', 'sessionid', 'logurl', 'vText8',
  'vText7', 'vText6', 'vText5', 'vText4',
  'vText3', 'vText2', 'prevref', '',
  'emotionalhistory', 'ttsLocMP3', 'ttsLocTXT', 'ttsLocTXT3',
  'ttsText', 'lineref', 'lineURL', 'linePOST',
  'lineChoices', 'lineChoicesAbbrev', 'typingData', 'divert'
];
Cleverbot.digest = function(body){
  var m = crypto.createHash('md5');
  m.update(body)
  return m.digest('hex');
};

Cleverbot.encodeParams = function(a1){
  var u=[];
  for(x in a1){
    if(a1[x] instanceof Array)
      u.push(x+"="+encodeURIComponent(a1[x].join(",")));
    else if(a1[x] instanceof Object)
      u.push(params(a1[x]));
    else
      u.push(x+"="+encodeURIComponent(a1[x]));
  }
  return u.join("&");
};

Cleverbot.prototype = {

  write : function(message,callback){
    var clever = this;
    body = this.params;
    body.stimulus = message;
    body.icognocheck = Cleverbot.digest(Cleverbot.encodeParams(body).substring(9,35));
    var options = {
      host: 'www.cleverbot.com',
      port: 80,
      path: '/webservicemin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Cleverbot.encodeParams(body).length,
        'Cache-Control': 'no-cache'
      }
    };
    var req = http.request(options, function(res) {
      var cb = callback || function(){};
      res.on('data', function(chunk) {
        var chunk_data = chunk.toString().split("\r")
          , responseHash = {};
        for(var i = 0, iLen = chunk_data.length;i<iLen;i++){
          clever.params[Cleverbot.parserKeys[i]] = responseHash[Cleverbot.parserKeys[i]] = chunk_data[i];
        }
        if (res.statusCode >= 300) responseHash.message = 'Error: ' + res.statusCode;
        cb(responseHash);
      });
     });
    req.write(Cleverbot.encodeParams(body));
    req.end();
  }
};

module.exports = Cleverbot;
