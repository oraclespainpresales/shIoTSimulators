/**
 * Created by mismirno on 9/20/2016.
 */
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

/** Miscellaneous utility functions */
var services = require('./services');
var utils = {};
var dcl = services.dclLib({debug: true});

/**
 * Utility function that deep clones an object and returns cloned copy.
 *
 * @param {Object} obj object to clone
 * @returns {Object} deep clone of the obj
 */
utils.cloneObject = function(obj) {
  if ((obj === null) || ((typeof obj !== 'object') && (typeof obj !== 'array'))) { // jshint ignore:line
    return obj;
  }
  if (typeof obj === 'array') { // jshint ignore:line
    return JSON.parse(JSON.stringify(obj));
  }
  var temp = obj.constructor(); // give temp the original obj's constructor
  for (var key in obj) { // jshint ignore:line
    //noinspection JSUnfilteredForInLoop
    temp[key] = utils.cloneObject(obj[key]);
  }
  return temp;
};

/**
 * Returns abbreviation for input string, e.g. 'Sterile Instrument Cart' -> 'SEC'
 *
 * @param {string} str string that should be abbreviated
 * @returns {string} abbreviated string
 */
utils.getAbbreviation = function(str) {
  var abbr = '';
  str.split(' ').forEach(function(word) {
    abbr += word.toLocaleUpperCase().charAt(0);
  });
  return abbr;
};

/**
 * Generates unique identifier according to UUID v4
 *
 * @returns {string} generated identifier string
 */
utils.uuid = function() {
  return dcl.$port.util.uuidv4();
};

module.exports = utils;
