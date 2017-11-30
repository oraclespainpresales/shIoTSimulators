/**
 * Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */
/* jshint camelcase: false */
/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
'use strict';

var fs = require('fs');
var path = require('path');

var cacheDir = path.resolve(__dirname, './cache');

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir);
}

var maps = require('./maps/googleMaps');

// GLOBAL VARIABLES
var config = require('./iron_config.json');
var LOCATIONS = config.locations;

/**
 * The Yellow Iron Simulation engine.
 *
 * @constructor
 */
var YellowIronSimulator = function() {
  var sim = this;

  /**
   * Gets all destinations
   */
  sim.getAllDestinations = function() {
    return LOCATIONS; // TODO good coding would require making a copy...
  };

};

YellowIronSimulator.prototype = {
  createDevice: function(simulatorModel, deviceID, restore) {
    var iron = new YellowIron(simulatorModel, deviceID, restore);
    return iron;
  }
};

var YellowIron = function(simulatorModel, deviceID, restore) { // jshint ignore:line
  var iron = this;
  var ironSimulatorModel = simulatorModel;

  Object.defineProperty(iron, 'locations', {
    value: LOCATIONS,
    enumerable: true,
    writable: false
  });

  /**
   * The IoT CS device id
   */
  iron.id = deviceID;

  /**
   * The current fuel level of the vehicle. It starts off at
   * some random value between 0 and 100, where 0 is zero
   * percent and 100 is 100 percent.
   */
  iron.fuelLevel = Math.random() * 100;

  /**
   * The current engine temperature. It should be around 315 at idle,
   * 330 when running, 380 is high. It can cool all the way down to 65
   * when the engine is off.
   */
  iron.engineTemp = (Math.random() * 50) + 315;

  /**
   * Engine oil pressure. Normal is 4500 - 4700. Less than 4000 is bad.
   */
  iron.engineOilPressure = (Math.random() * 200) + 4500;

  /**
   * I don't know what realistic values for this are...
   */
  iron.hydraulicPressure = 115;

  /**
   * Engine vibration in kHZ. 2-2.5 is normal, 4 is bad.
   */
  iron.engineVibration = (Math.random() * 1.5) + 2;

  /**
   * This is either working or broken!
   */
  iron.electricalSystemGood = true;

  /**
   * Whether the machine is "running", that is, turned on. It might be working,
   * or it might be idle. Either way, it is on.
   */
  iron.running = true;

  /**
   * Whether the machine is driving from an origin to a destination
   */
  iron.driving = false;

  /**
   * Whether the machine is idling. This is a boolean state.
   */
  iron.idling = Math.random() >= 0.9;

  /**
   * Set by the simulator, this is the name of the origin location for this
   * yellow iron.
   */
  iron.origin = '';

  /**
   * Set by the simulator, the name of the destination location.
   */
  iron.destination = '';

  /**
   * The current speed of the unit, if it is moving (not idle). Typically this
   * is a fairly small value (a 3-4 MPH), unless it is on the move to a new
   * job site.
   */
  iron.speed = 0; // in MPH

  iron.time = Date.now();

  /**
   * The location in latitude of the machine. This must be set by the caller
   * in relation to the startLocation.
   */
  iron.ora_latitude = 0;

  /**
   * The location in longitude of the machine. This must be set by the caller
   * in relation to the startLocation.
   */
  iron.ora_longitude = 0;

  /**
   * Distance to the destination. -1 indicates it is unknown.
   */
  iron.distanceToDestination = -1;

  /**
   * The number of seconds until we get to the destination. -1 indicates it is unknown.
   */
  iron.eta = -1;

  /**
   * The start location is a named location that comes
   * from the list of start locations maintained by the
   * simulation. You can think of it as an enum of sorts.
   */
  iron.origin = LOCATIONS[Math.round(Math.random() * (LOCATIONS.length - 1))];

  /**
   * Give it a default destination.
   */
  iron.destination = LOCATIONS[Math.round(Math.random() * (LOCATIONS.length - 1))];

  /**
   * Some random speed
   */
  iron.speed = Math.round(Math.random() * 40);

  iron.fuelConsumptionIncrement = 0;
  iron.workingHoursIncrement = 0;
  iron.idleHoursIncrement = 0;

  iron.getState = function() {
    return iron.running ? (iron.driving ? 'Driving' : iron.idling ? 'Idle' : 'Working') : 'Stopped';
  };

  iron.state = iron.getState();

  /**
   * A mapping route between the origin and destination
   */
  var currentRoute;

  // Asynchronous call
  startNewRoute(iron.origin, iron.destination).then(function(route) {
    currentRoute = route;
    console.log(JSON.stringify(route.routeInfo.points[0]));
    iron.ora_latitude = route.routeInfo.points[0].lat;
    iron.ora_longitude = route.routeInfo.points[0].lon;
  });

  /**
   * The amount of time until a change in the idle property occurs. Minimum value is 3 seconds,
   * max is 70 seconds. The minimum time we can be not idle is 15 seconds, max is 30. Unless
   * we're trucking down a road of course, in which case the time is based on how far we
   * have to go to get to the new destination.
   */
  var timeToIdleChange = iron.idling ? (Math.random() * 60) + 10 : (Math.random() * 15) + 15;

  /**
   * The oil pressure value that we are attempting to animate towards. When oil pressure
   * changes (for example, when an oil pressure loss event happens), then we will state a
   * target oil pressure, and start bleeding pressure down to that level. We also use this
   * while just animating between idle and working pressures.
   */
  var targetOilPressure = (Math.random() * 200) + 4500;

  /**
   * The delta to apply while moving towards the target oil pressure. We might apply some
   * randomness to this so it isn't a straight curve.
   */
  var oilPressureDelta = Math.random() * 10;

  /**
   * The engine temperature value that we are attempting to animate towards.
   */
  var targetEngineTemp = (Math.random() * 50) + 315;

  /**
   * The delta to apply while moving towards the target engine temp. We might apply some
   * randomness to this so it isn't a straight curve.
   */
  var engineTempDelta = Math.random() * 10;

  /**
   * The amount of fuel being burned. This might change whether the vehicle is idle or moving.
   * It also can be quite high in an out of fuel event scenario.
   */
  var fuelLossDelta = -0.02;

  /**
   *  Becomes true if we have naturally ran out of fuel. In that case, we will refuel automatically
   *  and then restart the engine automatically (over some period of time of course!).
   */
  var naturallyRanOutOfFuel = false;

  var outOfFuelEventInProgress = false;

  var oilPressureLossEventInProgress = false;

  /**
   * The current distance from the origin along our path that we have traveled.
   */
  var currentRouteDistanceTraveled = 0;

  iron.getAttributeValue = function(attributeName, modelURN) { // jshint ignore:line
    return iron[attributeName];
  };

  iron.getStateImageName = function() {
    if (!iron.running) {
      return 'deviceOffImage';
    } else if (iron.idling && !iron.driving) {
      return 'deviceOnImage';
    } else if (iron.driving) {
      return 'deviceAnimImage';
    } else {
      return 'deviceWorkingImage';
    }
  };

  /**
   * Sudden loss of fuel. When this is called, we dump all fuel quickly and turn
   * off the machine.
   */
  iron.eventOutOfFuel = function() {
    outOfFuelEventInProgress = true;
    fuelLossDelta = -(Math.random() * 25) - 25;
    iron.eventEngineStopped();
  };

  /**
   * Refueling of the machine. This happens instantly when called.
   */
  iron.eventRefueled = function() {
    outOfFuelEventInProgress = false;
    iron.fuelLevel = 100;
    fuelLossDelta = -0.02;
  };

  /**
   * Sudden loss of oil pressure. When this transitions to true, we bleed the pressure off
   * over time. This also causes the engine temperature to start increasing.
   */
  iron.eventLossOfOilPressure = function() {
    oilPressureLossEventInProgress = true;
    targetOilPressure = 0;
    oilPressureDelta = -(Math.random() * 100) - 100;
    targetEngineTemp = 550;
    engineTempDelta = (Math.random() * 20) + 10;
  };

  /**
   * Set the target oil pressure back to where it should be
   */
  iron.eventOilPressureRestored = function() {
    oilPressureLossEventInProgress = false;
    if (iron.running) {
      targetOilPressure = (Math.random() * 200) + 4500;
      oilPressureDelta = (Math.random() * 500) + 500;
      targetEngineTemp = 330;
      engineTempDelta = (Math.random() * 20) * (targetEngineTemp < iron.engineTemp ? -1 : 1);
    }
  };

  /**
   * Sudden issue with the electrical system.
   */
  iron.eventElectricalSystemFault = function() {
    iron.electricalSystemGood = false;
    iron.eventEngineStopped();
  };

  /**
   * Restoration of the electrical system.
   */
  iron.eventElectricalSystemFixed = function() {
    iron.electricalSystemGood = true;
  };

  iron.setOn = function(isOn) {
    if (isOn) {
      iron.eventEngineStarted();
    } else {
      iron.eventEngineStopped();
    }
  };

  /**
   * Called when the engine is stopped.
   */
  iron.eventEngineStopped = function() {
    iron.running = false;

    // If the engine stops, we need to decrease the oil pressure
    targetOilPressure = 0;
    oilPressureDelta = -1000;

    // We need to stop consuming fuel (unless there was a leak!)
    if (!outOfFuelEventInProgress) {
      fuelLossDelta = 0;
    }

    // The engine stops vibrating!
    iron.engineVibration = 0;
    iron.idling = true;
    iron.speed = 0;

    // The engine needs to start cooling off
    engineTempDelta = -2;
    targetEngineTemp = 65;
  };

  /**
   * Called when the engine is started.
   */
  iron.eventEngineStarted = function() {
    // Only restart the engine if it can be restarted
    if (!oilPressureLossEventInProgress && !outOfFuelEventInProgress &&
      iron.electricalSystemGood &&
      iron.fuelLevel > 0) {

      iron.running = true;
      targetOilPressure = (Math.random() * 200) + 4500;
      oilPressureDelta = (Math.random() * 500) + 500;
      iron.engineVibration = (Math.random() * 1.5) + 2;
      fuelLossDelta = -0.02;
      engineTempDelta = 10;
      targetEngineTemp = 315;

      // TODO if we are in the middle of moving somewhere, set speed to something.

      iron.idling = true;
      timeToIdleChange = 10; // Give it 10 seconds before it starts working.
    }
  };

  iron.eventHandlers = {
    'outOfFuel': [iron.eventOutOfFuel, iron.eventRefueled],
    'lossOfOilPressure': [iron.eventLossOfOilPressure, iron.eventOilPressureRestored],
    'electricalSystemFault': [iron.eventElectricalSystemFault, iron.eventElectricalSystemFixed],
  };

  iron.onEvent = function(eventName, isActive) {
    if (isActive) {
      iron.eventHandlers[eventName][0].call(null);
    } else {
      iron.eventHandlers[eventName][1].call(null);
    }
  };

  iron.startDriving = function() {
    iron.driving = true;
  };

  iron.stopDriving = function() {
    iron.driving = false;
  };

  iron.checkRanges = function(iron, modelURN, attributes) {
    var dm = ironSimulatorModel.deviceModelsExtensions.find(function(dmX) {
      return dmX.urn === modelURN;
    });
    attributes.forEach(function(attrName) {
      var modelAttr = dm.attributes.find(function(attr) {
        return attr.name === modelURN + '.' + attrName;
      });
      if (modelAttr.range) {
        var boundaries = modelAttr.range.split(',', 2);
        if (iron[attrName] > boundaries[1]) {
          console.log("Value generated for attribute '" + attrName + "':", iron[attrName],
            'is greater than upper range bound:', boundaries[1]);
          iron[attrName] = boundaries[1];
          if (modelAttr.type === 'NUMBER') {
            iron[attrName] = boundaries[1] * 1.0;
          }
          console.log('Setting to', iron[attrName]);
        }
        if (iron[attrName] < boundaries[0]) {
          console.log("Value generated for attribute '" + attrName + "':", iron[attrName],
            'is less than lower range bound:', boundaries[0]);
          iron[attrName] = boundaries[0];
          if (modelAttr.type === 'NUMBER') {
            iron[attrName] = boundaries[0] * 1.0;
          }
          console.log('Setting to', iron[attrName]);
        }
      }
    });
  };

  iron.createPayload = function() {
    iron.checkRanges(iron, 'urn:oracle:yellow:iron:machine:data',
      ['fuelLevel', 'engineTemp', 'engineVibration', 'engineOilPressure', 'hydraulicPressure']);
    return {
      fuelLevel: iron.fuelLevel,
      engineTemp: iron.engineTemp,
      engineVibration: iron.engineVibration,
      engineOilPressure: iron.engineOilPressure,
      hydraulicPressure: iron.hydraulicPressure,
      latitude: iron.ora_latitude,
      longitude: iron.ora_longitude
    };
  };

  /**
   * Takes the next step in the simulation. This is called approx. once per second.
   * We will *always* send an event to the server, whether anything changed or not.
   * This is mostly so that when showing Stream Explorer, there are continuous events
   * being sent and processed (it demos better).
   */
  iron.stepSimulation = function() {
    var originalState = JSON.stringify(iron.createPayload());
    var originalFuelLevel = iron.fuelLevel;
    var originalRunningState = iron.running;
    var originalIdleState = iron.idling;

    // Will hold the new value for whatever it is we are modifying at the moment.
    var newValue;

    // Various events may have been called on the machine since the last time we
    // ran ths simulation. Those events would have caused changes to state that we use
    // for simulation purposes. This is nice, because it means all we have to do is
    // modify the various properties according to their deltas.

    // Adjust the amount of fuel
    if (iron.running || outOfFuelEventInProgress || naturallyRanOutOfFuel) {
      newValue = iron.fuelLevel + fuelLossDelta;
      iron.fuelLevel = Math.max(0, newValue); // Clamp above or equal to 0
      iron.fuelLevel = Math.min(iron.fuelLevel, 100); // Clamp below or equal to 100
      if (iron.fuelLevel === 100 && naturallyRanOutOfFuel) {
        // Done refueling, start the engine
        naturallyRanOutOfFuel = false;
        iron.eventEngineStarted();
      } else if (iron.fuelLevel === 0) {
        // We've run out of fuel. Stop the engine.
        iron.eventEngineStopped();

        if (!outOfFuelEventInProgress) {
          // Refuel if we ran out of fuel naturally
          naturallyRanOutOfFuel = true;
          fuelLossDelta = 20; // fill up 20% each second.
        }
      }
    }

    // Adjust the engine temperature
    newValue = iron.engineTemp + engineTempDelta;
    iron.engineTemp = Math.max(65, newValue); // Don't allow it to go under 65
    if ((engineTempDelta < 0 && iron.engineTemp < targetEngineTemp) ||
      (engineTempDelta > 0 && iron.engineTemp > targetEngineTemp)) {
      // If we've crossed the target engine temp, then pull back to the target!
      iron.engineTemp = targetEngineTemp;
      // Set a new target relatively close to where we are now
      targetEngineTemp += ((Math.random() * 20) - 10);
    }

    // We blew the engine!! We should do more than stop, we should also fire
    // a special type of event, but we don't yet :-(. So we'll pretend that
    // there is an automatic engine cut-off at 600 degrees.
    if (iron.engineTemp > 600) {
      iron.eventEngineStopped();
    }

    // Adjust the oil pressure
    newValue = iron.engineOilPressure + oilPressureDelta;
    iron.engineOilPressure = Math.max(0, newValue);
    if ((oilPressureDelta < 0 && iron.engineOilPressure < targetOilPressure) ||
      (oilPressureDelta > 0 && iron.engineOilPressure > targetOilPressure)) {
      // If we've crossed the target oil pressure, then pull back to the target!
      iron.engineOilPressure = targetOilPressure;
      // Set a new target relatively close to where we are now
      targetOilPressure += ((Math.random() * 200) - 100);
    }

    if (iron.engineOilPressure > 6000) {
      // Something went dreadfully wrong. Blown engine.
      iron.eventEngineStopped();
    }

    // Adjust the hydraulic pressure
    if (iron.running) {
      iron.hydraulicPressure = 115 + (Math.random() * 2) - 1;
    }

    // Adjust the engine vibration
    if (!iron.running) {
      iron.engineVibration = 0;
    } else if (iron.idling && !iron.driving) {
      iron.engineVibration = 2 + (Math.random() * 0.1);
      fuelLossDelta = -0.01;
    } else if (!iron.idling && !iron.driving) {
      iron.engineVibration = 2.5 + (Math.random() * 0.1);
      fuelLossDelta = -0.02;
    } else if (iron.driving) {
      iron.engineVibration = 3.5 + (Math.random() * 0.1);
      fuelLossDelta = -0.05;
    }

    // Adjust whether we are going to start idling or not. If we are, then
    // we need to change a bunch of target values for fuel consumption etc.
    if (iron.running && !iron.driving) {
      if (--timeToIdleChange < 0) {
        iron.idling = !iron.idling;
        if (iron.idling) {
          timeToIdleChange = (Math.random() * 60) + 10;
          // Engine temp should start to cool off -- unless we've got some
          // event going on!
          // Engine oil pressure should come down a bit, unless we have an event happening
          if (!oilPressureLossEventInProgress) {
            targetEngineTemp = 315;
            engineTempDelta = -1;
            targetOilPressure -= 50;
            oilPressureDelta = -2;
          }
        } else {
          timeToIdleChange = (Math.random() * 15) + 15;
          // Engine temp should start to go up -- unless we've got some
          // event going on!
          // Engine oil pressure should go up a bit, unless we have an event happening
          if (!oilPressureLossEventInProgress) {
            targetEngineTemp = (Math.random() * 50) + 330;
            engineTempDelta = 2;
            targetOilPressure = 4700;
            oilPressureDelta = 2;
          }
        }
      }
    }

    // Respond to a change in the current route. If the end of the currentRoute !=
    // the end of the iron then we need to create a new current route.
    if (currentRoute !== undefined && ((currentRoute.end !== iron.destination) ||
      (currentRoute.start !== iron.origin))) {
      startNewRoute(iron.origin, iron.destination).then(function(route) {
        currentRoute = route;
        console.log(JSON.stringify(route.routeInfo.points[0]));
        iron.ora_latitude = route.routeInfo.points[0].lat;
        iron.ora_longitude = route.routeInfo.points[0].lon;
      });
    }

    // Could be null due to the asynchronous nature of the call
    if (currentRoute !== undefined) {
      // Update the distance to destination (no matter what)
      iron.distanceToDestination = (maps.getDistanceRemainingToEnd(
        currentRoute.routeInfo, {lat: iron.ora_latitude, lon: iron.ora_longitude}) * 0.000621371).toFixed(1);

      // Update the ETA (sadly, this also is asynchronous)
      var currentTime = Date.now();
      // iron.speed is in miles per hour, but for ETA must be meters per second
      var speed = iron.speed / (0.000621371 * 60 * 60);
      maps.calculateEta(
        iron.origin, iron.destination, currentTime, iron.ora_latitude, iron.ora_longitude, speed)
        .then(function(result) {
          iron.eta = result;
        });

      // Move along the path!
      if (iron.running && iron.driving) {
        // Speed is in meters per second, and distance is the distance traveled in 1 second.
        // Convenient. Almost like I planned it that way.
        var distance = currentRouteDistanceTraveled + speed;
        var point = maps.getPointAlongRoute(currentRoute.routeInfo, distance);
        if (point === null) {
          // We're done!
          point = currentRoute.routeInfo.points[currentRoute.routeInfo.points.length - 1];
          iron.driving = false;
          iron.origin = iron.destination;
        } else {
          currentRouteDistanceTraveled = distance;
        }
        iron.ora_latitude = point.lat;
        iron.ora_longitude = point.lon;
      }
    }

    // Finally, time to send the data message if the iron state has changed
    iron.fuelConsumptionIncrement = originalFuelLevel > iron.fuelLevel ? (originalFuelLevel - iron.fuelLevel) : 0;
    // Actually sending per-minute instead of per-hour, because it doesn't show so well in the
    // demo since the gallon increments are so small per-second
    iron.workingHoursIncrement = originalRunningState && iron.running ? 0.01666666667 : 0; //0.0002777777778 : 0,
    iron.idleHoursIncrement = originalIdleState && iron.idling ? 0.01666666667 : 0; //0.0002777777778 : 0
    var payload = iron.createPayload();
    var newState = JSON.stringify(payload);
    if (newState !== originalState || iron.fuelConsumptionIncrement > 0 || iron.workingHoursIncrement > 0 ||
      iron.idleHoursIncrement > 0) {
      payload.fuelConsumptionIncrement = iron.fuelConsumptionIncrement;
      payload.workingHoursIncrement = iron.workingHoursIncrement;
      payload.idleHoursIncrement = iron.idleHoursIncrement;
    }
    iron.state = iron.getState();
    iron.time = Date.now();
  };

  function startNewRoute(start, end) {
    var startTime = Date.now();
    console.log('startNewRoute: startTime=', startTime);
    return maps.getRouteInfo(start, end)
      .then(function(routeInfo) {
        // return the starting info
        return Promise.resolve({
          start: start,
          end: end,
          startTime: startTime,
          routeInfo: routeInfo
        });
      });
  }

};

module.exports = YellowIronSimulator;
