'use strict';

var http = require('http');
var app = require('./');
var server = http.createServer(app);

server.listen(3000, function () {
  console.log('server ready', server.address());
});
