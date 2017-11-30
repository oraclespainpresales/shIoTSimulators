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

/**
 * Creates new simulated device
 *
 * @param {Object} simulatorModel - a model used for simulation
 * @param {Object} clientDevice - Directly or Indirectly Connected client device
 * restoration of already existing one
 * @param {Object} deviceInstance - for devices that use their own customized script it's a JS object
 * modeling a device behavior
 * @constructor
 */
var SimulatedDevice = function(simulatorModel, clientDevice, deviceInstance) {

  var DEFAULT_MESSAGING_INTERVAL = 1000;

  // if data are coming from custom deviceInstance implementation, then we don't need to generate them
  var generateValues = (typeof deviceInstance === 'undefined');

  // Assign attributes from the simulator model to this particular instance
  var simDevice = Object.assign(this, simulatorModel);
  simDevice.deviceInstance = deviceInstance;

  simDevice.messagesCount = 0; // for keeping track of the number of messages sent, when this number is limited
  simDevice.started = false;
  // Mapping image names to image objects for faster access
  var imagesMap = {};
  simDevice.images.forEach(function(image) {
    imagesMap[image.name] = image;
  });

  if (!simDevice.messagingInterval) {
    simDevice.messagingInterval = services.setup.messagingInterval || DEFAULT_MESSAGING_INTERVAL;
  }

  clientDevice.actualDevice = simDevice;

  simDevice.id = clientDevice.getID();
  simDevice.virtualDevices = {};
  simDevice.extendedModels = {};
  simDevice.deviceModelsExtensions.forEach(function(dmX) {
    simDevice.extendedModels[dmX.urn] = dmX;
  });
  simDevice.initialized = false;

  /**
   * Prepare arguments to different functions: onFunction, offFunction, onEventFunction, actionHandler
   *
   * @private
   */
  simDevice._preprocessArgs = function(args, dmX) {
    var newArgs = {};
    Object.keys(args).forEach(function(key) {
      var newValue = args[key];
      if (typeof newValue === 'object') {
        // recursively process nested objects with arguments
        newArgs[key] = simDevice._preprocessArgs(newValue, dmX);
      } else if ((typeof newValue !== 'string') || ((newValue.indexOf('$') !== 0) && (newValue.indexOf('!$') !== 0)) ||
        (newValue === '$this') || (newValue === '$value')) {
        // in case of literals just copy the same value
        newArgs[key] = newValue;
      } else {
        // parse and evaluate special cases
        var negate = (newValue.indexOf('!') === 0);
        if (negate) {
          newValue = newValue.substr(1);
        }
        var attrName = newValue.substr(1);
        var fullAttrName = attrName;
        if (newValue.indexOf('$urn:') !== 0) {
          fullAttrName = dmX.urn + '.' + attrName;
        } else if (!dmX) {
          var modelURN = fullAttrName.substr(0, fullAttrName.lastIndexOf('.'));
          dmX = simDevice.extendedModels[modelURN];
        }
        var attribute = dmX.attributes.find(function(attr) {
          return attr.name === fullAttrName;
        });
        // Dynamic value cases:
        var getValue;
        if (attribute) {
          // current value of the attribute
          getValue = function(attr) {
            return negate ? !attr.value : attr.value;
          };
          Object.defineProperty(newArgs, key, {
            get: getValue.bind(null, attribute),
            enumerable: true
          });
        } else if (newValue === '$now') {
          // current value of time
          getValue = function() {
            return Date.now();
          };
          Object.defineProperty(newArgs, key, {
            get: getValue,
            enumerable: true
          });
        } else if (deviceInstance) {
          // current value of the attribute from custom script
          getValue = function(attr) {
            return negate ? !deviceInstance[attr] : deviceInstance[attr];
          };
          Object.defineProperty(newArgs, key, {
            get: getValue.bind(simDevice, attrName),
            enumerable: true
          });
        } else {
          // fallback
          getValue = function(attr) {
            return negate ? !this[attr].value : this[attr].value;
          };
          Object.defineProperty(newArgs, key, {
            get: getValue.bind(simDevice, attrName),
            enumerable: true
          });
        }
      }
    });
    return newArgs;
  };

  simDevice._callFunction = function(func, funcArgs/*, extendedModel*/) {
    if (funcArgs) {
      var keys = Object.keys(funcArgs);
      var args = {};
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = funcArgs[key];
        if (value === '$this') {
          args[key] = simDevice;
        } else {
          args[key] = value;
        }
      }
      return func.call(null, args);
    }
    return func.call(null);
  };

  if (simDevice.isOnAttribute && simDevice.isOnAttribute.modelAttributeName) {
    if (simDevice.isOn.attributeModel) {
      var modelURN = simDevice.isOn.attributeModel;
      var isOnAttr = simDevice.extendedModels[modelURN].attributes.find(function(attr) {
        return attr.name === simDevice.isOnAttribute.modelAttributeName;
      });

      if (isOnAttr) {
        Object.defineProperty(simDevice.isOn, 'value', {
          get: function() {
            return isOnAttr.value;
          },
          set: function(newValue) {
            isOnAttr.value = newValue;
          },
          enumerable: true,
          configurable: true
        });
      }
    } else if (simDevice.deviceInstance) {
      Object.defineProperty(simDevice.isOn, 'value', {
        get: function() {
          return simDevice.deviceInstance[simDevice.isOnAttribute.modelAttributeName];
        },
        set: function(newValue) {
          simDevice.deviceInstance[simDevice.isOnAttribute.modelAttributeName] = newValue;
        },
        enumerable: true,
        configurable: true
      });
    }
  } else {
    if (simDevice.isOnAttribute) {
      simDevice.isOn.value = simDevice.isOnAttribute.initialValue;
    } else {
      simDevice.isOn.value = true;
    }
  }

  simDevice.initializeVirtualDevices = function() {

    return new Promise(function(resolve, reject) {

      var dmCount = simDevice.deviceModelsExtensions.length;
      var initCount = 0;

      // Initialize device attributes for all supported device models
      Object.keys(simDevice.extendedModels).forEach(function(modelURN) {
        services.restClient.DeviceModel.get(modelURN).then(function(model) {
          services.io.emit('info', 'Creating virtual device ...');
          var virtualDevice = clientDevice.parentDevice.createVirtualDevice(clientDevice.getEndpointId(), model);
          simDevice.virtualDevices[modelURN] = virtualDevice;
          var dmX = simDevice.extendedModels[modelURN];
          dmX.attributes.forEach(function(attribute) {
            if (attribute.writable) {
              virtualDevice[attribute.shortName].onChange = function(args) {
                console.log('Changed', args.attribute.id, 'from', args.oldValue, 'to', args.newValue);
                attribute.value = args.newValue;
              };
            }
          });
          if (dmX.actions) {
            dmX.actions.forEach(function(action) {
              if (generateValues) {
                if (typeof action.value !== 'undefined') {
                  virtualDevice[action.name].value = action.value;
                }
                if (action.actionArguments) {
                  action.actionArguments = simDevice._preprocessArgs(action.actionArguments, dmX);
                }
                virtualDevice[action.name].onExecute = function(value) {
                  virtualDevice[action.name].value = value;
                  var newArgs = {};
                  Object.keys(action.actionArguments).forEach(function(key) {
                    if (action.actionArguments[key] === '$value') {
                      newArgs[key] = value;
                    } else {
                      newArgs[key] = action.actionArguments[key];
                    }
                  });
                  simDevice._callFunction(action.actionHandler, newArgs, dmX);
                };
              } else {
                virtualDevice[action.name].onExecute = function(value) {
                  deviceInstance.onAction(action.name, value);
                };
              }
            });
          }
          initCount += 1;
          if (initCount === dmCount) {
            resolve();
          }
        }, function(error) {
          console.log('Unable to retrieve device model from the cloud server: ' + error);
          reject('Unable to retrieve device model from the cloud server');
        });
      });
    });
  };

  simDevice.initializeValues = function() {
    // Initialize device attributes for all supported device models
    Object.keys(simDevice.extendedModels).forEach(function(modelURN) {
      var dmX = simDevice.extendedModels[modelURN];
      dmX.attributes.forEach(function(attribute) {
        if (generateValues) {
          //Pre-process arguments for onFunction and offFunction
          if (attribute.onArguments) {
            attribute.onArguments = simDevice._preprocessArgs(attribute.onArguments, dmX);
          }
          if (attribute.offArguments) {
            attribute.offArguments = simDevice._preprocessArgs(attribute.offArguments, dmX);
          }

          if (typeof attribute.initialValue !== 'undefined') {
            attribute.value = attribute.initialValue;
          } else if (simDevice.isOn.value && attribute.onFunction) {
            attribute.value = simDevice._callFunction(attribute.onFunction, attribute.onArguments, dmX);
          } else if (attribute.type === 'BOOLEAN') {
            attribute.value = false;
          } else if (attribute.type === 'NUMBER' || attribute.type === 'INTEGER') {

            var boundaries = [];
            if (attribute.range) {
              boundaries = attribute.range.split(',', 2);
            } else {
              boundaries = [0, 0];
            }
            var min = Number.parseFloat(boundaries[0]);
            var max = Number.parseFloat(boundaries[1]);
            attribute.value = min + max / 2.0;
          } else if (attribute.type === 'DATETIME') {
            attribute.value = Date.now();
          }
          if (attribute.type === 'INTEGER') {
            attribute.value = Math.round(attribute.value);
          }
        } else {
          attribute.value = deviceInstance.getAttributeValue(attribute.shortName, modelURN);
        }
      });
      if (dmX.formats) {
        dmX.formats.filter(function(format) {
          return (format.type === 'ALERT') && (typeof format.condition !== 'undefined');
        }).forEach(function(alert) {
          if (alert.conditionArguments) {
            alert.conditionArguments = simDevice._preprocessArgs(alert.conditionArguments, dmX);
          }
        });
      }
    });
    // Initialize all device events flags to false
    simDevice.events.forEach(function(event) {
      if (generateValues) {
        if (event.attributes) {
          Object.keys(event.attributes).forEach(function(attribute) {
            var attr = event.attributes[attribute];
            if (attr.onEventArguments) {
              attr.onEventArguments = simDevice._preprocessArgs(attr.onEventArguments);
            }
          });
        }
      }
      event.value = false;
    });
  };

  if (!clientDevice.isActivated()) {
    throw new Error('Device not activated. Make sure the device is already registered in the cloud ' +
      'and the corresponding device model is created.');
  }

  simDevice.raiseAlert = function(alert) {
    var devAlert = simDevice.virtualDevices[alert.modelURN].createAlert(alert.urn);
    Object.keys(alert.data).forEach(function(fieldName) {
      devAlert.fields[fieldName] = alert.data[fieldName];
    });
    devAlert.raise();
  };

  simDevice.setControlValue = function(control, value) {
    control.value = value;
    if (deviceInstance) {
      deviceInstance[control.name] = value;
    }
  };

  simDevice.externalize = function() {
    var data = {
      id: simDevice.id,
      deviceName: simDevice.deviceName,
      simulatorId: simDevice.simulatorId,
      isOn: simDevice.isOn.value,
      initialized: simDevice.initialized,
      time: Date.now()
    };
    if (clientDevice.gatewayId) {
      data.gatewayId = clientDevice.gatewayId;
    }
    Object.keys(simDevice.extendedModels).forEach(function(modelURN) {
      simDevice.extendedModels[modelURN].attributes.forEach(function(attribute) {
        data[attribute.name] = attribute.value;
      });
    });
    if (deviceInstance) {
      if (simulatorModel.controls) {
        //clone controls data
        data.controls = simulatorModel.controls;
        data.controls.forEach(function(control) {
          control.value = deviceInstance[control.name];
          // For dropdown controls we also need to provide a list of options
          if (control.type === 'select') {
            control.optionValues = deviceInstance[control.options];
          }
        });
      }
      if (simulatorModel.monitors) {
        data.monitors = simulatorModel.monitors;
        data.monitors.forEach(function(monitor) {
          monitor.value = deviceInstance[monitor.name];
        });
      }
    }
    simDevice.events.forEach(function(event) {
      data[event.name] = event.value;
    });
    data.stateImage = simDevice.stateImage;
    return data;
  };

  simDevice.onAnimation = function() {
    services.io.emit('onAnimation', simDevice.externalize());
  };

  simDevice.sendConditionalAlert = function(alert, extendedModel) {
    var dataObject = {};
    alert.value.fields.forEach(function(field) {
      var name = field.name;
      var value = field.value;
      if ((typeof value === 'string') && (value.indexOf('$') === 0)) {
        var refName = alert.deviceModel + '.' + value.substr(1);
        value = extendedModel.attributes.find(function(attr) {
          return attr.name === refName;
        }).value;
      }
      dataObject[name] = value;
    });
    var alertMessage = {
      urn: alert.urn,
      modelURN: extendedModel.urn,
      data: dataObject
    };
    simDevice.raiseAlert(alertMessage);
  };

  simDevice._checkAlerts = function(extendedModel) {
    extendedModel.formats.filter(function(format) {
      return (format.type === 'ALERT') && !format.visible;
    }).forEach(function(alert) {
      if (alert.condition) {
        var checkResult = simDevice._callFunction(alert.condition, alert.conditionArguments);
        //Raise alert if conditions are satisfied and previous value was false
        if (checkResult && !alert.inEffect) {
          simDevice.sendConditionalAlert(alert, extendedModel);
        }
        alert.inEffect = checkResult;
      }
    });
  };

  /**
   * Advances the simulation, which will update the state of this particular simulated device instance
   * Called by the $interval timer.
   *
   */
  simDevice.stepSimulation = function(firstRun) {
    if (!firstRun && !generateValues) {
      deviceInstance.stepSimulation();
    }
    try {
      //First check if there was event that turns device off
      if (simDevice.events.some(function(event) {
          return event.isOnEvent && event.value;
        })) {
        simDevice.isOn.value = false;
      }

      Object.keys(simDevice.extendedModels).forEach(function(modelURN) {
        var virtualDevice = simDevice.virtualDevices[modelURN];
        if (virtualDevice) {
          var dmX = simDevice.extendedModels[modelURN];
          var dmValues = {};
          dmX.attributes.forEach(function(attribute) {
            // For the first run we already have values from simDevice.initializeValues()
            if (!firstRun) {
              if (generateValues) {
                var applicableEvent = simDevice.events.find(function(event) {
                  return (attribute.events.length !== 0) && (attribute.events.indexOf(event.name) !== -1) &&
                    event.value;
                });
                if (simDevice.isOn.value && applicableEvent) {
                  var attrEventHandler = applicableEvent.attributes[attribute.name];
                  attribute.value = simDevice._callFunction(attrEventHandler.onEventFunction,
                    attrEventHandler.onEventArguments, dmX);
                } else if (simDevice.isOn.value && attribute.onFunction) {
                  attribute.value = simDevice._callFunction(attribute.onFunction, attribute.onArguments,
                    dmX);
                } else if (!simDevice.isOn.value && attribute.offFunction) {
                  attribute.value = simDevice._callFunction(attribute.offFunction, attribute.offArguments,
                    dmX);
                }
              } else {
                attribute.value = deviceInstance.getAttributeValue(attribute.shortName, modelURN);
              }
              //Check that value is in the allowed range
              if ((attribute.type === 'INTEGER') || (attribute.type === 'NUMBER')) {
                if (attribute.range) {
                  var boundaries = attribute.range.split(',', 2);
                  if (attribute.value > boundaries[1]) {
                    console.log("Value generated for attribute '" + attribute.name + "':", attribute.value,
                      'is greater than upper range bound:', boundaries[1]);
                    console.log('Setting to', boundaries[1]);
                    attribute.value = boundaries[1];
                  }
                  if (attribute.value < boundaries[0]) {
                    console.log("Value generated for attribute '" + attribute.name + "':", attribute.value,
                      'is less than lower range bound:', boundaries[0]);
                    console.log('Setting to', boundaries[0]);
                    attribute.value = boundaries[0];
                  }
                  // Casting to correct type
                  attribute.value = Number(attribute.value);
                }
              }
              if (attribute.type === 'INTEGER') {
                attribute.value = Math.round(attribute.value);
              }
            }
            dmValues[attribute.shortName] = attribute.value;
          });
          virtualDevice.update(dmValues);
          if (simDevice.messagesLimit) {
            simDevice.messagesCount += 1;
            if (simDevice.messagesCount >= simDevice.messagesLimit) {
              simDevice.isOn.value = false;
              simDevice.messagesCount = 0;
              simDevice.stopSimulation();
            }
          }
          simDevice._checkAlerts(dmX);
        }
      });
      // Update device image:
      var oldImageName = 'isOffImage';
      if (simDevice.stateImage) {
        oldImageName = simDevice.stateImage.name;
      }
      var newImageName = oldImageName;
      if (deviceInstance) {
        newImageName = deviceInstance.getStateImageName();

      } else if (simDevice.isOn.value) {
        // if exclusive or the only one event is in effect and this event has image use this image
        var eventsImages = [];
        simDevice.events.forEach(function(deviceEvent) {
          if (deviceEvent.value && deviceEvent.image) {
            eventsImages.push(deviceEvent.image);
          }
        });
        if (eventsImages.length === 1) {
          newImageName = eventsImages[0];
        } else {
          newImageName = 'isOnImage';
        }
      } else {
        newImageName = 'isOffImage';
      }

      if (newImageName !== oldImageName) {
        var newImage = imagesMap[newImageName];
        if (newImage) {
          simDevice.stateImage = newImage;
        }
      }
      simDevice.onAnimation();
    } catch (error) {
      console.log('Error during simulation step: ' + error);
    }
  };

  // Setup the timer
  var simulationIntervalId;

  simDevice.startSimulation = function() {
    return new Promise(function(resolve, reject) {
      if (clientDevice.isActivated()) {
        simDevice.uuid = services.utils.uuid();
        simDevice.messagesCount = 0;
        simDevice.initializeValues();
        // now all values are fully initialized
        simDevice.initialized = true;
        simDevice.initializeVirtualDevices().then(function() {
          // run first cycle with initial values
          simDevice.stepSimulation(true);
          simulationIntervalId = setInterval(simDevice.stepSimulation, simDevice.messagingInterval);
          simDevice.started = true;
          resolve();
        }).catch(function(error) {
          reject(error);
        });
      }
    });
  };

  simDevice.stopSimulation = function() {
    simDevice.started = false;
    if (simulationIntervalId) {
      clearInterval(simulationIntervalId);
    }
    Object.keys(simDevice.virtualDevices).forEach(function(vd) {
      simDevice.virtualDevices[vd].close();
    });
  };

};

module.exports = SimulatedDevice;
