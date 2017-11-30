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
var fs = require('fs');

/**
 * Collection of stateless functions that can be used by simulated devices to generate new values,
 * or check alert conditions.
 *
 * @namespace
 */
var sharedFunctions = {};

/**
 * Generates random float values in the range defined by arguments.
 *
 * @param {object} args - map with arguments
 * @param {number} args.lowerValue - The lower boundary of the range (inclusive).
 * @param {number} args.upperValue - The upper boundary of the range (exclusive).
 */
sharedFunctions.randomInRange = function(args) {
  return args.lowerValue + (Math.random() * (args.upperValue - args.lowerValue));
};

/**
 * Returns minimum value from the values in the provided arguments map. Key names are ignored, only values are used.
 *
 * @param {object} args - map with arguments
 */
sharedFunctions.min = function(args) {
  return Math.min.apply(null, Object.keys(args).map(function name(key) {
    return args[key];
  }));
};

/**
 * Returns maximum value from the values in the provided arguments map. Key names are ignored, only values are used.
 *
 * @param {object} args - map with arguments
 */
sharedFunctions.max = function(args) {
  return Math.max.apply(null, Object.keys(args).map(function name(key) {
    return args[key];
  }));
};

/**
 * Generates values that follows sin(x) function pattern in the range defined by arguments.
 *
 * @param {object} args - map with arguments
 * @param {number} args.lowerValue - The lower boundary of the range.
 * @param {number} args.upperValue - The upper boundary of the range.
 */
sharedFunctions.sinInRange = function(args) {
  return args.lowerValue + (args.upperValue - args.lowerValue) * (1 + Math.sin(Date.now() / 1000)) / 2.0;
};

/**
 * Generates one of 2 values, passed as 'lowerValue' and 'upperValue', different from current value,
 * which is passed as 'currentValue' argument
 *
 * @param {object} args - map with arguments
 * @param {number} args.lowerValue - The lower value.
 * @param {number} args.upperValue - The upper value.
 * @param {number} args.current - The current value.
 */
sharedFunctions.spikesInRange = function(args) {
  return args.lowerValue === args.currentValue ? args.upperValue : args.lowerValue;
};

/**
 * Generates current time value. The function has no arguments.
 */
sharedFunctions.currentTime = function() {
  return Date.now();
};

/**
 * Returns values that follow logarithm pattern from 'currentValue' to 'targetValue'
 *
 * @param {object} args - map with arguments
 * @param {number} args.currentValue - The current value.
 * @param {number} args.targetValue - The target value.
 */
sharedFunctions.logToTarget = function(args) {
  // approximate logarithmic function: a + b*log(t) by 2 points:
  // currentValue corresponds to current time - 1000ms
  // targetValue corresponds to current time + 10000ms
  var t = Date.now();
  var startLog = Math.log(t - 1000);
  var finishLog = Math.log(t + 10000);
  var a = (args.currentValue * finishLog - args.targetValue * startLog) / (finishLog - startLog);
  var b = (args.targetValue - args.currentValue) / (finishLog - startLog);
  return a + b * Math.log(t);
};

/**
 * Returns values that follow linear pattern from 'currentValue' to 'targetValue'
 *
 * @param {object} args - map with arguments
 * @param {number} args.currentValue - The current value.
 * @param {number} args.targetValue - The target value.
 */
sharedFunctions.linearToTarget = function(args) {
  // approximate linear function: a + b*x by 2 points:
  // currentValue corresponds to current time - 1000ms
  // targetValue corresponds to current time + 60000ms (1min)
  var t = Date.now();
  var startTime = (t - 1000);
  var finishTime = (t + 60000);
  var a = (args.currentValue * finishTime - args.targetValue * startTime) / (finishTime - startTime);
  var b = (args.targetValue - args.currentValue) / (finishTime - startTime);
  return a + b * t;
};

/**
 * Returns value passed as an argument
 *
 * @param {object} args - map with argument.
 * @param {*} args.value - Value to be returned.
 */
sharedFunctions.setTo = function(args) {
  return args.value;
};

var csvFiles = {};
var rowNumbers = {};
var deviceRows = {};

