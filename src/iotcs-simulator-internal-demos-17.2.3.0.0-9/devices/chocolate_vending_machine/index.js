'use strict';
var path = require('path');
var modelsDir = path.resolve(__dirname, 'models');
var configFile = path.resolve(__dirname, 'chocolate_vending_machine_simulator.json');
var modelsParser = require('../../server/models.parser');
module.exports = modelsParser.parse(modelsDir, configFile);
