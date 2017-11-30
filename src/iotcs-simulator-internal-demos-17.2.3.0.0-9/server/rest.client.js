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
var fs = require('fs');
var services = require('./services');
var setup = services.setup;

/**
 * Supported and used resources API.
 *
 * In subResources definition 'path' property is required for resources that contains '/' in their path fragment,
 * otherwise 'name' will be used as 'path'
 */
var RESOURCE_MAP = {
  APP: {
    URI: '/iot/api/v2/apps',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    subResources: [
      {name: 'devices'},
      {name: 'deviceModels'},
      {name: 'deviceSelectionGroups', path: 'deviceSelectionGroups/default'},
      {name: 'fences'}
    ]
  },
  DEVICE: {
    URI: '/iot/api/v2/devices',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    subResources: [
      {name: 'devices'},
      {name: 'location'},
      {name: 'metadata'}
    ]
  },
  DEVICE_MODEL: {
    URI: '/iot/api/v2/deviceModels',
    methods: ['GET', 'POST', 'PATCH'],
    subResources: []
  },
  API: {
    URI: '/iot/api',
    methods: ['GET'],
    subResources: []
  },
  // Asset Tracking Resources: URI root is added later
  ASSET: {
    URI: '/v2/assets',
    methods: ['GET', 'POST', 'PATCH'],
    subResources: []
  },
  ASSET_TYPE: {
    URI: '/v2/assetTypes',
    methods: ['GET'],
    subResources: []
  },
  PLACE: {
    URI: '/v2/places',
    methods: ['GET'],
    subResources: [
      {name: 'floorplan'}
    ]
  }
};

/**
 * IoTConnection is responsible for handling connection details of the configured IoT Server
 */
var IoTConnection = function() {
  var connection = this;
  var _username;
  var _password;
  var _cookies = {};

  connection.setPrincipal = function(username, password) {
    _username = username;
    _password = password;
  };

  connection.baseURL = 'https://' + setup.server.host + ':' + setup.server.port;
  connection.serverHost = setup.server.host;
  connection.serverPort = setup.server.port;
  connection.setPrincipal(setup.server.user.name, setup.server.user.pwd);

  var requestDefaults = {
    baseUrl: connection.baseURL,
    rejectUnauthorized: true
  };
  if (setup.server.caCert) {
    requestDefaults.ca = fs.readFileSync(setup.server.caCert);
  }
  var request = require('request');
  // require('request-debug')(request);
  connection.request = request.defaults(requestDefaults);

  var _endpoint;
  connection.setEndpoint = function(endpoint) {
    _endpoint = endpoint;
  };

  /**
   * Add the auth headers to the given request.
   */
  connection.getCredentials = function(request) {
    connection.putCookies(request);
    if (_endpoint) {
      return _endpoint.getCredentials(request, this);
    }
    if (_username && _password) {
      request.auth = {
        user: _username,
        pass: _password
      };
      return Promise.resolve(request);
    }
    return Promise.reject('No authentication was provider. Please use set setCredentials() or setEndpoint()');
  };

  connection.checkCredentials = function(response) {
    if (_endpoint && _endpoint.hasCredentials() && response.statusCode === 401) {
      _endpoint.clearCredentials();
      return true;
    }
    return false;
  };

  /**
   * Adds cookies to the outgoing request
   *
   * @param {Object} request
   */
  connection.putCookies = function(request) {
    if (!request.headers) {
      request.headers = {};
    }
    var cookieStr = '';
    Object.keys(_cookies).forEach(function(key) {
      var cookie = _cookies[key];
      var cookieFragments = cookie.split(';');
      var cookieFragment = cookieFragments[0];
      cookieStr += cookieFragment + ';';
    });
    if (cookieStr.length > 0) {
      request.headers.Cookie = cookieStr;
    }
  };

  /**
   * Saves cookies that need to be set in the following requests
   *
   * @param {Array} cookies
   */
  connection.setCookies = function(cookies) {
    if (cookies) {
      cookies.forEach(function(cookie) {
        var key = cookie.substring(0, cookie.indexOf('='));
        if (cookie.startsWith(key + '=invalid')) {
          delete _cookies.key;
        } else {
          _cookies[key] = cookie;
        }
      });
    }
  };

  /**
   * Parses HTML Login form and creates new request to submit necessary credentials
   *
   * @param {String} loginHtml
   * @param {Object} response
   * @param {Object} initialRequest
   * @returns {Object} request object
   */
  connection.createLoginRequest = function(loginHtml, response, initialRequest) {
    var formStart = loginHtml.indexOf('form class="signin_form');
    var actionIdx = loginHtml.indexOf(' action="', formStart);
    var action = loginHtml.substring(actionIdx + 9, loginHtml.indexOf('"', actionIdx + 9));
    var formEnd = loginHtml.indexOf('</form', formStart);
    var inputsStart = loginHtml.indexOf('<input', formStart);
    var formString = loginHtml.substring(inputsStart, formEnd);
    var inputs = formString.split('<input');
    var inputValues = {};
    inputs.forEach(function(inputLine) {
      var nameIdx = inputLine.indexOf(' name="');
      var valueIdx = inputLine.indexOf(' value="');
      if (valueIdx === -1) {
        valueIdx = inputLine.indexOf(' VALUE="');
      }
      if (nameIdx !== -1) {
        var name = inputLine.substring(nameIdx + 7, inputLine.indexOf('"', nameIdx + 7));
        var value;
        if (valueIdx !== -1) {
          value = inputLine.substring(valueIdx + 8, inputLine.indexOf('"', valueIdx + 8));
        } else {
          value = 'null';
        }
        inputValues[name] = value;
      }
    });
    inputValues.username = initialRequest.auth.user;
    inputValues.userid = initialRequest.auth.user;
    inputValues.password = initialRequest.auth.pass;
    var request = {};
    request.method = 'POST';
    // remove port information if it presents
    var urlParts = initialRequest.baseUrl.split(':');
    request.baseUrl = urlParts[0] + ':' + urlParts[1];
    request.uri = action;
    request.form = inputValues;
    request.followRedirect = false;
    request.removeRefererHeader = true;
    return request;
  };

  /**
   * Creates new request when redirect is indicated by response to the initial request
   *
   * @param {Object} initialRequest
   * @param {Object} response
   * @returns {Object} request object
   */
  connection.createForwardRequest = function(initialRequest, response) {
    var request = {};
    var location = response.headers.location;
    if (location.startsWith('/')) {
      request.uri = location;
      request.baseUrl = initialRequest.baseUrl;
    } else {
      var pathIdx = location.indexOf('/', location.indexOf('://') + 3);
      request.baseUrl = location.substring(0, pathIdx);
      request.uri = location.substring(pathIdx);
    }
    request.method = 'GET';
    request.json = true;
    request.followRedirect = false;
    return request;
  };

};

