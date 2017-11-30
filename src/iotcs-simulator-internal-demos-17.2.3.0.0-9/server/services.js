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
 * Registry of the shared services that we use in our application: such as socket-io, simulationEngine, etc.
 */
module.exports = {
  'register': function(serviceName, service) {
    this[serviceName] = service;
  }
};
