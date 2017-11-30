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
var fs = require('fs');
var path = require('path');

/**
 * Custom functions for id assignment
 *
 * @namespace
 */
var noiseIdSetter = {};
var idsFile = path.resolve(__dirname, 'noiseids.json');
var savedIds = require(idsFile);

/**
 * Assign locations to
 *
 * @param {object} args - map with arguments
 * @param {number} args.object - Device object
 */
noiseIdSetter.getAssignedId = function(args) {
  var id = savedIds.assignment[args.object.id];
  if (id) {
    return id['noise_sensor_number'];
  }
  id = savedIds.availableNoiseIds[0];
  savedIds.availableNoiseIds.splice(0, 1);
  savedIds.assignment[args.object.id] = id;
  fs.writeFileSync(idsFile, JSON.stringify(savedIds));
  return id['noise_sensor_number'];
};

module.exports = noiseIdSetter;
