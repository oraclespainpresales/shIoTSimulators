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

/**
 * SimulationEngine is responsible for initialization and management of all simulated devices.
 */

var services = require('./services');
var fs = require('fs');
var path = require('path');
var async = require('async');
var SIM_ROOT = 'devices';
var Gateway = require('./gateway');
var simEngine = {
  simulatedDeviceTypes: {}, // device name to simulator Id mapping
  simulatorModels: {}, // simulator id to simulator model mapping
  checkedSimulatorModels: [], // list of simulator ids whose device models were checked against current IoT CS instance
  simulatedDevices: [],
  deviceCache: {},
  allDevices: []
};
services.register('simEngine', simEngine);

require('./simulation.functions');
var conf = require('./configure-iotcs');
var setup = services.setup;
var iot = services.iot;
var restClient = services.restClient;
// Device client library initialization
var Dcl = services.dclLib({debug: true});
Dcl.oracle.iot.client.monitor.pollingInterval = 500;
Dcl.oracle.iot.client.device.defaultMessagePoolingInterval = 500;

var SimulatedDevice = require('./simulated.device');

conf.updateTAS();

iot.checkVersion().then(function(version) {
  if (version !== 'v2') {
    console.log('Only IoT CS Version 2 is supported by the simulator', version);
    process.exit(1);
  } else {
    console.log('IoT CS Version ', version);
  }
  simEngine._init();
}).catch(function(error) {
  console.log('Error while connecting to the configured IoT CS instance: ', error);
  process.exit(1);
});

/**
 * Initializes Simulation Engine to work with simulators models provided in SIM_ROOT folder
 *
 * @private
 */
