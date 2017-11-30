/**
 * Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */
/*jslint node: true */
'use strict';

var express = require('express');
var chalk = require('chalk');
var path = require('path');
var config = require('./config/environment');
var services = require('./services');

var app = express();
services.register('app', app);
var server = require('http').createServer(app);
services.register('server', server);
// This function will be called when the simulation engine is properly initialized
server.startListen = function() {

  server.listen(config.port, config.ip, function() {
    console.log(
      chalk.red('\nExpress server listening on port ') +
      chalk.yellow('%d') +
      chalk.red(', in ') +
      chalk.yellow('%s') +
      chalk.red(' mode.\n'),
      config.port,
      app.get('env')
    );

    if (config.env === 'development') {
      require('ripe').ready(null, null);
    }

  });
};

var io = require('socket.io')(server);
services.register('io', io);
var setup;
if (process.argv.length > 2) {
  var i;
  for (i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '-config') {
      i += 1;
      console.log('Using config file:', process.argv[i]);
      setup = require(path.resolve(process.cwd(), process.argv[i]));
    }
  }
}
if (!setup) {
  setup = require(path.resolve(__dirname, '../setup.json'));
}
services.register('setup', setup);
var dclLib = require('../' + setup.clientlibrary.dir + '/device-library.node.js');
services.register('dclLib', dclLib);
var utils = require('./utils');
services.register('utils', utils);
var restClient = require('./rest.client');
services.register('restClient', restClient);
//var IoTServer = require('./iot');
var iot = require('./iot');
//var iot = new IoTServer(setup.server.host, setup.server.port, setup.server.caCert);
//iot.setPrincipal(setup.server.user.name, setup.server.user.pwd);
services.register('iot', iot);
require('./simulation.engine');
// console.log(simEngine.simulatedDeviceTypes);

require('./config/express')(app);
require('./routes')();
//
// process.on('uncaughtException',function(error) {
//     // Avoid killing the process on network errors etc
//     console.log("Uncaught exception: " + error);
// });

module.exports = server;
