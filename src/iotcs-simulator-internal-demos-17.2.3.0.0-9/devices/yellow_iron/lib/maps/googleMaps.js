/**
 * Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */
'use strict';

var fs = require('fs');
var path = require('path');
var request = require('request');
var polyline = require('polyline');

var maps = {};

var GOOGLE_API_KEY_JP = 'AIzaSyAoV2yCoGFENJJlWIdHrFtC92cnIU5bB70';
var GOOGLE_DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json?key=' + GOOGLE_API_KEY_JP;
var CACHE_DIR = path.resolve(__dirname, '../cache/google-directions');

// create cache directory if it doesn't exist
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

/**
 * Get the decoded overview polyline from a google route object
 *
 * @param {Object} route Google route object
 * @returns {Array} Array of [lat,lon] points
 */
maps.getPolyline = function(route) {
  /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
  return polyline.decode(route.routes[0].overview_polyline.points); // jshint ignore:line
  /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
};

/**
 * Calculate the distance along the earths surface between two lat/long points
 *
 * @param {Object} point1 A point on the earths surface represented by [lat,lon]
 * @param {Object} point2 A point on the earths surface represented by [lat,lon]
 * @returns {Number}  Distance in meters
 */
maps.distance = function(point1, point2) {
  var lat1 = point1[0];
  var lon1 = point1[1];
  var lat2 = point2[0];
  var lon2 = point2[1];
  var φ1 = lat1 * (Math.PI / 180);
  var φ2 = lat2 * (Math.PI / 180);
  var Δλ = (lon2 - lon1) * (Math.PI / 180);
  var R = 6371000; // gives d in metres
  return Math.acos(Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)) * R;
};

/**
 * get google route for route from start to end, results are cached locally in files
 *
 * @param {String} start   The start location like 'San Jose, CA'
 * @param {String} end     The end location like 'Santa Clara, CA'
 * @returns {*}   Promise resolving to a google route object
 */
maps.getRoute = function(start, end) {
  var fileName = CACHE_DIR + '/' + start + '-to-' + end + '.json';
  if (!fs.existsSync(fileName)) {
    return new Promise(
      function(resolve, reject) {
        var url = GOOGLE_DIRECTIONS_URL + '&origin=' + start + '&destination=' + end;
        // console.log('url = ',url);
        request(url, function(error, response, body) {
          if (error) {
            // console.log("error = ", error);
            reject(error);
          } else {
            // console.log("Got data, status code = ",response.statusCode);
            // save to cache file
            fs.writeFileSync(fileName, body);
            // return the JSON object
            resolve(JSON.parse(body));
          }
        });
      });
  } else {
    return new Promise(
      function(resolve, reject) {
        // console.log("Loading route from file ",fileName);
        fs.readFile(fileName, function(err, data) {
          if (err) {
            throw reject(err);
          }
          resolve(JSON.parse(data));
        });
      });
  }
};

/**
 * Get a route info object for route from start to end, results are cached locally in files
 *
 * @param {String} start The start location like 'San Jose, CA'
 * @param {String} end The end location like 'Santa Clara, CA'
 * @returns {Promise} Promise resolving to a route info object containing distance and list of points
 */
maps.getRouteInfo = function(start, end) {
  var fileName = CACHE_DIR + '/' + start + '-to-' + end + '-POINTS.json';
  if (!fs.existsSync(fileName)) {
    return maps.getRoute(start, end)
      .then(function(route) {
        var line = maps.getPolyline(route);
        var distCount = 0;
        var prevPoint;
        var points = line.map(function(point) {
          var dist = (prevPoint) ? maps.distance(prevPoint, point) : 0;
          prevPoint = point;
          return {
            lat: point[0],
            lon: point[1],
            distFromStart: distCount += dist,
            dist: dist
          };
        });
        // calculate distances to end
        var distanceFromEnd = 0;
        for (var i = (points.length - 1); i >= 0; i--) {
          points[i].distanceFromEnd = distanceFromEnd;
          distanceFromEnd += points[i].dist;
        }
        var routeInfo = {
          distance: route.routes[0].legs[0].distance.value, // in meters
          duration: route.routes[0].legs[0].duration.value, // in seconds
          averageSpeed: route.routes[0].legs[0].distance.value / route.routes[0].legs[0].duration.value, // in meters/seconds
          points: points
        };
        // save to cache file
        fs.writeFileSync(fileName, JSON.stringify(routeInfo));
        // return route info from promise
        return routeInfo;
      });
  } else {
    return new Promise(
      function(resolve, reject) {
        // console.log("Loading routeInfo from file ",fileName);
        fs.readFile(fileName, function(err, data) {
          if (err) {
            throw reject(err);
          }
          resolve(JSON.parse(data));
        });
      });
  }
};