simEngine._init = function() {

  /**
   * Initializes simEngine structures with Gateway type
   */
  simEngine.initGatewayModel = function() {
    simEngine.simulatedDeviceTypes[Gateway.prototype.deviceName] = Gateway.prototype.simulatorId;
    simEngine.simulatorModels[Gateway.prototype.simulatorId] = Gateway.prototype;
    var gatewaysDir = setup.tas.stores.dir + Gateway.prototype.simulatorId;
    if (!fs.existsSync(gatewaysDir)) {
      fs.mkdirSync(gatewaysDir);
    } else if (!fs.statSync(gatewaysDir).isDirectory()) {
      throw new Error("Can't create folder" + gatewaysDir + '. There is a file with such name.');
    }
  };

  // Check if the configured server contains asset monitoring app
  restClient.Application.find(function(app) {
    return app.type === 'assetTracking';
  }).then(function(atApp) {
    if (atApp) {
      setup.ATSupport = true;
      setup.ATAppID = atApp.id;
      simEngine.deviceLocations = require(path.resolve(__dirname, '../maps/maps.json'));
      restClient.AssetType.getAll().then(function(response) {
        if (response) {
          simEngine.assetTypes = {};
          response.items.forEach(function(type) {
            var dm = type.attributes.filter(function(attr) {
              return attr.type === 'DEVICE';
            })[0].deviceModel;
            simEngine.assetTypes[dm] = type;
          });
        }
      });
    }
  });

  // Check if application configured in the configuration file as simulator.iotappname exists
  if (setup.simulator.iotappname) {
    restClient.Application.find(function(app) {
      return app.name === setup.simulator.iotappname;
    }).then(function(iotApp) {
      simEngine.iotApp = iotApp;
      if (!iotApp) {
        console.log("Application '" + setup.simulator.iotappname + "' doesn't exist");
        iot.createApplication(setup.simulator.iotappname).then(function(app) {
          iotApp = app;
          console.log("Application '" + app.name + "' created in the IoT CS");
          // Make sure new application uses "Include All" devices filter:
          iot.setDeviceSelection(iotApp.id, 'ALL').then(function(response) {
            console.log('Device selection criteria for the application "' + iotApp.name + '" is set to ' +
              response.membership.selectionMode);
          }).catch(function(err) {
            console.log('Error while setting device selection criteria for the application "' + iotApp.name + '":',
              err);
          });
          simEngine.iotApp = app;
        }, function(reason) {
          console.log('An attempt to create application named "' + setup.simulator.iotappname + '" was unsuccessful:',
            reason);
        });
      }
    });
  }

  //If necessary create folders to store provisioned devices
  if (!fs.existsSync(setup.tas.stores.dir)) {
    fs.mkdirSync(setup.tas.stores.dir);
  } else if (!fs.statSync(setup.tas.stores.dir).isDirectory()) {
    throw new Error("Can't create folder" + setup.tas.stores.dir + '. There is a file with such name.');
  }

  // initialize Gateway support
  simEngine.initGatewayModel();

  //Read devices directory that should contain simulators and devices models
  var simDirs = fs.readdirSync(SIM_ROOT);
  for (var i = 0; i < simDirs.length; i++) {
    var simModelDir = SIM_ROOT + '/' + simDirs[i];
    if (!fs.statSync(simModelDir).isDirectory()) {
      continue;
    }
    var simulatorDeviceType;
    try {
      simulatorDeviceType = require('../' + simModelDir);
    } catch (error) {
      // Could not parse the models or some other error occurred - ignore this simulator
      console.log('Could not parse simulator ' + simModelDir + '. Error: ' + error);
      continue;
    }
    if (simulatorDeviceType.disabled) {
      continue;
    }
    if (simulatorDeviceType.simulatorScript) {
      var SimulatorClass = require('../' + simModelDir + '/' + simulatorDeviceType.simulatorScript);
      simulatorDeviceType.devicePrototype = new SimulatorClass();
    }
    // console.log('simulatorDeviceType:', simulatorDeviceType);
    simEngine.simulatedDeviceTypes[simulatorDeviceType.deviceName] = simulatorDeviceType.simulatorId;
    var devicesDir = setup.tas.stores.dir + simulatorDeviceType.simulatorId;
    if (!fs.existsSync(devicesDir)) {
      fs.mkdirSync(devicesDir);
    } else if (!fs.statSync(devicesDir).isDirectory()) {
      throw new Error("Can't create folder" + devicesDir + '. There is a file with such name.');
    }

    simEngine.simulatorModels[simulatorDeviceType.simulatorId] = simulatorDeviceType;
  }
  //console.log("simulatedDeviceTypes", simEngine.simulatedDeviceTypes);

  /**
   * Checks if an asset should and can be created for a provided simulated device and creates such asset if necessary.
   *
   * @param {String} simulatorId - id of the simulator model, which defines whether an asset should be created
   * @param {String} deviceName - name of the device to be used as asset name, can be null
   * @param {Object} device - DCD or ICD corresponding to an asset being created
   * @returns {Promise} Promise that is resolved to the 'device' object.
   */
  simEngine.checkAndCreateAsset = function(simulatorId, deviceName, device) {
    if (setup.ATSupport && simEngine.simulatorModels[simulatorId].asset && simEngine.assetTypes) {
      var assetType = simEngine.assetTypes[simEngine.simulatorModels[simulatorId].deviceModelsExtensions[0].urn];
      if (assetType) {
        if (!deviceName) {
          deviceName = services.utils.getAbbreviation(assetType.name) + '-' + device.getID();
        }
        console.log('Creating asset of type', assetType.name, 'for device', device.getID());
        services.io.emit('info', 'Creating asset of type ' + assetType.name);
        iot.createAsset(device.getID(), deviceName, assetType)
          .then(function(result) {
            console.log('Asset creation result:', result);
          });
      }
    }
    return new Promise(function(resolve) {
      resolve(device);
    });
  };

  /**
   * Registers new Directly Connected Device on IOT CS instance, provisions and activates it with device models defined
   * in the simulator model.
   *
   * @param {Object} request New device registration request
   * @returns {Promise} Promise object that should be resolved to a dcdDevice instance
   */
  simEngine.registerAndActivateDCD = function(request) {
    return iot.createDevice(setup.tas.auto.sharedSecret, request.id, request.name, request.metadata, request.location)
      .then(function(deviceID) {
        services.io.emit('info', 'Provisioning device: ' + deviceID);
        console.log('Device', request.simulatorId, deviceID, 'registered...');
        return simEngine._provisionDevice(request.simulatorId, deviceID, setup.tas.auto.sharedSecret);
      })
      .then(function(dcdDevice) {
        console.log('Device', request.simulatorId, dcdDevice.getID(), 'now activating...');
        services.io.emit('info', 'Activation of device: ' + dcdDevice.getID());
        return simEngine._activateDevice(request.simulatorId, dcdDevice);
      })
      .then(function(dcdDevice) {
        return simEngine.checkAndCreateAsset(request.simulatorId, request.name, dcdDevice);
      });
  };

  /**
   * Creates Indirectly Connected Device object based on the information provided
   *
   * @param {Object} deviceInfo
   */
  simEngine.createICDevice = function(deviceInfo) {
    var icdDevice = JSON.parse(JSON.stringify(deviceInfo));
    icdDevice.getID = function() {
      return icdDevice.id;
    };
    icdDevice.getEndpointId = function() {
      return icdDevice.endpointId;
    };
    icdDevice.isActivated = function() {
      return true;
    };
    return icdDevice;
  };

  /**
   * Activates new or pre-registered Indirectly Connected Device on IOT CS instance by using specified Gateway.
   *
   * @param {Object} request New device registration request
   * @returns {Promise} Promise object that should be resolved to an icdDevice instance
   */
  simEngine.registerAndActivateICD = function(request) {
    var gateway = simEngine.deviceCache[request.gatewayId];
    var simulator = simEngine.simulatorModels[request.simulatorId];
    var deviceModels = simulator.deviceModelsExtensions.map(function(dmX) {
      return dmX.urn;
    });
    var icdDeviceInfo = {
      'hardwareId': request.id,
      'gatewayId': request.gatewayId,
      'serverHost': setup.server.host,
      'serverPort': setup.server.port
    };
    return new Promise(function(resolve, reject) {
      simEngine._checkDeviceModels(request.simulatorId).then(function() {
        gateway.registerDevice(request.id || services.utils.uuid(), request.metadata, deviceModels, function(id) {
          if (id) {
            var icdFile = path.join(setup.tas.stores.dir + request.simulatorId, 'icd-' + id + '.json');
            console.log('------------------- ICD Registered -------------------');
            console.log(id);
            console.log('------------------------------------------------------');
            icdDeviceInfo.endpointId = id;
            icdDeviceInfo.id = id;
            Dcl.$port.file.store(icdFile, JSON.stringify(icdDeviceInfo));
            var icdDevice = simEngine.createICDevice(icdDeviceInfo);
            icdDevice.parentDevice = gateway;
            var simGateway = simEngine.simulatedDevices.find(function(simDevice) {
              return simDevice.id === request.gatewayId;
            });
            if (simGateway) {
              simGateway.refreshICDs();
            }
            resolve(icdDevice);
          }
        });
      }).catch(function(err) {
        reject(err);
      });
    }).then(function(icdDevice) {
      return simEngine.checkAndCreateAsset(request.simulatorId, request.name, icdDevice);
    });
  };

  /**
   * Provisions pre-registered Directly Connected Device on IOT CS instance and activates it with device models defined
   * in the simulator model.
   *
   * @param {Object} request New device registration request
   * @returns {Promise} Promise object that should be resolved to a dcdDevice instance
   */
  simEngine.provisionAndActivateDCD = function(request) {
    services.io.emit('info', 'Provisioning device: ' + request.id);
    var dcdDevice = simEngine._provisionDevice(request.simulatorId, request.id, request.sharedSecret);
    return iot.findValidDevice(request.id, 'REGISTERED').then(function(device) {
      if (device) {
        console.log('Device ', request.simulatorId, dcdDevice.getID(), ' not activated, requesting activation');
        services.io.emit('info', 'Activation of device: ' + dcdDevice.getID());
        return simEngine._activateDevice(request.simulatorId, dcdDevice)
          .then(function(dcdDevice) {
            return simEngine.checkAndCreateAsset(request.simulatorId, null, dcdDevice);
          });
      } else {
        return new Promise(function(resolve, reject) {
          reject('Registered device with ID ' + request.id + ' not found');
        });
      }
    });
  };

  simEngine.devicePromise = function(request) {
    if (!request.isIndirect) {
      if (request.autoRegister) {
        services.io.emit('info', 'Registering device on IoT CS instance...');
        return simEngine.registerAndActivateDCD(request);
      } else {
        return simEngine.provisionAndActivateDCD(request);
      }
    } else {
      return simEngine.registerAndActivateICD(request);
    }
  };

  /**
   * Verifies that device referred in the saved deviceFile can be used for simulating device type identified by
   * simulatorId. Callback function with no arguments should be called when processing for each device is finished.
   *
   * @param {String} simulatorId
   * @param {String} deviceFile
   * @param {Function} callback
   */
  var verifyAndAddDevice = function(simulatorId, deviceFile, callback) {
    console.log('Checking file:', deviceFile, 'for simulator:', simulatorId);
    var deviceInfo = require('../' + deviceFile);
    var deviceID = deviceInfo.gatewayId ? deviceInfo.id : deviceInfo.clientId;
    if (deviceInfo.serverHost === setup.server.host) {
      var simDevice = {
        id: deviceID,
        simulatorId: simulatorId,
        deviceName: simEngine.simulatorModels[simulatorId].deviceName,
        closed: true, // all devices are closed until opened by the user
        isIndirect: deviceInfo.gatewayId ? true : false
      };
      //check if the model exists and device actually belongs tho this cloud instance
      var modelURNs = simEngine.simulatorModels[simulatorId].deviceModelsExtensions.map(function(dmX) {
        return dmX.urn;
      });
      iot.findValidDevice(deviceID, 'ACTIVATED', modelURNs).then(function(device) {
        if (device) {
          var clientDevice = null;
          if (simDevice.isIndirect) {
            clientDevice = simEngine.createICDevice(deviceInfo);
          } else {
            clientDevice = simEngine.createDCDevice(simulatorId, deviceID);
          }
          // This additional check is to make sure that we have necessary credentials for activated device
          if (clientDevice.isActivated()) {
            console.log('Adding', deviceID);
            simEngine.deviceCache[deviceID] = clientDevice;
            simEngine.allDevices.push(simDevice);
          } else {
            if (!simDevice.isIndirect) {
              clientDevice.close();
            }
            console.log('Skipping device with incomplete activation info:', deviceID);
          }
        } else {
          console.log("Skipping device that isn't valid:", deviceID);
        }
        callback();
      }, function(error) {
        console.log('Device ', deviceID, 'search on the server returned error: ', error);
        callback();
      });

    } else {
      console.log('Skipping device registered on different host: ', deviceID);
      callback();
    }
  };
  /**
   * Finds the devices created in previous sessions.
   */
  simEngine._findAllDevices = function() {
    async.concat(Object.keys(simEngine.simulatorModels), function(simulatorId, callback) {
      fs.readdir(setup.tas.stores.dir + simulatorId, function(err, files) {
        if (err) {
          callback(err);
        }
        callback(null, files.map(function(file) {
          return [simulatorId, path.join(setup.tas.stores.dir + simulatorId, file)];
        }).filter(function(simFile) {
          return fs.statSync(simFile[1]).isFile() && path.extname(simFile[1]) === '.json';
        }));
      });
    }, function(err, simFiles) {
      if (err) {
        throw err;
      }
      async.each(simFiles, function(simFile, callback) {
        verifyAndAddDevice(simFile[0], simFile[1], callback);
      }, function(err) {
        if (err) {
          throw err;
        }
        console.log('Device search finished');
        services.server.startListen();
      });
    });
  };

  simEngine.createDCDevice = function(simulatorId, deviceID) {
    var dcdDevice = null;
    var dclx = services.dclLib({debug: false});
    // We are using test server: we need to override CN verification because of test server certificate
    require('tls').checkServerIdentity = function() {
    };
    dclx.oracle.iot.tam.store = path.join(setup.tas.stores.dir + simulatorId, deviceID + '.json');
    dclx.oracle.iot.tam.storePassword = setup.tas.stores.pwd;
    dclx.oracle.iot.client.monitor.pollingInterval = 500;
    dclx.oracle.iot.client.device.defaultMessagePoolingInterval = 500;
    try {
      if (simulatorId !== 'gateway') {
        dcdDevice = new dclx.device.DirectlyConnectedDevice();
      } else {
        dcdDevice = new dclx.device.GatewayDevice();
      }
      dcdDevice.getID = function() {
        return deviceID;
      };
      dcdDevice.parentDevice = dcdDevice;
      console.log('restoreDevice - device:', dcdDevice.getID());
    } catch (e) {
      console.log('restoreDevice - device:', deviceID, ' failed with:', e);
    }
    return dcdDevice;
  };
  /**
   * Restores the device designated by the provided device Id.
   *
   * @param {String} deviceID the device ID.
   * @returns {DirectlyConnectedDevice} the corresponding device instance.
   */
  simEngine.restoreDevice = function(deviceID) {
    console.log('restoreDevice : ', deviceID);
    var clientDevice = simEngine.deviceCache[deviceID];
    if (clientDevice && clientDevice.gatewayId) {
      clientDevice.parentDevice = simEngine.deviceCache[clientDevice.gatewayId];
    }
    return clientDevice;
  };

  // Find all devices previously created
  simEngine._findAllDevices();
};