/**
 * Returns value from the specified column of a CSV file.
 * It is assumed that the file has no header and does not contain escape characters.
 * Columns numbers start with zero.
 *
 * @param {object} args - map with arguments
 * @param {object} args.object - device object, should be equal to "$this"
 * @param {string} args.fileName - The current value.
 * @param {number} args.column - column number to take value from.
 */
sharedFunctions.csv = function(args) {
  var deviceRowNumbers = rowNumbers[args.object.uuid];
  if (!deviceRowNumbers) {
    deviceRowNumbers = {};
    rowNumbers[args.object.uuid] = deviceRowNumbers;
    deviceRows[args.object.uuid] = 0;
  }
  if (!csvFiles[args.fileName]) {
    console.log('Reading file ' + args.fileName);
    try {
      csvFiles[args.fileName] = fs.readFileSync(args.fileName).toString();
      csvFiles[args.fileName] = csvFiles[args.fileName].split('\n').filter(function(el) {
        return el.length !== 0;
      });
      for (var i = 0; i < csvFiles[args.fileName].length; i++) {
        csvFiles[args.fileName][i] = csvFiles[args.fileName][i].split(',');
      }
    } catch (e) {
      console.log(e);
      console.log('Error reading file ' + args.fileName);
      return;
    }
  }
  if (!deviceRowNumbers[args.fileName]) {
    deviceRowNumbers[args.fileName] = [];
  }
  // Check if we need to advance to the next row
  if (deviceRows[args.object.uuid] === deviceRowNumbers[args.fileName][args.column]) {
    deviceRows[args.object.uuid]++;
    // Start from the beginning if we reached the end of data
    if (deviceRows[args.object.uuid] >= csvFiles[args.fileName].length) {
      deviceRows[args.object.uuid] = 0;
      deviceRowNumbers[args.fileName] = [];
    }
  }
  deviceRowNumbers[args.fileName][args.column] = deviceRows[args.object.uuid];

  var value = csvFiles[args.fileName][deviceRows[args.object.uuid]][args.column];
  // Check if the value is a boolean
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }

  // Check if the value is a number
  if (!isNaN(value) && value !== '') {
    return parseFloat(value);
  }
  // Check if the value is a quoted string
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.substring(1, value.length - 1);
    // escaped quotation marks
    value = value.replace(/""/g, '"');
  }

  return value;
};

//***********************
// Actions
//************************

/**
 * Negates value of an object's property.
 *
 * @param {object} args - map with arguments
 * @param {object} args.object - affected object.
 * @param {string} args.property - property of the object to be changed.
 */
sharedFunctions.switch = function(args) {
  args.object[args.property].value = !args.object[args.property].value;
};

/**
 * Sets values for object's attributes, which can be device model attributes or just properties of the object.
 *
 * @param {object} args - map with keys 'object', 'urn' and multiple keys which are attribute names
 * @param {object} args.object - affected object
 * @param {string} [args.urn] - specified in case of attribute from a device model
 * @example
 * <caption>The following invocation modifies isOn property of the current object</caption>
 * sharedFunctions.setAttributeValues({"object": "$this", "isOn": "$value"});
 * @example
 * <caption>And the following invocation modifies 'startTime' attribute from the Temperature Sensor
 * device model</caption>
 * sharedFunctions.setAttributeValues ({
            'object': '$this',
            'urn': 'urn:com:oracle:iot:device:temperature_sensor',
            'startTime': '$now'
          });
 */
sharedFunctions.setAttributeValues = function(args) {
  Object.keys(args).forEach(function(property) {
    if ((property !== 'object') && (property !== 'urn')) {
      var attribute;
      if (args.urn) {
        attribute = args.object.extendedModels[args.urn].attributes.find(function(attr) {
          return attr.name === (args.urn + '.' + property);
        });
      }
      if (attribute) {
        attribute.value = args[property];
      } else {
        args.object[property].value = args[property];
      }
    }
  });
};

