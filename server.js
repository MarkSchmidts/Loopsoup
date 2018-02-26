function isNumber(obj) { return !isNaN(parseFloat(obj)) }

var htdocs_folder = 'app',
port = 8080;


var url='https://localhost:'+port;

console.log("serving target folder \"" + htdocs_folder+"\"");
console.log("at port "+port);
console.log("url: "+url);

var express = require('express');

var fs = require('fs');
var securityOptions = {
    key: fs.readFileSync('certs/key.pem'),
    cert: fs.readFileSync('certs/certificate.pem'),
    requestCert: true
};
var app = express();
var enableCORS = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization, Content-Length');
    //res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.sendStatus(200);
    }
    else {
      next();
    }
};
app.use(enableCORS);
var secureServer = require('https').createServer(securityOptions, app);
app.use('/', express.static("./"));

secureServer.listen(port);

var open = require('open');
open(url+"/"+htdocs_folder);