simEngine.createSimulatedDevice = function(simulatorId, dcdDevice, restore) {
  // We should use clone of the device model for device instance creation
  // to avoid that one device affects the other
  simEngine.deviceCache[dcdDevice.getID()] = dcdDevice;
  var promise;
  if (simulatorId === 'gateway') {
    var gatewayDevice = new Gateway(dcdDevice);
    simEngine.simulatedDevices.push(gatewayDevice);
    if (!restore) {
      // Add new device to the list of all devices
      simEngine.allDevices.push({
        id: gatewayDevice.id,
        simulatorId: simulatorId,
        deviceName: gatewayDevice.deviceName,
        closed: true
      });
    }
  } else {
    var simDeviceType = simEngine.simulatorModels[simulatorId];
    var clonedModel = services.utils.cloneObject(simDeviceType);
    // For asset tracking scenario we should redefine initial values of GPS coordinates
    // according to the maps/maps.json file
    if (restore && setup.ATSupport && simEngine.deviceLocations) {
      var deviceLocation = simEngine.deviceLocations.markers[dcdDevice.getID()];
      if (deviceLocation) {
        [['ora_latitude', 'lat'], ['ora_longitude', 'lon'], ['ora_altitude', 'alt']].forEach(function(axis) {
          var axisAttr = clonedModel.deviceModelsExtensions[0].attributes.find(function(attr) {
            return attr.shortName === axis[0];
          });
          if (axisAttr) {
            axisAttr.initialValue = deviceLocation[axis[1]];
          }
        });
      }
    }
    var deviceInstance;
    if (simDeviceType.simulatorScript) {
      deviceInstance = simDeviceType.devicePrototype.createDevice(clonedModel, dcdDevice.getID(), restore);
    }
    var simulatedDevice = new SimulatedDevice(clonedModel, dcdDevice, deviceInstance);
    promise = simulatedDevice.startSimulation().then(function() {
      simEngine.simulatedDevices.push(simulatedDevice);
      if (!restore) {
        // Add new device to the list of all devices
        simEngine.allDevices.push({
          id: simulatedDevice.id,
          simulatorId: simulatorId,
          deviceName: simulatedDevice.deviceName,
          closed: true
        });
      }
    });
  }
  return promise;
};

