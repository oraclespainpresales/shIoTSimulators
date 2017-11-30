'use strict';

var sharedFunctions = require('../../../server/simulation.functions');

var functions = {
  histogramValue: function(args) {
    var result = "";
    for (var col=4; col<=19; col++) {
      if (col > 4) result += ','
      result += sharedFunctions.csv({object: args.object, fileName: args.fileName, column: col});
    }
    return result;
  },
  wearLevel: function(args) {
    if (args.currentValue===100) {
      return 0;
    }
    if (args.state === 'carriageOscillate') {
      // simulate filament wear
      return 1 + args.currentValue * 0.99;
    }
    if (args.state === 'feedFilament') {
      // repair filament
      return Math.max(0, args.currentValue - 10);
    }
    return args.currentValue;
  }
};

module.exports = functions;