/**
 * Gets a point along a route at a given distance in meters
 *
 * @param {Object} routeInfo           The route info
 * @param {Number} distanceAlongPath   The distance along the route in meters
 * @returns {*}               point in the form {lat: 37, lon: -121} , null distance is longer than route or negative
 */
maps.getPointAlongRoute = function(routeInfo, distanceAlongPath) {
  if (distanceAlongPath < 0 || distanceAlongPath >= routeInfo.distance) {
    // we have finished route
    return null;
  } else {
    // find nearest point along path
    for (var i = 1; i < routeInfo.points.length; i++) {
      var point = routeInfo.points[i];
      if (distanceAlongPath < point.distFromStart) {
        var prevPoint = routeInfo.points[i - 1];

        return {
          lat: prevPoint.lat,
          lon: prevPoint.lon
        };
        //var percentageIntoSegment = (distanceAlongPath - prevPoint.distFromStart) / prevPoint.dist;
        //var lat = prevPoint.lat + ((point.lat - prevPoint.lat) * percentageIntoSegment);
        //var lon = prevPoint.lon + ((point.lon - prevPoint.lon) * percentageIntoSegment);
        //return {
        //  lat: lat,
        //  lon: lon
        //};
      }
    }
    return null;
  }
};

/**
 * get a distance remaining in meters to drive to end of route
 *
 * @param {Object} routeInfo       The route info
 * @param {Object} currentPoint    Point in the form {lat: 37, lon: -121}
 * @returns {*}           Distance in meters left to travel
 */
maps.getDistanceRemainingToEnd = function(routeInfo, currentPoint) {
  // find nearest point
  var nearestIndex = null;
  var nearestPoint = null;
  var nearestDistance = Number.MAX_VALUE;
  for (var i = 0; i < routeInfo.points.length; i++) {
    var point = routeInfo.points[i];
    var distanceToPoint = maps.distance([currentPoint.lat, currentPoint.lon], [point.lat, point.lon]);
    if (distanceToPoint < nearestDistance) {
      nearestDistance = distanceToPoint;
      nearestPoint = point;
      nearestIndex = i;
    }
  }
  var distanceFromEnd = nearestDistance + nearestPoint.distanceFromEnd;
  // check if we are really closer to end via next point
  if (nearestIndex < (routeInfo.points.length - 2)) {
    var nextPoint = routeInfo.points[nearestIndex + 1];
    var nextDistanceFromEnd = maps.distance([currentPoint.lat, currentPoint.lon], [nextPoint.lat, nextPoint.lon]) +
      nextPoint.distanceFromEnd;
    if (nextDistanceFromEnd < distanceFromEnd) {
      distanceFromEnd = nextDistanceFromEnd;
    }
  }
  return distanceFromEnd;
};

/**
 * Caculate the time the truck will arrive if traveling at average speed from current position along the fastest route
 * from start to end
 *
 * @param {String} start           The start location like 'San Jose, CA'
 * @param {String} end             The end location like 'Santa Clara, CA'
 * @param {Number} currentTime     Current time location is for, in milliseconds since epoc
 * @param {Number} currentLat      Current latitude
 * @param {Number} currentLon      Current longitude
 * @param {Number} averageSpeed    Current average speed in meters per second
 * @returns {*}           Promise resolving to ETA time in milliseconds since epoc
 */
maps.calculateEta = function(start, end, currentTime, currentLat, currentLon, averageSpeed) {
  return maps.getRouteInfo(start, end)
    .then(function(routeInfo) {
      var distanceToEnd = maps.getDistanceRemainingToEnd(routeInfo, {lat: currentLat, lon: currentLon});
      // console.log('distanceToEnd = ', distanceToEnd);
      var timeToEnd = distanceToEnd / averageSpeed;
      // console.log('timeToEnd = ', timeToEnd);
      return currentTime + (timeToEnd * 1000);
    });
};

module.exports = maps;