simEngine.deleteSimulatedDevice = function(deviceId) {
  var deviceIndex = simEngine.simulatedDevices.findIndex(function(simDevice) {
    return simDevice.id === deviceId;
  });
  if (deviceIndex === -1) {
    return false;
  }
  var device = simEngine.simulatedDevices[deviceIndex];
  if (device.simulatorId !== 'gateway') {
    simEngine.simulatedDevices[deviceIndex].stopSimulation();
  }
  simEngine.simulatedDevices.splice(deviceIndex, 1);
  return true;
};

/**
 * Provisions the device designated by the
 * provided device Id. The provided trusted assets will be stored in
 * a TA store located in the designated directory.
 *
 * @param {String} simID
 * @param {String} deviceID the device Id.
 * @param {String} sharedSecret the device's shared secret.
 * @returns {DirectlyConnectedDevice} the corresponding device instance.
 */
simEngine._provisionDevice = function(simID, deviceID, sharedSecret) {
  console.log('provisionDevice : ', simID, deviceID, sharedSecret);

  var taStore = setup.tas.stores.dir + simID + '/' + deviceID + '.json';
  Dcl.device.TrustedAssetsManager.provision(taStore, setup.tas.stores.pwd,
    "https", setup.server.host, setup.server.port,
    deviceID, sharedSecret, setup.server.caCert);
  return simEngine.createDCDevice(simID, deviceID);
};

