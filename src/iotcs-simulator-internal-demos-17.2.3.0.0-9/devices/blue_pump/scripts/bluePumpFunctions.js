'use strict';

var functions = {

  /**
   * Diagnose action handler.
   */
  diagnostics: function(args) {
    var eventName = 'filterClogged';
    var event = args.object.events.find(function(event) {
      return event.name === eventName;
    });
    var message = {
      urn: 'urn:com:blue:pump:data:diagnostics:report',
      modelURN: 'urn:com:blue:pump:data',
      data: {
        passed: !event.value
      }
    };
    console.log('raiseAlert:');
    console.log(message);
    args.object.raiseAlert(message);
  }
};

module.exports = functions;

