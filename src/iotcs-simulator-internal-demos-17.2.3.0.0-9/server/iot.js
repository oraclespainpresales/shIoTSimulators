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

// var fs = require('fs');
var services = require('./services');
var restClient = services.restClient;

/**
 * IoTClient can be used as a wrapper over RestClient, when some additional pre-processing is required.
 *
 * @type {{createDevice: IoTClient.createDevice, findValidDevice: IoTClient.findValidDevice,
 * getDeviceLocation: IoTClient.getDeviceLocation, getICDs: IoTClient.getICDs, createAsset: IoTClient.createAsset,
 * createApplication: IoTClient.createApplication, setDeviceSelection: IoTClient.setDeviceSelection,
 * addAppDeviceModel: IoTClient.addAppDeviceModel, checkVersion: IoTClient.checkVersion}}
 */
var IoTClient = {

  /**
   * Creates Device instance on the IoT Server
   *
   * @param {String} sharedSecret
   * @param {String} id
   * @param {String} name
   * @param {Object} metadata
   * @param {Object} location
   * @returns {Promise} promise object that should be resolved to newly created device data
   */
  createDevice: function(sharedSecret, id, name, metadata, location) {
    if (!sharedSecret) {
      throw new Error('Shared Secret is mandatory');
    }
    var sharedSecretBase64 = new Buffer(sharedSecret).toString('base64');
    var m = metadata || {};
    var time = new Date().getTime();
    var data = {
      hardwareId: id,
      sharedSecret: sharedSecretBase64,
      name: name || 'node-name' + time,
      description: m.description || 'node-description' + time,
      manufacturer: m.manufacturer || 'node-manufacturer' + time,
      modelNumber: m.modelNumber || 'node-modelNumber' + time,
      serialNumber: m.serialNumber || 'node-serialNumber' + time
    };
    if (metadata) {
      data.metadata = metadata;
    }
    if (location) {
      data.location = location;
    }

    return restClient.Device.create(data, function(body) {
      return body.id;
    });
  },

  /**
   * Finds a device with a given ID in the given state on the server. If a list of device models URNs is provided,
   * then device should be activated with all these models to be found.
   *
   * @param {String} deviceId - ID of the device to be searched
   * @param {String} state - device state like 'ACTIVATED' or 'REGISTERED'
   * @param {Array} [modelURNs] - optional list of device model URNs
   * @returns {*}
   */
  findValidDevice: function(deviceId, state, modelURNs) {
    return restClient.Device.get(deviceId, function(device) {
      if (!device) {
        return null;
      }
      if (device.state && device.state === state) {
        if (!modelURNs || (device.deviceModels && modelURNs.every(function(modelURN) {
            return device.deviceModels.some(function(model) {
              return model.urn === modelURN;
            });
          }))) {
          return device;
        }
      }
      return null;
    });
  },

  /**
   * Requests location for a device with a given Id from the server and returns them
   *
   * @param {String} deviceId
   * @returns {*}
   */
  getDeviceLocation: function(deviceId) {
    return restClient.Device.location(deviceId).getAll(function(response) {
      var location = {};
      if (response.latitude) {
        location.latitude = response.latitude;
      }
      if (response.longitude) {
        location.longitude = response.longitude;
      }
      if (response.altitude) {
        location.altitude = response.altitude;
      }
      return location;
    });
  },

  /**
   * Returns a list of devices connected through the device with a given deviceId.
   *
   * @param {String} deviceId
   * @returns {*}
   */
  getICDs: function(deviceId) {
    return restClient.Device.devices(deviceId).getAll(function(response) {
      if (!response) {
        return {};
      }
      return response;
    });
  },

  /**
   * Creates asset of the specified type for a device with the given deviceId and deviceName
   *
   * @param {String} deviceId
   * @param {String} deviceName
   * @param {String} assetType
   * @returns {*}
   */
  createAsset: function(deviceId, deviceName, assetType) {
    var assetAttrs = [{}];
    assetAttrs[0].name = assetType.attributes.filter(function(attr) {
      return attr.type === 'DEVICE';
    })[0].name;
    assetAttrs[0].value = deviceId;
    var asset = {
      name: deviceName,
      type: assetType.name,
      description: assetType.description,
      attributes: assetAttrs,
      assignedPlace: null,
      storagePlaces: []
    };
    return restClient.Asset.create(asset);
  },

  /**
   * Creates an application with the given name, description and specified set of associated device models
   *
   * @param {String} name
   * @param {String} description
   * @param {Array} deviceModels
   * @returns {app}
   */
  createApplication: function(name, description, deviceModels) {
    var app = {
      name: name,
      description: description || 'Created by IoT Device Simulator'
    };
    if (deviceModels) {
      if (Array.isArray(deviceModels)) {
        app.deviceModelURNs = deviceModels;
      } else {
        app.deviceModelURNs = [deviceModels];
      }
    }
    return restClient.Application.create(app);
  },

  /**
   * Sets device selection mode for an application with the given appId
   *
   * @param {String} appId
   * @param {String} selectionMode can be 'NONE' or 'ALL'
   * @returns {*}
   */
  setDeviceSelection: function(appId, selectionMode) {
    var selectionGroup = {
      membership: {
        selectionMode: selectionMode
      }
    };
    return restClient.Application.deviceSelectionGroups(appId).update(null, selectionGroup);
  },

  /**
   * Adds a device model with the specified URN to an application identified by appId
   *
   * @param {String} appId
   * @param {String} modelURN
   * @returns {Promise}
   */
  addAppDeviceModel: function(appId, modelURN) {
    return new Promise(function(resolve) {
      var associatedModels;
      restClient.Application.deviceModels(appId).getAll().then(function(body) {
        associatedModels = body.items.map(function(item) {
          return item.urn;
        });
        if (associatedModels.indexOf(modelURN) === -1) {
          associatedModels.push(modelURN);
          var app = {
            id: appId,
            deviceModelURNs: associatedModels
          };
          restClient.Application.update(appId, app).then(function() {
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  },

  /** Checks the IoT Version. If if can successfully resolve the version it also sets it */
  checkVersion: function() {
    return restClient.API.getAll(function(body) {
      // console.log('checkVersion: ', body);
      var versions = body.items;
      var version = null;
      if (versions.length === 1) {
        version = versions[0].version;
      } else {
        for (var i = 0; i < versions.length; i++) {
          var v = versions[i];
          if (v.isLatest) {
            version = v.version;
          }
        }
      }
      return version;
    });
  }
};

module.exports = IoTClient;
