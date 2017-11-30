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
var _ = require('lodash');

// Start in production mode by default
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

var all = {
  env: process.env.NODE_ENV,
  root: path.normalize(__dirname + '/../../..'),
  port: process.env.IoTSimPort || 9010
};

module.exports = _.merge(all, require('./' + all.env + '.js'));