var _iotConnection = new IoTConnection();

/**
 * Creates Resource instance for a REST resource defined in the RESOURCE_MAP
 *
 * @param {String} resourceName
 * @param {String} uriRoot
 * @param {boolean} isSubResource true for subresource
 * @constructor
 */
var Resource = function(resourceName, uriRoot, isSubResource) {
  this.resourceInfo = services.utils.cloneObject(RESOURCE_MAP[resourceName]);
  if (uriRoot) {
    this.resourceInfo.URI = uriRoot + this.resourceInfo.URI;
  }
  if (!isSubResource && this.resourceInfo.subResources) {
    var mainResource = this;
    mainResource.resourceInfo.subResources.forEach(function(sub) {
      var name = sub.name;
      var path;
      if (sub.path) {
        path = sub.path;
      } else {
        path = name;
      }
      mainResource[name] = function(id) {
        var subResource = new Resource(resourceName, uriRoot, true);
        subResource.resourceInfo = {};
        subResource.resourceInfo.methods = mainResource.resourceInfo.methods;
        subResource.resourceInfo.URI = mainResource.resourceInfo.URI + '/' + id + '/' + path;
        return subResource;
      };
    });
  }
};

/**
 * Resource class provides a set of common methods for different IoT CS resources: find, get, create, update, delete
 *
 * @type {{_sendRequest: Resource._sendRequest, create: Resource.create, update: Resource.update,
 * _findAtOffset: Resource._findAtOffset, find: Resource.find, get: Resource.get, getAll: Resource.getAll,
 * delete: Resource.delete}}
 */
