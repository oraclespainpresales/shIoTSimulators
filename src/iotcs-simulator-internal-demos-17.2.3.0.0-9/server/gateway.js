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

var services = require('./services');

var Gateway = function(gwDevice) {
  var gw = this;
  gw.gwDevice = gwDevice;
  gw.registeredDevices = [];
  gw.id = gwDevice.getID();
  gwDevice.actualDevice = gw;
  gw.location = null;
  gw.icds = [];

  /**
   * Refreshes list of associated ICDs from IOT CS
   */
  gw.refreshICDs = function() {
    services.iot.getICDs(gw.id).then(function(response) {
      if (response && (response.items.length > 0)) {
        gw.icds = response.items.filter(function(item) {
          return item.state === 'ACTIVATED';
        }).map(function(item) {
          var icd = {
            'id': item.id,
            'hardwareId': item.hardwareId,
            'simulator': null,
            'deviceModels': item.deviceModels.map(function(dm) {
              return dm.name;
            }).join(', ')
          };
          var simDevice = services.simEngine.allDevices.find(function(device) {
            return device.id === item.id;
          });
          if (simDevice) {
            icd.simulator = simDevice.deviceName + ' ' + item.id;
          }
          return icd;
        });
      }
      services.io.emit('onGatewayInitialization', gw.externalize());
    });
  };

  services.iot.getDeviceLocation(gw.id).then(function(location) {
    gw.location = location;
    gw.refreshICDs();
  });

};

Gateway.prototype = {
  constructor: Gateway,
  deviceName: 'Gateway',
  simulatorId: 'gateway',
  modelURN: 'urn:oracle:iot:device:default',
  deviceModelsExtensions: [
    {
      urn: 'urn:oracle:iot:device:default'
    }
  ],
  externalize: function() {
    return {
      id: this.id,
      deviceName: this.deviceName,
      simulatorId: this.simulatorId,
      location: this.location,
      icds: this.icds
    };
  }
};

module.exports = Gateway;

