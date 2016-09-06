'use strict';

var http = require('http');
var https = require('https');
var certs = require('localhost.daplie.com-certificates');
var express = require('express');
var app = express();
var plainServer = http.createServer(app);

var fs = require('fs');
var RSA = require('rsa-compat').RSA;
var config = require('./config.js');


function serve(keypair) {
  var path = require('path');
  var pokeapp = require('./').create({ keypair: keypair });
  var serveStatic = express.static(path.join(__dirname, 'public', 'static'));

  app.use('/', pokeapp);
  app.use('/static', serveStatic);
  app.use('/', serveStatic);


  plainServer.listen(process.env.PORT || 3000, function () {
    console.log('Listening on http://127.0.0.1:' + plainServer.address().port);
  });
}


//
// Generate an RSA key for signing sessions, if it doesn't exist
//
console.log('Checking for existing RSA private key to secure login sessions...');
fs.readFile(config.rsaKeyPath, 'ascii', function (err, privkey) {
  if (!err) {
    console.log('RSA private key found, using it.');
    serve({ privateKeyPem: privkey, publicKeyPem: RSA.exportPublicPem({ privateKeyPem: privkey }) });
    return;
  }

  console.log('Generating an RSA 1024-bit key to secure login sessions...');
  if (!RSA._URSA && /arm|mips/i.test(require('os').arch)) {
    console.log("");
    console.log("You're on a slow computer so this process could take dozens of minutes.");
    console.log("If you're a technical person, try doing this instead:");
    console.log("");
    console.log("openssl genrsa -out '" + require('path').join(__dirname, 'privkey.pem') + "' 1024");
    console.log("");
  }

  RSA.generateKeypair(1024, 65537, { pem: true, public: true }, function (err, keypair) {
    console.log('Generated 1024-bit RSA key.');
    fs.writeFile(config.rsaKeyPath, keypair.privateKeyPem, 'ascii', function (err) {
      if (err) {
        console.error(err);
        return;
      }

      console.log('Generated and saved 1024-bit RSA key.');
      serve(keypair);
    });
  });
});