Resource.prototype = {

  /**
   * Sends request to the server and analyzes response
   *
   * @param {Object} request
   * @param {Number} expectedStatusCode
   * @param {Function} successCallback
   * @returns {*}
   * @private
   */
  _sendRequest: function(request, expectedStatusCode, successCallback) {
    var thisResource = this;
    return _iotConnection.getCredentials(request).then(function(req) {
      return new Promise(function(resolve, reject) {
        _iotConnection.request(req, function(error, response, body) {
          if (response) {
            _iotConnection.setCookies(response.headers['set-cookie']);
          }
          if (!error && response.statusCode === expectedStatusCode) {
            if (body && typeof body === 'string' && body.indexOf('loginFormSubmit') !== -1) {
              var newRequest = _iotConnection.createLoginRequest(body, response, req);
              resolve(thisResource._sendRequest(newRequest, expectedStatusCode, successCallback));
            } else {
              var result = successCallback ? successCallback(body) : body;
              resolve(result);
            }
          } else {
            if (_iotConnection.checkCredentials(response)) {
              resolve(thisResource._sendRequest(request, expectedStatusCode, successCallback));
            } else if (response && response.statusCode === 302) {
              var fwdRequest = _iotConnection.createForwardRequest(request, response);
              resolve(thisResource._sendRequest(fwdRequest, expectedStatusCode, successCallback));
            } else {
              if (body && body.title && body.detail) {
                // Error from IoT server
                reject(body.title + '. ' + body.detail);
              } else if (body) {
                // Could be an error from the proxy
                reject(body);
              } else if (error) {
                reject(error);
              } else {
                reject(request);
              }
            }
          }
        });
      });
    });
  },

  /**
   * Creates REST resource instance
   *
   * @param {Object} data
   * @param {Function} mapResponseCallback
   * @returns {*}
   */
  create: function(data, mapResponseCallback) {
    if (this.resourceInfo.methods.indexOf('POST') !== -1) {
      var request = {
        uri: this.resourceInfo.URI,
        method: 'POST',
        json: true,
        body: data
      };
      return this._sendRequest(request, 201, mapResponseCallback);
    } else {
      throw new Error('Creation is not supported for this resource');
    }
  },

  /**
   * Updates REST resource instance
   *
   * @param {String} id optional identifier of the REST resource, should be null if there's no id
   * @param {Object} data
   * @param {Function} mapResponseCallback
   * @returns {*}
   */
  update: function(id, data, mapResponseCallback) {
    if (this.resourceInfo.methods.indexOf('POST') === -1) {
      throw new Error('Update is not supported for this resource');
    }
    var uri = this.resourceInfo.URI;
    if (id) {
      uri += '/' + id;
    }
    var request = {
      uri: uri,
      method: 'POST',
      headers: {
        'X-HTTP-Method-Override': 'PATCH'
      },
      json: true,
      body: data
    };
    return this._sendRequest(request, 200, mapResponseCallback);

  },

  /**
   * Searches an object according to the filter criteria in the portion of response starting from specified offset
   *
   * @param {Function} filter
   * @param {Number} offset
   * @param {Function} mapResponseCallback
   * @returns {*}
   * @private
   */
  _findAtOffset: function(filter, offset, mapResponseCallback) {
    var off = offset || 0;
    var request = {
      uri: this.resourceInfo.URI,
      method: 'GET',
      json: true,
      qs: {
        offset: off,
        limit: 200
      }
    };
    return this._sendRequest(request, 200, function(body) {
      if (body) {
        var result = body.items.find(filter);
        if (result) {
          return mapResponseCallback ? mapResponseCallback(result) : result;
        } else if (body.hasMore) {
          return this._findAtOffset(filter, body.offset + body.limit, mapResponseCallback);
        } else {
          return null;
        }
      } else {
        return null;
      }
    });
  },

  /**
   * Searches an object according to the filter criteria
   *
   * @param {Function} filter
   * @param {Function} mapResponseCallback
   * @returns {*}
   */
  find: function(filter, mapResponseCallback) {
    if (this.resourceInfo.methods.indexOf('GET') === -1) {
      throw new Error('Get request is not supported for this resource');
    }
    return this._findAtOffset(filter, 0, mapResponseCallback);
  },

  /**
   * Gets a REST resource with the specified id
   *
   * @param {String} id
   * @param {Function} mapResponseCallback
   * @returns {*}
   */
  get: function(id, mapResponseCallback) {
    if (this.resourceInfo.methods.indexOf('GET') === -1) {
      throw new Error('Get request is not supported for this resource');
    }
    var request = {
      uri: this.resourceInfo.URI + '/' + id,
      method: 'GET',
      json: true
    };
    return this._sendRequest(request, 200, mapResponseCallback);
  },

  /**
   * Gets all instances of given REST resource
   *
   * @param {Function} mapResponseCallback
   * @returns {*}
   */
  getAll: function(mapResponseCallback) {
    if (this.resourceInfo.methods.indexOf('GET') === -1) {
      throw new Error('Get request is not supported for this resource');
    }
    var request = {
      uri: this.resourceInfo.URI,
      method: 'GET',
      json: true,
      qs: {
        offset: 0,
        limit: 200
      }
    };
    return this._sendRequest(request, 200, mapResponseCallback);
  },

  /**
   * Deletes an instance of the given REST resource with the specified id
   *
   * @param {String} id
   * @param {Function} mapResponseCallback
   * @returns {*}
   */
  delete: function(id, mapResponseCallback) {
    if (this.resourceInfo.methods.indexOf('DELETE') === -1) {
      throw new Error('Delete request is not supported for this resource');
    }

    var request = {
      uri: this.resourceInfo.URI + '/' + id,
      method: 'DELETE'
    };
    return this._sendRequest(request, 204, mapResponseCallback);
  }
};