/**
 * Sets values for object's attributes and/or
 *
 * @param {object} args - map with keys 'object', 'urn' and multiple keys which are attribute names
 * @param {object} args.object - affected object
 * @param {string} [args.urn] - specified in case of attribute from a device model
 *
 * @example
 * <caption>The following invocation modifies several attributes from the Temperature Sensor device model
 * and switches a couple of events defined in the Temperature Sensor Simulator Model</caption>
 * sharedFunctions.setAttributeValues ({
            'object': '$this',
            'urn': 'urn:com:oracle:iot:device:temperature_sensor',
            'attributes': {
              'maxTemp': '$temp',
              'minTemp': '$temp',
              'startTime': '$now'
            },
            'events': {
              'eventMinThreshold': false,
              'eventMaxThreshold': false
            }
          });
 */
sharedFunctions.setAttributeAndEventValues = function(args) {
  Object.keys(args).forEach(function(property) {
    if (property === 'attributes') {
      Object.keys(args[property]).forEach(function(attrName) {
        var attribute;
        if (args.urn) {
          attribute = args.object.extendedModels[args.urn].attributes.find(function(attr) {
            return attr.name === (args.urn + '.' + attrName);
          });
        }
        if (attribute) {
          attribute.value = args[property][attrName];
        } else {
          args.object[attrName].value = args[property][attrName];
        }
      });
    } else if (property === 'events') {
      Object.keys(args[property]).forEach(function(eventName) {
        var event = args.object.events.find(function(event) {
          return event.name === eventName;
        });
        if (event) {
          event.value = args[property][eventName];
        }
      });
    }
  });
};

//***********************
// Conditions: return true or false.
//************************

/**
 * Checks whether a value is in the provided range.
 *
 * @param {object} args - map with arguments
 * @param {number} args.lowerValue - The lower boundary of the range (inclusive).
 * @param {number} args.upperValue - The upper boundary of the range (inclusive).
 * @param {number} args.value - The value to be checked.
 * @returns {Boolean} true if the value is in the specified range, false otherwise
 */
sharedFunctions.valueInRange = function(args) {
  return (args.value >= args.lowerValue) && (args.value <= args.upperValue);
};

/**
 * Checks whether a value greater or equal to another value.
 *
 * @param {object} args - map with arguments
 * @param {number} args.leftOperand - The left operand of the '>=' comparison.
 * @param {number} args.rightOperand - The right operand of the '>=' comparison.
 * @returns {Boolean} true if the left operand value is greater than or equal to the right operand value,
 * false otherwise.
 */
sharedFunctions.greaterOrEqual = function(args) {
  return args.leftOperand >= args.rightOperand;
};

/**
 * Checks whether a value greater than another value.
 *
 * @param {object} args - map with arguments
 * @param {number} args.leftOperand - The left operand of the '>' comparison.
 * @param {number} args.rightOperand - The right operand of the '>' comparison.
 * @returns {Boolean} true if the left operand value is greater than the right operand value, false otherwise.
 */
sharedFunctions.greater = function(args) {
  return args.leftOperand > args.rightOperand;
};

/**
 * Checks whether a value is less than or equal to another value.
 *
 * @param {object} args - map with arguments
 * @param {number} args.leftOperand - The left operand of the '<'= comparison.
 * @param {number} args.rightOperand - The right operand of the '<=' comparison.
 * @returns {Boolean} true if the left operand value is less than or equal to the right operand value, false otherwise.
 */
sharedFunctions.lessOrEqual = function(args) {
  return args.leftOperand <= args.rightOperand;
};

/**
 * Checks whether a value is less than another value.
 *
 * @param {object} args - map with arguments
 * @param {number} args.leftOperand - The left operand of the '<' comparison.
 * @param {number} args.rightOperand - The right operand of the '<' comparison.
 * @returns {Boolean} true if the left operand value is less than the right operand value, false otherwise.
 */
sharedFunctions.less = function(args) {
  return args.leftOperand < args.rightOperand;
};

/**
 * Checks whether a value is equal to another value.
 *
 * @param {object} args - map with arguments
 * @param {number} args.leftOperand - The left operand of the equality comparison.
 * @param {number} args.rightOperand - The right operand of the equality comparison.
 * @returns {Boolean} true if the left operand value is equal to the right operand value, false otherwise.
 */