/**
 * Checks if device models used by given simulator model exist, if not
 * create them and associate with the corresponding IoT Application
 *
 * @param {String} simID identifier of the simulator model
 * @returns {Promise}
 * @private
 */
simEngine._checkDeviceModels = function(simID) {
  return new Promise(function(resolve, reject) {
    if (simID !== 'gateway' && simEngine.checkedSimulatorModels.indexOf(simID) === -1) {
      var dmCount = simEngine.simulatorModels[simID].deviceModelsExtensions.length;
      var checkedCount = 0;
      simEngine.simulatorModels[simID].deviceModelsExtensions.forEach(function(dm) {
        restClient.DeviceModel.get(dm.urn).then(function() {
          console.log('Device model', dm.urn, 'exists on the server');
          iot.addAppDeviceModel(simEngine.iotApp.id, dm.urn).then(function() {
            checkedCount += 1;
            if (checkedCount === dmCount) {
              simEngine.checkedSimulatorModels.push(simID);
              resolve();
            }
          });
        }, function(reason) {
          console.log(reason);
          console.log('Device model', dm.urn, "doesn't exist on server. Creating ...");
          restClient.DeviceModel.create(dm.model).then(function() {
            console.log('Device model', dm.urn, 'is created');
            iot.addAppDeviceModel(simEngine.iotApp.id, dm.urn).then(function() {
              checkedCount += 1;
              if (checkedCount === dmCount) {
                simEngine.checkedSimulatorModels.push(simID);
                resolve();
              }
            });
          }).catch(function(err) {
            reject("Couldn't upload missing model " + dm.urn + '. Error: ' + err);
          });
        });
      });
    } else {
      resolve();
    }
  });
};

/**
 * Activates the provided device.
 *
 * @param {String} simID
 * @param {DirectlyConnectedDevice} dcdDevice
 * @returns {Promise} a Promise to be resolved to the provided device instance.
 */
simEngine._activateDevice = function(simID, dcdDevice) {
  console.log('activateDevice : ', simID, dcdDevice.getID());
  return new Promise(function(resolve, reject) {
    simEngine._checkDeviceModels(simID).then(function() {
      dcdDevice.activate(simEngine.simulatorModels[simID].deviceModelsExtensions.map(function(dm) {
        return dm.urn;
      }), function(dev, error) {
        if (!dev || error) {
          console.log('Device', dcdDevice.getID(), 'not activated');
        } else {
          console.log('Device', dcdDevice.getID(), 'activated !!!');
        }
        resolve(dcdDevice);
      });
    }).catch(function(err) {
      reject(err);
    });
  });
};

module.exports = simEngine;