/**
 * Collection of IoT CS Resources that are used by Simulator.
 *
 * Main resources can be accessed and manipulated by their name and desired function, e.g.:
 *  RestClient.Application.create(data)
 *
 * Subresources can be accessed using the following syntax:
 *  RestClient.Application.devices(appId).getAll()
 * where 'devices' is the name of the Application subresource.
 *
 * All resource functions contains optional last parameter called 'mapResponseCallback',
 * that can be used to process server response before returning it, e.g.:
 * RestClient.Application.get(appId, function(response) {
 *    return response.id;
 * });
 *
 * @namespace
 */
var RestClient = {};

// Exported resources:
/**
 * API resource: /iot/api
 * @type {Resource}
 */
RestClient.API = new Resource('API');

/**
 * Application resource: /iot/api/v2/apps
 * @type {Resource}
 */
RestClient.Application = new Resource('APP');
/**
 * Device resource: /iot/api/v2/devices
 * @type {Resource}
 */
RestClient.Device = new Resource('DEVICE');
/**
 * Device model resource: /iot/api/v2/deviceModels
 * @type {Resource}
 */
RestClient.DeviceModel = new Resource('DEVICE_MODEL');

var AT_API_ROOT = '/assetMonitoring/internalapi';

/**
 * Place resource: /assetTracking/api/v2/places
 * @type {Resource}
 */
RestClient.Place = new Resource('PLACE', AT_API_ROOT);

/**
 * Asset resource: /assetTracking/api/v2/assets
 * @type {Resource}
 */
RestClient.Asset = new Resource('ASSET', AT_API_ROOT);
/**
 * AssetType resource: /assetTracking/api/v2/assetTypes
 * @type {Resource}
 */
RestClient.AssetType = new Resource('ASSET_TYPE', AT_API_ROOT);

RestClient.Place.getAll().then(function() {}, function(error) {
  console.log("Coudn't retrieve Asset Tracking resources:", error, '. Fallback to using private API');
  AT_API_ROOT = '/assetTracking/privatewebapi';
  // with private API we need to process redirects ourselves
  _iotConnection.request = _iotConnection.request.defaults({followRedirect: false});
  // reassign AT resources
  RestClient.Place = new Resource('PLACE', AT_API_ROOT);
  RestClient.Asset = new Resource('ASSET', AT_API_ROOT);
  RestClient.AssetType = new Resource('ASSET_TYPE', AT_API_ROOT);
});

/**
 * Utility function for downloading files from IoT Server
 *
 * @param {String} uri URI of the remote file
 * @param {String} destFile path of the local destination file
 * @param {Function} callback
 */
RestClient.downloadFile = function(uri, destFile, callback) {
  var request = {
    uri: uri,
    method: 'GET',
    json: false
  };

  _iotConnection.getCredentials(request).then(function(req) {
    _iotConnection.request(req).pipe(fs.createWriteStream(destFile)).on('close', callback);
  });
};

module.exports = RestClient;
