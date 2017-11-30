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
 * This script parses Simulator Model files and completes them with information from
 * device model files providing convenient objects to be used by simulation engine.
 */
var fs = require('fs');
var path = require('path');
var services = require('./services');

var modelsParser = {};

modelsParser.parse = function(modelsDir, configFile) {
  var files = fs.readdirSync(modelsDir);
  var deviceModels = {};
  files.filter(function(file) {
    return fs.statSync(modelsDir + '/' + file).isFile();
  }).filter(function(file) {
    return path.extname(file) === '.json';
  }).forEach(function(file) {
    var model = require(modelsDir + '/' + file);
    // console.log(model);
    deviceModels[model.urn] = model;
  });

  var simulator = require(configFile);
  if (simulator.disabled) {
    return simulator;
  }
  if (!simulator.events) {
    simulator.events = [];
  }

  if (!simulator.images) {
    simulator.images = [];
  }
  simulator.simulatorId = path.basename(path.dirname(configFile));
  simulator.visibleAttributes = [];
  simulator.chartableAttributes = [];

  function getRelatedEvents(attrName) {
    return simulator.events.filter(function(event) {
      if (!event.attributes) {
        return false;
      }
      return Object.keys(event.attributes).indexOf(attrName) !== -1;
    }).map(function(event) {
      return event.name;
    });
  }

  //we need to have an attribute which is responsible for on/off state
  simulator.isOn = {};
  var isOnAttrName = 'isOn';
  if (simulator.isOnAttribute && simulator.isOnAttribute.modelAttributeName) {
    isOnAttrName = simulator.isOnAttribute.modelAttributeName;
    var dotIndex = isOnAttrName.lastIndexOf('.');
    if (dotIndex !== -1) {
      simulator.isOn.attributeModel = isOnAttrName.substr(0, dotIndex);
    }
  }
  simulator.events.forEach(function(event) {
    if (event.attributes && (Object.keys(event.attributes).lastIndexOf(isOnAttrName) !== -1)) {
      event.isOnEvent = true;
    }
  });

  simulator.deviceModelsExtensions.forEach(function(dmExtension) {
    var model = deviceModels[dmExtension.urn];
    // save original model
    dmExtension.model = services.utils.cloneObject(model);
    if (!model.formats) {
      model.formats = [];
      dmExtension.formats = [];
    }
    //Merge device model attributes with their extensions from the simulator model
    model.attributes.forEach(function(modelAttribute) {
      //console.log(modelAttribute);
      var attribute = dmExtension.attributes.find(function(attr) {
        return attr.name === modelAttribute.name;
      });
      if (attribute) {
        Object.assign(attribute, modelAttribute);
        if (attribute.visible) {
          simulator.visibleAttributes.push(attribute);
        }
        if (attribute.chartable) {
          simulator.chartableAttributes.push(attribute);
        }
      } else {
        attribute = modelAttribute;
        dmExtension.attributes.push(modelAttribute);
      }
      if (!attribute.displayName) {
        attribute.displayName = attribute.name;
      }
      attribute.shortName = attribute.name;
      attribute.name = dmExtension.urn + '.' + attribute.name;
      if (simulator.events) {
        attribute.events = getRelatedEvents(attribute.name);
      }
    });
    //Merge formats from the model with their extensions
    simulator.visibleAlerts = [];
    model.formats.forEach(function(modelFormat) {
      //console.log(modelAttribute);
      var xFormat;
      if (dmExtension.formats) {
        xFormat = dmExtension.formats.find(function(format) {
          return format.urn === modelFormat.urn;
        });
      }
      if (xFormat) {
        //save information about value.fields
        var xValue;
        if (xFormat.value) {
          xValue = xFormat.value;
        }
        Object.assign(xFormat, modelFormat);

        // Use current device model URN if not specified explicitly
        if (!xFormat.deviceModel) {
          xFormat.deviceModel = model.urn;
        }

        // merge fields
        // Now extended value.fields were replaced by model data, but
        // we still have this info in xValue
        if (xValue && xValue.fields) {
          xFormat.value.fields.forEach(function(field) {
            var xField = xValue.fields.find(function(extField) {
              return extField.name === field.name;
            });
            if (xField) {
              Object.assign(field, xField);
            }
          });
        }

        if (xFormat.type === 'ALERT' && xFormat.visible) {
          if (!xFormat.displayName) {
            xFormat.displayName = 'SEND: ' + xFormat.description;
          }
          simulator.visibleAlerts.push(xFormat);
        }
      } else {
        xFormat = modelFormat;
        dmExtension.formats.push(xFormat);
      }
      if (xFormat.value) {
        xFormat.value.fields.forEach(function(field) {
          if (typeof field.value === 'undefined') {
            field.value = '$' + field.name;
          }
        });
      }
    });
    //Merge actions from the model with their extension
  });

  function resolveFunctionAndArguments(functionAndArguments) {
    var result = {};
    var functionName = functionAndArguments.functionName;
    var functionArguments = functionAndArguments.functionArguments;
    var resolvedFunc;
    var moduleFunc = functionName.split('.');
    var moduleName = moduleFunc[0];
    var funcName = moduleFunc[1];
    if (moduleName.indexOf('$sharedFunctions') !== 0) {
      if (!services[moduleName]) {
        services.register(moduleName, require('../devices/' + simulator.simulatorId + '/scripts/' + moduleName));
      }
      resolvedFunc = services[moduleName][funcName];
    } else {
      resolvedFunc = services.sharedFunctions[funcName];
    }
    if (functionArguments) {
      if (Object.keys(functionArguments).every(function(key) {
          return (typeof functionArguments[key] !== 'string') || (functionArguments[key].indexOf('$') !== 0);
        })) {
        result.resolvedFunction = resolvedFunc.bind(null, functionArguments);
        return result;
      }
      result.arguments = functionArguments;
    }
    result.resolvedFunction = resolvedFunc;
    return result;
  }

  //Parse functions and partially apply them where possible
  simulator.deviceModelsExtensions.forEach(function(dmX) {
    dmX.attributes.forEach(function(attribute) {
      var resolvedFunctionAndArguments;

      if (attribute.onFunction) {
        resolvedFunctionAndArguments = resolveFunctionAndArguments({
          functionName: attribute.onFunction,
          functionArguments: attribute.onArguments
        });
        attribute.onFunction = resolvedFunctionAndArguments.resolvedFunction;
        if (resolvedFunctionAndArguments.arguments) {
          attribute.onArguments = resolvedFunctionAndArguments.arguments;
        } else {
          delete attribute.onArguments;
        }
      }

      if (attribute.offFunction) {
        resolvedFunctionAndArguments = resolveFunctionAndArguments({
          functionName: attribute.offFunction,
          functionArguments: attribute.offArguments
        });
        attribute.offFunction = resolvedFunctionAndArguments.resolvedFunction;
        if (resolvedFunctionAndArguments.arguments) {
          attribute.offArguments = resolvedFunctionAndArguments.arguments;
        } else {
          delete attribute.offArguments;
        }
      }

    });
    if (dmX.actions) {
      dmX.actions.forEach(function(action) {

        if (action.actionHandler) {
          var resolvedFunctionAndArguments = resolveFunctionAndArguments({
            functionName: action.actionHandler,
            functionArguments: action.actionArguments
          });
          action.actionHandler = resolvedFunctionAndArguments.resolvedFunction;
          if (resolvedFunctionAndArguments.arguments) {
            action.actionArguments = resolvedFunctionAndArguments.arguments;
          } else {
            delete action.actionArguments;
          }
        }
      });
    }
    if (dmX.formats) {
      dmX.formats.filter(function(format) {
        return (format.type === 'ALERT') && (typeof format.condition !== 'undefined');
      }).forEach(function(alert) {
        if (alert.condition) {
          var resolvedFunctionAndArguments = resolveFunctionAndArguments({
            functionName: alert.condition,
            functionArguments: alert.conditionArguments
          });
          alert.condition = resolvedFunctionAndArguments.resolvedFunction;
          if (resolvedFunctionAndArguments.arguments) {
            alert.conditionArguments = resolvedFunctionAndArguments.arguments;
          } else {
            delete alert.conditionArguments;
          }
        }
      });
    }
  });

  simulator.events.forEach(function(event) {

    if (event.attributes) {
      Object.keys(event.attributes).forEach(function(attribute) {
        var attr = event.attributes[attribute];
        if (attr.onEventFunction) {
          var resolvedFunctionAndArguments = resolveFunctionAndArguments({
            functionName: attr.onEventFunction,
            functionArguments: attr.onEventArguments
          });
          attr.onEventFunction = resolvedFunctionAndArguments.resolvedFunction;
          if (resolvedFunctionAndArguments.arguments) {
            attr.onEventArguments = resolvedFunctionAndArguments.arguments;
          } else {
            delete attr.onEventArguments;
          }
        }
      });
    }
  });

  // Process images
  simulator.images.forEach(function(image) {
    var prefix;
    if (image.file.indexOf('$shared/') === 0) {
      image.file = image.file.substr('$shared/'.length);
      prefix = 'client/';
    } else {
      image.file = simulator.simulatorId + '/' + image.file;
      prefix = 'devices/';
    }
    fs.stat(prefix + image.file, function(err, stats) {
      if (err || !stats.isFile()) {
        console.log("Can't find image:", prefix + image.file);
      }
    });
    if (!image.type) {
      image.type = 'auto';
    }
  });
  return simulator;
}
;

module.exports = modelsParser;
