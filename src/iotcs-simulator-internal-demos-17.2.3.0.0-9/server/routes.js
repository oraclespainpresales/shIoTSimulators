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

var config = require('./config/environment');
var conf = require('./configure-iotcs');
var path = require('path');
var fs = require('fs');
var services = require('./services');
var setup = services.setup;
var sharedFunctions = require('./simulation.functions');

module.exports = function() {

  var simEngine = services.simEngine;
  var app = services.app;
  var restClient = services.restClient;
  var registeredDeviceModels = {}; // Device models registered on the server
  var floorplansCache = {};

  /************************************************************************************************
   *                                                                                              *
   * REST API handlers:
   *
   *  /iot/... - Resources that should be obtained from IoT CS
   *  /sim/... - Simulator back-end resources
   *  /iotcs-cl/... - Client libraries
   *                                                                                              *
   ***********************************************************************************************/
  app.route('/iot/deviceModels').get(function(req, res) {
    restClient.DeviceModel.getAll().then(function(models) {
      if (models.items) {
        registeredDeviceModels = {};
        models.items.forEach(function(dm) {
          if (!dm.system) {
            registeredDeviceModels[dm.urn] = dm;
          }
        });
        res.status(200).send(registeredDeviceModels);
      } else {
        res.status(500).send('Could not retrieve device models.');
      }
    });
  });

  app.route('/iot/places').get(function(req, res) {
    var placesPath = path.resolve(__dirname, '../maps/places.json');
    if (fs.existsSync(placesPath)) {
      res.status(200).send(require(placesPath));
    } else {
      restClient.Place.getAll(function(body) {
        res.status(200).send(body);
      });
    }
  });

  app.route('/iot/places/:name/floorplan').get(function(req, res) {
    var placeName = req.params.name;
    if (floorplansCache[placeName]) {
      res.status(200).send(floorplansCache[placeName]);
    } else {
      var floorplansDir = 'assets/images/floorplans';
      var floorplansPath = path.resolve(__dirname, '../client/' + floorplansDir);

      if (!fs.existsSync(floorplansPath)) {
        fs.mkdirSync(floorplansPath);
      }

      var floorplansInfo = path.resolve(__dirname, '../maps/floorplans.json');
      if (fs.existsSync(floorplansInfo)) {
        var floorplans = require(floorplansInfo);
        var floorplan = floorplans[placeName];
        floorplansCache[placeName] = floorplan;
        res.status(200).send(floorplan);
      } else {
        restClient.Place.floorplan(placeName).getAll(function(body) {
          if (body && body.image) {
            var imgLink = body.image.links[0].href;
            imgLink = imgLink.substr(imgLink.indexOf('/', imgLink.indexOf('://') + 3));
            var imgFileName = imgLink.substr(imgLink.lastIndexOf('/'));
            var imgSrc = floorplansDir + imgFileName;
            restClient.downloadFile(imgLink, floorplansPath + imgFileName, function() {
              body.image.links[0].src = imgSrc;
              floorplansCache[placeName] = body;
              res.status(200).send(body);
            });
          }
        });
      }
    }
  });

  app.route('/iot/fences/:name').get(function(req, res) {
    restClient.Application.fences(setup.ATAppID).get(req.params.name, function(body) {
      res.status(200).send(body);
    });
  });

  app.route('/sim/setup').post(function(req, res) {
    //conf.createIotApp(iot);
    res.status(200).end();
  });

  app.route('/sim/setup').get(function(req, res) {
    res.status(200).send(setup);
  });

  app.route('/sim/deviceTypes').get(function(req, res) {
    res.status(200).json(simEngine.simulatedDeviceTypes);
  });

  app.route('/sim/deviceTypes/:id').get(function(req, res) {
    var simulatorId = req.params.id;
    res.status(200).json(simEngine.simulatorModels[simulatorId]);
  });

  app.route('/sim/functions').get(function(req, res) {
    res.status(200).json({
      functions: sharedFunctions.functions,
      conditions: sharedFunctions.conditions,
      handlers: sharedFunctions.handlers
    });
  });

  /**
   * Saves simulator file created by the editor.
   */
  app.route('/sim/deviceTypes/:id').post(function(req, res) {
    var dirName = path.resolve(__dirname, '../devices/' + req.params.id);
    var fileName = req.params.id + '_simulator.json';
    var isNew = false;
    console.log('saving simulator ' + dirName + '/' + fileName);
    try {
      if (!fs.existsSync(dirName)) {
        isNew = true;
        fs.mkdirSync(dirName);
      }
      fs.writeFileSync(dirName + '/' + fileName, JSON.stringify(req.body, null, 2) + '\n');

      var index =
        "'use strict';\n" +
        "var path = require('path');\n" +
        "var modelsDir = path.resolve(__dirname, 'models');\n" +
        "var configFile = path.resolve(__dirname, '" + fileName + "');\n" +
        "var modelsParser = require('../../server/models.parser');\n" +
        'module.exports = modelsParser.parse(modelsDir, configFile);\n';

      if (!fs.existsSync(dirName + '/index.js')) {
        fs.writeFileSync(dirName + '/index.js', index);
      }

      if (!fs.existsSync(dirName + '/models')) {
        fs.mkdirSync(dirName + '/models');
      }

      req.body.deviceModelsExtensions.forEach(function(dm) {
        // Check that device model file exists
        var modelFileName = dm.urn.replace(/:/g, '-') + '.json';
        var modelFilePath = path.resolve(dirName, 'models/' + modelFileName);
        if (!isNew) {
          // Remove device model from the require cache so that it can be reloaded
          delete require.cache[modelFilePath];
        }
        if (!fs.existsSync(modelFilePath) && registeredDeviceModels[dm.urn]) {
          fs.writeFileSync(modelFilePath, JSON.stringify(registeredDeviceModels[dm.urn], null, 2));
        }
      });

    } catch (err) {
      console.log(err);
      res.status(500).send('Unable to save the simulator.');
    }

    if (!isNew) {
      // Remove simulator from the require cache so that it can be reloaded
      delete require.cache[path.resolve(dirName, 'index.js')];
      delete require.cache[path.resolve(dirName, fileName)];
    }
    var simulatorDeviceType = require(dirName);

    if (simulatorDeviceType.simulatorScript) {
      var scriptClassFile = path.resolve(dirName, simulatorDeviceType.simulatorScript);
      delete require.cache[scriptClassFile];
      var SimulatorClass = require(scriptClassFile);
      simulatorDeviceType.devicePrototype = new SimulatorClass();
    }

    if (simulatorDeviceType.disabled) {
      return;
    }

    var devicesDir = setup.tas.stores.dir + simulatorDeviceType.simulatorId;
    try {
      if (!fs.existsSync(devicesDir)) {
        fs.mkdirSync(devicesDir);
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Unable to save the simulator.');
    }

    simEngine.simulatorModels[simulatorDeviceType.simulatorId] = simulatorDeviceType;
    simEngine.simulatedDeviceTypes[simulatorDeviceType.deviceName] = simulatorDeviceType.simulatorId;

    res.status(200).end();
  });

  /**
   * Handles file upload.
   */
  app.route('/devices/:type/:subdir/:file').post(function(req, res) {
    var dirName = 'devices/' + req.params.type;
    try {
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName);
      }
      dirName = dirName + '/' + req.params.subdir;
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName);
      }
      var file = fs.createWriteStream(dirName + '/' + req.params.file, {autoclose: true});
      req.pipe(file, {end: false});
    } catch (err) {
      console.log(err);
      res.status(500).send('Unable to upload file.');
    }

    req.on('end', function() {
      res.status(200).end();
    });

  });

  function deleteDir(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file) {
        var subPath = path + '/' + file;
        if (fs.lstatSync(subPath).isDirectory()) {
          deleteDir(subPath);
        } else {
          fs.unlinkSync(subPath);
        }
      });
      fs.rmdirSync(path);
    }
  }

  /**
   * Delete simulator files created by the editor.
   */
  app.route('/sim/deviceTypes/:id').delete(function(req, res) {
    var simulatorId = req.params.id;
    var dirName = 'devices/' + simulatorId;
    var simulatorModel = simEngine.simulatorModels[simulatorId];
    var deviceName = simulatorModel.deviceName;
    console.log('Deleting simulator ' + deviceName);
    delete simEngine.simulatorModels[simulatorId];
    delete simEngine.simulatedDeviceTypes[deviceName];
    try {
      deleteDir(dirName);
    } catch (err) {
      console.log(err);
      res.status(500).send('Unable to delete the simulator.');
    }
    res.status(200).end();
  });

  app.route('/sim/maps/:file').get(function(req, res) {
    res.sendFile('maps/' + req.params.file, {root: config.root});
  });

  app.route('/sim/maps/:file').post(function(req, res) {
    try {
      fs.writeFileSync('maps/' + req.params.file, JSON.stringify(req.body, null, 2) + '\n');
    } catch (err) {
      console.log(err);
      res.status(500).send('Unable to save file.');
    }
    simEngine.deviceLocations = req.body;
    res.status(200).end();
  });

  /**
   * Create a new simulator. Registers and activates the device with the IoT Cloud Service,
   * adds it to the simulation, and returns the simulator object to the caller.
   */
  app.route('/sim/devices').post(function(req, res) {
    var device = null;

    console.log('creating device', req.body);

    if (req.body.restore) {
      // restoring a device that was already created
      device = simEngine.restoreDevice(req.body.id);
      if (device !== null) {
        if (device.isActivated()) {
          Promise.resolve(simEngine.createSimulatedDevice(req.body.simulatorId, device, true)).then(function() {
            res.status(201).json(device.actualDevice.externalize());
          }).catch(function(error) {
            res.status(500).send('Error: ' + error);
          });
        } else {
          console.log('Device not activated.');
          res.status(500).send('Device not activated.');
          return;
        }
      } else {
        console.log('Device with ID:', req.body.id, ' not found');
        res.status(500).send('Device with ID:' + req.body.id + ' not found');
        return;
      }
      return;
    }

    simEngine.devicePromise(req.body)
      .then(function(dev) {
        device = dev;
        Promise.resolve(simEngine.createSimulatedDevice(req.body.simulatorId, device, false)).then(function() {
          console.log('Device ' + device.getID() + ' is all done, returning 201 to the caller');
          res.status(201).json(device.actualDevice.externalize());
        }).catch(function(e) {
          console.log('error while creating new simDevice:', e.message);
          res.status(500).send(e.toString());
          return;
        });
      })
      .catch(function(error) {
        console.log(error.toString());
        res.status(500).send(error.toString());
      });
  });

  /**
   * Gets all of the existing simulator objects. Usually called during startup of the client.
   */
  app.route('/sim/devices').get(function(req, res) {
    res.status(200).json(simEngine.allDevices.map(function(device) {
      var simDevice = simEngine.simulatedDevices.find(function(simDevice) {
        return (device.id === simDevice.id);
      });
      if (simDevice) {
        return simDevice.externalize();
      }
      return device;
    }).sort(function(dev1, dev2) {
      return dev1.id.localeCompare(dev2.id);
    }));
  });

  /**
   * Gets the simulator device for a given id
   */
  app.route('/sim/devices/:id').get(function(req, res) {
    var deviceID = req.params.id;

    var simDevice = simEngine.simulatedDevices.find(function(device) {
      return (device.id === deviceID);
    });
    if (simDevice) {
      res.status(200).json(simDevice.externalize());
    } else {
      if (deviceID === '0') {
        res.status(204).end();
      } else {
        console.log('Device with ID:', deviceID, ' not found');
        res.status(404).end();
      }
    }
  });

  /**
   * POST is used for patch for right now. The body will be some properties of the simulator
   * and we need to lookup the simulator instance and then update the associated state.
   */
  app.route('/sim/devices/:id').post(function(req, res) {
    var deviceID = req.params.id;
    var patch = req.body;

    // Looking for the device, assuming there are not duplicates
    var simDevice = simEngine.simulatedDevices.find(function(device) {
      return (device.id === deviceID);
    });
    if (simDevice) {
      for (var prop in patch) {
        if (patch.hasOwnProperty(prop)) {
          var urn = prop.substring(0, prop.indexOf('.'));
          simDevice.extendedModels[urn].attributes.forEach(function(attr) {
            if (attr.name === prop) {
              attr.value = patch[prop];
            }
          });
        }
      }
      res.status(200).json(simDevice.externalize());
    } else {
      res.status(404).end();
    }
  });

  /**
   * Setting value for a particular control
   */
  app.route('/sim/devices/:id/control').post(function(req, res) {
    var deviceID = req.params.id;
    var patch = req.body;

    // Looking for the device, assuming there are not duplicates

    var simDevice = simEngine.simulatedDevices.find(function(device) {
      return (device.id === deviceID);
    });
    if (simDevice) {
      Object.keys(patch).forEach(function(name) {
        var control = simDevice.controls.find(function(cntrl) {
          return cntrl.name === name;
        });
        if (control) {
          simDevice.setControlValue(control, patch[name]);
        }

      });
      //apply changes immediately
      simDevice.stepSimulation();
      res.status(200).json(simDevice.externalize());
    } else {
      res.status(404).end();
    }
  });

  /**
   * POST is used for patch for right now. The body will be some properties of the simulator
   * and we need to lookup the simulator instance and then update the associated state.
   */
  app.route('/sim/devices/:id/on').post(function(req, res) {
    var deviceID = req.params.id;
    var payload = req.body;

    var simDevice = simEngine.simulatedDevices.find(function(device) {
      return (device.id === deviceID);
    });
    if (simDevice) {
      simDevice.isOn.value = payload.value;
      if (simDevice.isOn.value) {
        simDevice.events.forEach(function(deviceEvent) {
          if (deviceEvent.isOnEvent) {
            deviceEvent.value = false;
          } else if (simDevice.deviceInstance && deviceEvent.value) {
            deviceEvent.value = false;
            simDevice.deviceInstance.onEvent(deviceEvent.name, false);
          }
        });
      }
      if (simDevice.deviceInstance) {
        simDevice.deviceInstance.setOn(simDevice.isOn.value);
      }
      //apply changes immediately
      if (!simDevice.started && simDevice.isOn.value) {
        simDevice.startSimulation();
      } else if (simDevice.started) {
        simDevice.stepSimulation();
      }
      res.status(200).json(simDevice.externalize());
    } else {
      res.status(404).end();
    }
  });

  /**
   * Signals event set from client
   */
  app.route('/sim/devices/:id/event').post(function(req, res) {
    var deviceID = req.params.id;
    var eventsInfo = req.body;

    // Looking for the device, assuming there are not duplicates

    var simDevice = simEngine.simulatedDevices.find(function(device) {
      return (device.id === deviceID);
    });
    if (simDevice) {
      var exclusive = false;
      for (var eventName in eventsInfo) {
        if (!eventsInfo.hasOwnProperty(eventName)) {
          continue;
        }
        simDevice.events.forEach(function(deviceEvent) {
          if (deviceEvent.name === eventName) {
            deviceEvent.value = eventsInfo[eventName];
            //if event.value is true and event is exclusive set flag
            if (eventsInfo[eventName] && deviceEvent.exclusive) {
              exclusive = true;
            }
            if (simDevice.deviceInstance) {
              simDevice.deviceInstance.onEvent(eventName, deviceEvent.value);
            }
          }
        });
        // For exclusive event we should unset all other events
        if (exclusive) {
          simDevice.events.forEach(function(deviceEvent) {
            if (deviceEvent.name !== eventName) {
              deviceEvent.value = false;
            }
          });
        }
      }
      //apply changes immediately
      simDevice.stepSimulation();
      res.status(200).json(simDevice.externalize());
    } else {
      res.status(404).end();
    }
  });

  app.route('/sim/devices/:id/alerts').post(function(req, res) {
    var deviceID = req.params.id;
    var alert = req.body;

    var simDevice = simEngine.simulatedDevices.find(function(device) {
      return (device.id === deviceID);
    });
    if (simDevice) {
      simDevice.raiseAlert(alert);
      res.status(200).json(simDevice.externalize());
      //res.status(200).json(device.actualDevice);
    } else {
      res.status(404).end();
    }
  });

  /**
   * Deletes a specific simulator device. The id is the same for the simulator object
   * and its associated device.
   */
  app.route('/sim/devices/:id/:newId').delete(function(req, res) {
    var deviceID = req.params.id;
    var activeID = req.params.newId;

    if (simEngine.deleteSimulatedDevice(deviceID)) {
      //Use redirect to avoid 'No element found' console error in response to '204' status for deleted device
      if (activeID === deviceID) {
        res.redirect(303, '/sim/devices/0');
      } else {
        res.redirect(303, '/sim/devices/' + activeID);
      }
    } else {
      res.status(404).end();
    }
  });

  /**
   * Called by the IoT Cloud Service, this is the http connector endpoint.
   * Messages which come from the IoT Cloud Service land here, and are then
   * forwarded on to all the websocket clients.
   */
  app.route('/httpConnector').post(function(req, res) {
    services.io.emit('connectorMessage', req.body);
    res.status(202).end();
  });

  app.route('/iotcs-cl/:file').get(function(req, res) {
    var responseFile;
    if (!setup.server.virtualbox || req.params.file !== 'trustedAssetsStore.json') {
      responseFile = setup.clientlibrary.dir + '/' + req.params.file;
    } else {
      responseFile = setup.clientlibrary.dir + '/' + conf.getClientTAS(req.hostname);
    }
    res.sendFile(responseFile, {root: config.root});
  });

  app.route('/:url(api|app|bower_components|assets)/*').get(function(req, res) {
    res.status(404).end();
  });

  app.route('/*').get(function(req, res) {
    res.sendFile(
      app.get('appPath') + '/index.html',
      {root: config.root}
    );
  });

};
