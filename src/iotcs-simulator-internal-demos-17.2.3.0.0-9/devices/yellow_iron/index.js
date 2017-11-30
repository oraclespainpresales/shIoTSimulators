/**
 * Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

'use strict';
var path = require('path');
var modelsDir = path.resolve(__dirname, 'models');
var configFile = path.resolve(__dirname, 'yellow_iron_simulator.json');
var modelsParser = require('../../server/models.parser');

module.exports = modelsParser.parse(modelsDir, configFile);
