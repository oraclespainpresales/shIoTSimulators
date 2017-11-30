/**
 * Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */
'use strict';

var express = require('express');
var compression = require('compression');
var morgan = require('morgan');
var path = require('path');
var bodyParser = require('body-parser');

var config = require('./environment');

module.exports = function(app) {

  var env = config.env;

  app.set('view engine', 'html');
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());
  app.use(compression());
  app.use(morgan('dev'));
  app.use(express.static(path.join(config.root, 'client')));
  app.use(express.static(path.join(config.root, 'devices')));
  app.set('appPath', 'client');

  if (env === 'development' || env === 'test') {
    app.use(require('errorhandler')());
  }

};