sharedFunctions.equal = function(args) {
  return args.leftOperand === args.rightOperand;
};

/**
 * Checks whether a value is not equal to another value.
 *
 * @param {object} args - map with arguments
 * @param {number} args.leftOperand - The left operand of the non-equality comparison.
 * @param {number} args.rightOperand - The right operand of the non-equality comparison.
 * @returns {Boolean} true if the left operand value is not equal to the right operand value, false otherwise.
 */
sharedFunctions.notEqual = function(args) {
  return args.leftOperand !== args.rightOperand;
};

sharedFunctions.functions = [
  {
    name: '$sharedFunctions.randomInRange', arguments: [
    {name: 'lowerValue', type: 'NUMBER'},
    {name: 'upperValue', type: 'NUMBER'}]
  },
  {
    name: '$sharedFunctions.logToTarget', arguments: [
    {name: 'currentValue', type: 'NUMBER'},
    {name: 'targetValue', type: 'NUMBER'}]
  },
  {
    name: '$sharedFunctions.linearToTarget', arguments: [
    {name: 'currentValue', type: 'NUMBER'},
    {name: 'targetValue', type: 'NUMBER'}]
  },
  {
    name: '$sharedFunctions.setTo', arguments: [
    {name: 'value', type: 'AUTO'}]
  },
  {
    name: '$sharedFunctions.sinInRange', arguments: [
    {name: 'lowerValue', type: 'NUMBER'},
    {name: 'upperValue', type: 'NUMBER'}]
  },
  {
    name: '$sharedFunctions.spikesInRange', arguments: [
    {name: 'currentValue', type: 'NUMBER'},
    {name: 'lowerValue', type: 'NUMBER'},
    {name: 'upperValue', type: 'NUMBER'}]
  },
  {
    name: '$sharedFunctions.max', arguments: [
    {name: 'arg1', type: 'NUMBER'},
    {name: 'arg2', type: 'NUMBER'}]
  },
  {
    name: '$sharedFunctions.min', arguments: [
    {name: 'arg1', type: 'NUMBER'},
    {name: 'arg2', type: 'NUMBER'}]
  },
  {
    name: '$sharedFunctions.csv', arguments: [
    {name: 'object', type: 'STRING', default: '$this', readonly: true},
    {name: 'fileName', type: 'FILE'},
    {name: 'column', type: 'INTEGER'}]
  }
];

sharedFunctions.conditions = [
  {
    name: '$sharedFunctions.equal', arguments: [
    {name: 'leftOperand', type: 'AUTO'},
    {name: 'rightOperand', type: 'AUTO'}]
  },
  {
    name: '$sharedFunctions.valueInRange', arguments: [
    {name: 'value', type: 'NUMBER'},
    {name: 'lowerValue', type: 'NUMBER'},
    {name: 'upperValue', type: 'NUMBER'}]
  },
  {
    name: '$sharedFunctions.greater', arguments: [
    {name: 'leftOperand', type: 'NUMBER'},
    {name: 'rightOperand', type: 'NUMBER'}]
  },
  {
    name: '$sharedFunctions.less', arguments: [
    {name: 'leftOperand', type: 'NUMBER'},
    {name: 'rightOperand', type: 'NUMBER'}]
  },
  {
    name: '$sharedFunctions.greaterOrEqual', arguments: [
    {name: 'leftOperand', type: 'NUMBER'},
    {name: 'rightOperand', type: 'NUMBER'}]
  },
  {
    name: '$sharedFunctions.lessOrEqual', arguments: [
    {name: 'leftOperand', type: 'NUMBER'},
    {name: 'rightOperand', type: 'NUMBER'}]
  },
  {
    name: '$sharedFunctions.notEqual', arguments: [
    {name: 'leftOperand', type: 'NUMBER'},
    {name: 'rightOperand', type: 'NUMBER'}]
  }
];

sharedFunctions.handlers = [
  {
    name: '$sharedFunctions.switch', arguments: [
    {name: 'object', type: 'STRING', default: '$this', readonly: true},
    {name: 'property'}]
  }
];

services.register('sharedFunctions', sharedFunctions);
module.exports = sharedFunctions;
