'use strict';

var functions = {
  chocolateInventory: function(args) {
    var value = args.currentValue;
    // Check if we need to refill, add a random delay
    if (value === 0 && Math.random() < 0.2) {
       value = 100;
    }
    value -= (1 + parseInt(Math.random() * 5));
    value = Math.max(0, value);
    return value;
  }
};

module.exports = functions;

