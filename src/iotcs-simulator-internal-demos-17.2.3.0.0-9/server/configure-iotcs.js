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

var path = require('path');
var services = require('./services');
var setup = services.setup;
var iotcs = require('../' + setup.clientlibrary.dir + '/enterprise-library.node.js');

function updateTAS() {
  iotcs = iotcs({debug: true});
  // We are using test server: we need to override CN verification because of test server certificate
  require('tls').checkServerIdentity = function() {};

  var currentConfig;
  try {
    currentConfig = require('../' + setup.clientlibrary.dir + '/' + iotcs.oracle.iot.tam.store);
  } catch (e) {
    currentConfig = {'serverHost': '', 'serverPort': 0};
  }

  if ((currentConfig.serverHost !== setup.server.host) || (currentConfig.serverPort !== setup.server.port)) {
    console.log('updating TAS');
    iotcs.enterprise.TrustedAssetsManager.provision(
      __dirname + '/../' + setup.clientlibrary.dir + '/' + iotcs.oracle.iot.tam.store,
      'changeit',
      setup.server.host, setup.server.port);
  } else {
    console.log('TAS unchanged');
  }
}

function getClientTAS(simulatorHost) {
  var currentConfig;
  var storeBaseName = path.basename(iotcs.oracle.iot.tam.store, '.json');
  var clientStoreName = storeBaseName + '-client.json';
  var hostname = setup.server.virtualbox ? simulatorHost : setup.server.host;
  try {
    currentConfig = require('../' + setup.clientlibrary.dir + '/' + clientStoreName);
  } catch (e) {
    currentConfig = {'serverHost': '', 'serverPort': 0};
  }

  if ((currentConfig.serverHost !== hostname) || (currentConfig.serverPort !== setup.server.port)) {
    console.log('updating TAS');
    iotcs.enterprise.TrustedAssetsManager.provision(
      __dirname + '/../' + setup.clientlibrary.dir + '/' + clientStoreName,
      'changeit',
      hostname, setup.server.port);
  } else {
    console.log('Client TAS unchanged');
  }
  return clientStoreName;
}

module.exports = {
  updateTAS: updateTAS,
  getClientTAS: getClientTAS
};
