/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

(function () {
var name = 'iotcs';
function init(lib) {
'use strict';
//START///////////////////////////////////////////////////////////////////////

    /**
     * @global
     * @alias iotcs
     * @namespace
     */
    lib = lib || {};
    
    /**
     * @property {string} iotcs.name - the short name of this library
     */
    try {
        lib.name = lib.name || "iotcs";
    } catch(e) {}
    
    /**
     * @property {string} iotcs.description - the longer description
     */
    lib.description = "Oracle IoT Cloud Enterprise Client Library";

    /**
     * @property {string} iotcs.version - the version of this library
     */
    lib.version = "1.1";

    /**
     * Log an info message
     * @function 
     */
    lib.log = function (msg) {
        if (lib.debug) {
            _log('info', msg);
        }
    };

    /**
     * Throw and log an error message
     * @function 
     */
    lib.error = function (msg) {
        if (lib.debug && console.trace) {
            console.trace(msg);
        }
        _log('error', msg);
        throw '[iotcs:error] ' + msg;
    };

    /**
     * Log and return an error message
     * @function
     */
    lib.createError = function (msg, error) {
        if (lib.debug && console.trace) {
            console.trace(msg);
        }
        _log('error', msg);
        if (!error) {
            return new Error('[iotcs:error] ' + msg);
        }
        return error;
    };

    /** @ignore */
    function _log(level, msg) {
        var msgstr = '[iotcs:'+level+'] ' + msg;
        console.log(msgstr);
    }
    
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/@overview.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 * @overview
 * The device and enterprise client libraries simplify working with
 * the Oracle IoT Cloud Service. These client libraries are a
 * higher-level abstraction over top of messages and REST APIs. Device
 * clients are designed to make it easy to expose device functionality
 * to the IoT Cloud Service, while enterprise clients are designed to
 * make it easy to inspect and control a device. The true state of a
 * device is within the device itself (whether the light is on or
 * off). A "virtual" device object is contained within the cloud and
 * enterprise clients that represent the last-known state of that
 * device, and allow enterprise clients to send commands and set
 * attributes of the device model (e.g., "turn the light off"). 
 *
 * <h2>Trusted Assets</h2>
 *
 * Trusted assets are defined as material that contribute to the chain
 * of trust between the client and the server. The client library
 * relies on an implementation of the
 * TrustedAssetsManager to securely manage
 * these assets on the client. The client-library has a default
 * implementation of the TrustedAssetsManager which uses a framework native
 * trust-store to secure the trust assets. To create the trust-store
 * for the default TrustedAssetsManager, the user must run the
 * TrustedAssetsProvisioner tool by using the script provided in the tools
 * depending if the provision is made for the enterprise or device
 * client library. Usage is available by running the tool without
 * arguments.
 *
 * <h2>Device Models</h2>
 *
 * A device model is a predefined specification of the attributes,
 * formats and resources of a device that can be accessed by the
 * client-library. The attributes of a device model represent the
 * basic variables that the device supports, such as temperature,
 * humidity, flow rate, valve position, and so forth. The formats of a
 * device model define the structure of a message payload. A format
 * describes the message attributes by specifying the attribute names,
 * types, optionality, and default values. The resources of a device
 * model define additional, ad-hoc REST resources which provide richer
 * REST support than what is possible with attributes and formats. 
 * <p>
 * The client library has explicit API for obtaining a device model
 * ({@link iotcs.enterprise.EnterpriseClient#getDeviceModel} or
 * {@link iotcs.device.DirectlyConnectedDevice#getDeviceModel}). This will generate for a
 * specified urn the device model associated with it and registered
 * in the cloud as JSON objects that contain all the attributes, actions
 * ant other specific information for a device model. With the generated
 * model a virtual device can be created that encapsulates all the
 * device functionality based on a specific model. If a device has more
 * than one model associated, for each model a different virtual device
 * can be crated and monitored/controlled.
 *
 * <h2>Enterprise Client</h2>
 *
 * Both enterprise and device clients share common API for getting and
 * setting values through a user-interface (in the case of an
 * enterprise-client application) and for getting and setting values
 * on a physical device (in the case of a device-client
 * application).
 * <p>
 * An enterprise-client application will create an {@link iotcs.enterprise.EnterpriseClient}
 * based on an application already created on the server using the static method
 * {@link iotcs.enterprise.EnterpriseClient.newClient}. A list of applications that the user has access to can be
 * retrieved by using the static method {@link iotcs.enterprise.EnterpriseClient.getApplications}.
 * From there, the application can list all the device models
 * that are registered with it by using {@link iotcs.enterprise.EnterpriseClient#getDeviceModels}.
 * After selecting models the list of active devices that have the selected
 * models can be retrieved by using {@link iotcs.enterprise.EnterpriseClient#getActiveDevices}.
 * After selecting combination of models/devices, using the device id's and retrieved
 * models the application can create instances of {@link iotcs.enterprise.VirtualDevice}
 * which provides access to monitor and control the devices.
 *
 * <h2>Device Client</h2>
 *
 * A device-client application will create a {@link iotcs.device.DirectlyConnectedDevice} or
 * a {@link iotcs.device.GatewayDevice} (for indirectly connected devices registration)
 * based on a device already registered on the server that has a logical ID already assigned
 * and saved in a {endpointId}.json generated based on that ID and shared secret
 * associated with the device registered by the TrustedAssetsProvisioner. If the device should
 * be checked if is activated and if is not then the activation should be done.
 * In the course of the activation trusted material used for future authentication with
 * the server will be generated by the TrustedAssetsManager and saved in the
 * {endpointId}.json. In the activation method the model URN's (and capabilities) that the client
 * is implementing (if any) must be given as parameters.
 * <p>
 * After activation (done only if needed) the client should retrieve the device models for the
 * URN's that it is implementing or that other indirectly connected device that is registering
 * in the future are implementing by using the {@link iotcs.device.DirectlyConnectedDevice#getDeviceModel}
 * or {@link iotcs.device.GatewayDevice#getDeviceModel} methods.
 * <p>
 * If the client is a {@link iotcs.device.GatewayDevice}, it can use the
 * {@link iotcs.device.GatewayDevice#registerDevice} method to register other indirectly
 * connected devices that it is using. The server will assign logical endpoint id's to
 * these devices and return them to the client.<br>
 * <b>Be aware that all endpoint id's assigned by the server to indirectly connected
 * devices must be persisted and managed by the device application to use them for creating
 * virtual devices. There is no method for retrieving them from the server side and at
 * an eventual device application restart the id's must be reused.</b><br>
 * <p>
 * After selecting combination of logical endpoint id's (including the client own id) and
 * device models, the client can create instances of {@link iotcs.device.VirtualDevice} by
 * using the constructor or the {@link iotcs.device.DirectlyConnectedDevice#createVirtualDevice}
 * and {@link iotcs.device.GatewayDevice#createVirtualDevice} methods which provides
 * access to messaging to/from the cloud for the specific logical devices.
 *
 * @example <caption>Enterprise Client Quick Start</caption>
 *
 * //The following steps must be taken to run an enterprise-client application.
 *
 * var appName;
 * var ec;
 * var model;
 * var deviceId;
 * var device;
 *
 * // 1. Select an application
 *
 * iotcs.enterprise.EnterpriseClient
 *      .getApplications()
 *      .page('first')
 *      .then(function(response){
 *          response.items.forEach(...);
 *          //select and application and set appName (the application name)
 *          ...
 *          initializeEnterpriseClient();
 *      });
 *
 * // 2. Initialize enterprise client
 *
 * function initializeEnterpriseClient(){
 *      iotcs.enterprise.EnterpriseClient.newClient(appName, function (client) {
 *          ec = client;
 *          selectDeviceModel();
 *      }
 * }
 *
 * // 3. Select a device model available in the app
 *
 * function selectDeviceModel(){
 *      ec.getDeviceModels()
 *          .page('first')
 *          .then(function(response){
 *              response.items.forEach(...);
 *              //select a device model and set model
 *              ...
 *              selectDevice();
 *          });
 * }
 *
 * // 4. Select an active device implementing the device model
 *
 * function selectDevice(){
 *      ec.getActiveDevices(model)
 *          .page('first')
 *          .then(function(response){
 *              response.items.forEach(...);
 *              //select a device and set the deviceId
 *              ...
 *              createVirtualDevice();
 *          });
 * }
 *
 * // 5. Create a virtual device for this model
 *
 * function createVirtualDevice(){
 *      device = ec.createVirtualDevice(deviceId, model);
 *      monitorVirtualDevice();
 *      updateVirtualDeviceAttribute();
 *      executeVirtualDeviceAction();
 * }
 *
 * // 6. Monitor the device through the virtual device
 *
 * function monitorVirtualDevice(){
 *      device.onChange = function(onChangeTuple){
 *          //print the new value and attribute
 *          console.log('Attribute '+onChangeTuple.attribute.name+' changed to '+onChangeTuple.newValue);
 *          //process change
 *          ...
 *      };
 *      device.onAlerts = function(alerts){
 *          for (var key in alerts) {
 *              alerts[key].forEach(function (alert) {
 *                  //print alert
 *                  console.log('Received time '+alert.eventTime+' with data '+JSON.stringify(alert.fields));
 *                  //process alert
 *                  ...
 *              });
 *          }
 *      };
 * }
 *
 * // 7. Update the value of an attribute
 *
 * function updateVirtualDeviceAttribute(){
 *      device.onError = function(onErrorTuple){
 *          //handle error case on update
 *          ...
 *      };
 *      device.attributeName.value = someValue;
 * }
 *
 * // 8. Execute action on virtual device
 *
 * function executeVirtualDeviceAction(){
 *      device.someAction.onExecute = function(response){
 *          //handle execute action response from server
 *          ...
 *      };
 *      device.call('someAction');
 * }
 *
 * // 9. Dispose of the device
 *
 * device.close();
 *
 * // 10. Dispose of the enterprise client
 *
 * ec.close();
 *
 * @example <caption>Device Client Quick Start</caption>
 *
 * //The following steps must be taken to run a device-client application. This
 * //sample is for a gateway device that does not implement any specific model
 * //that registers one indirectly connected device.
 * //The model must be already in the cloud registered.
 *
 * var gateway;
 * var model;
 * var indirectDeviceId;
 * var indirectDevice;
 * var indirectDeviceSerialNumber = ... ;
 * var indirectDeviceMetadata = {...};
 *
 * // 1. Create the device client (gateway)
 *
 * gateway = new iotcs.device.GatewayDevice();
 *
 * // 2. Activate the device if needed
 *
 * if (!gateway.isActivated()) {
 *      gateway.activate(['urn:oracle:iot:device:default'], function (device) {
 *          if (!device) {
 *              ...
 *              //handle activation error
 *          }
 *          selectDeviceModel();
 *      });
 * } else {
 *      selectDeviceModel();
 * }
 *
 * // 3. Select the device model
 *
 * function selectDeviceModel(){
 *      gateway.getDeviceModel('urn:myModel', function (response, error) {
 *          if (!response || error) {
 *              ...
 *              //handle get device model error
 *          }
 *          model = response;
 *          enrollDevice();
 *      });
 * }
 *
 * // 4. Register an indirectly connected device
 *
 * function enrollDevice(){
 *      gateway.registerDevice(indirectDeviceSerialNumber, indirectDeviceMetadata, ['urn:myModel'],
 *          function (response, error) {
 *              if (!response || error) {
 *                  ...
 *                  //handle enroll error
 *              }
 *              indirectDeviceId = response;
 *              createVirtualDevice();
 *          });
 * }
 *
 * // 5. Create a virtual device for the indirectly connected device
 *
 * function createVirtualDevice(){
 *      device = gateway.createVirtualDevice(deviceId, model);
 *      monitorVirtualDevice();
 *      updateVirtualDeviceAttribute();
 *      sendVirtualDeviceAlert();
 * }
 *
 * // 6. Monitor the device through the virtual device (it has two actions: power and reset)
 *
 * function monitorVirtualDevice(){
 *      device.onChange = function(onChangeTuple){
 *          //print the new value and attribute
 *          console.log('Attribute '+onChangeTuple.attribute.name+' changed to '+onChangeTuple.newValue);
 *          //process change
 *          ...
 *          if (...) {
 *              //if some error occurred
 *              throw new Error(...);
 *          }
 *      };
 *      device.power.onExecute = function(value){
 *          if (value) {
 *              ...
 *              //shutdown the device
 *          } else {
 *              ...
 *              //start the device
 *          }
 *      };
 *      device.reset.onExecute = function(){
 *          //reset the device
 *          ...
 *          if (...) {
 *              //if some error occurred
 *              throw new Error(...);
 *          }
 *      };
 * }
 *
 * // 7. Update the value of an attribute
 *
 * function updateVirtualDeviceAttribute(){
 *      device.onError = function(onErrorTuple){
 *          //handle error case on update
 *          ...
 *      };
 *      device.attributeName.value = someValue;
 * }
 *
 * // 8. Raise an alert to be sent to the cloud
 *
 * function sendVirtualDeviceAlert(){
 *      var alert = device.createAlert('urn:myAlert');
 *      alert.fields.mandatoryFieldName = someValue;
 *      alert.fields.optionalFieldName = someValue; //this is optional
 *      alert.raise();
 * }
 *
 * // 9. Dispose of the device
 *
 * device.close();
 *
 * // 10. Dispose of the enterprise client
 *
 * gateway.close();
 *
 */


//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/@globals.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * @namespace
 * @alias iotcs.enterprise
 * @memberOf iotcs
 */
lib.enterprise = {};

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
lib.oracle = lib.oracle || {};

/** @ignore */
lib.oracle.iot = lib.oracle.iot || {};

/** @ignore */
lib.oracle.iot.client = lib.oracle.iot.client || {};

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
lib.oracle.iot.client.pageable = lib.oracle.iot.client.pageable || {};

/** @ignore */
lib.oracle.iot.client.pageable.defaultLimit = lib.oracle.iot.client.pageable.defaultLimit || 50;

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
lib.oracle.iot.client.monitor = lib.oracle.iot.client.monitor || {};

/** @ignore */
lib.oracle.iot.client.monitor.pollingInterval = lib.oracle.iot.client.monitor.pollingInterval || 3000;

/** @ignore */
lib.oracle.iot.client.monitor.formatLimit = lib.oracle.iot.client.monitor.formatLimit || 10;

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
lib.oracle.iot.client.controller = lib.oracle.iot.client.controller || {};

/** @ignore */
lib.oracle.iot.client.controller.asyncRequestTimeout = lib.oracle.iot.client.controller.asyncRequestTimeout || 60000;

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
lib.oracle.iot.tam = lib.oracle.iot.tam || {};

/** @ignore */
lib.oracle.iot.tam.store = lib.oracle.iot.tam.store || 'trustedAssetsStore.json';

/** @ignore */
lib.oracle.iot.tam.storePassword = lib.oracle.iot.tam.storePassword || null;

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
lib.oracle.iot.client.test = lib.oracle.iot.client.test || {};

/** @ignore */
lib.oracle.iot.client.test.reqroot = lib.oracle.iot.client.test.reqroot || '/iot/webapi/v2';

/** @ignore */
lib.oracle.iot.client.test.auth = lib.oracle.iot.client.test.auth || {};

/** @ignore */
lib.oracle.iot.client.test.auth.activated = lib.oracle.iot.client.test.auth.activated || false;

/** @ignore */
lib.oracle.iot.client.test.auth.user = lib.oracle.iot.client.test.auth.user || 'iot';

/** @ignore */
lib.oracle.iot.client.test.auth.password = lib.oracle.iot.client.test.auth.password || 'welcome1';

/** @ignore */
lib.oracle.iot.client.test.auth.protocol = lib.oracle.iot.client.test.auth.protocol || 'https';

//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// file: library/shared/$port-node.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/** @ignore */
var $port = lib.$port || {};

if (lib.debug) {
    lib.$port = $port;
}

var _b2h = (function () {
    var r = [];
    for (var i=0; i<256; i++) {
        r[i] = (i + 0x100).toString(16).substr(1);
    }
    return r;
})();

// pre-requisites (internal to lib)
var forge = require('node-forge');

// pre-requisites (internal to $port);
var os = require('os');
var https = require('https');
var querystring = require('querystring');
var fs = require('fs');

var tls = require('tls');
tls.checkServerIdentity = function (host, cert) {
    var cn = cert.subject.CN;
    if (cn.startsWith('*.')) {
        var i = host.indexOf('.');
        if (i > 0) {
            host = host.substring(i);
        }
        cn = cn.substring(1);
    }
    if (cn === host) {
        return;
    } else {
        lib.error('SSL host name verification failed');
    }
};

// implement porting interface

$port.os = {};

$port.os.type = function () {
    return os.type();
};

$port.os.release = function () {
    return os.release();
};

$port.https = {};

$port.https.req = function (options, payload, callback) {

    if (options.tam
        && (typeof options.tam.getTrustAnchorCertificates === 'function')
        && Array.isArray(options.tam.getTrustAnchorCertificates())
        && (options.tam.getTrustAnchorCertificates().length > 0)) {
        options.ca = options.tam.getTrustAnchorCertificates();
    }

    options.rejectUnauthorized = true;
    options.protocol = options.protocol + ':';
    options.agent = false;

    var req = https.request(options, function (response) {

        //console.log(response.statusCode + ' ' + response.statusMessage);

        // Continuously update stream with data
        var body = '';
        response.on('data', function (d) {
            body += d;
        });
        response.on('end', function () {
            // Data reception is done, do whatever with it!
            //console.log('BODY: '+body);
            if ((response.statusCode === 200) || (response.statusCode === 202)) {
                callback(body);
            } else {
                var error = new Error(JSON.stringify({statusCode: response.statusCode, statusMessage: response.statusMessage, body: body}));
                if (response.statusCode !== 401) {
                    lib.createError(error.message);
                }
                callback(body, error);
            }
        });
    });
    req.write(payload);
    req.end();
};

$port.file = {};

$port.file.store = function (path, data) {
    try {
        fs.writeFileSync(path, data, {encoding:'binary'});
    } catch (e) {
        lib.error('could not store file "'+path+'"');
    }
};

$port.file.exists = function (path) {
    try {
        return fs.statSync(path).isFile();
    } catch (e) {
        return false;
    }
};

$port.file.load = function (path) {
    var data = null;
    try {
        var tmp = fs.readFileSync(path, {encoding:'binary'});
        var len = tmp.length;
        data = '';
        for (var i=0; i<len; i++) {
            data += tmp[i];
        }
    } catch (e) {
        lib.error('could not load file "'+path+'"');
        return;
    }
    return data;
};

$port.file.append = function (path, data) {
    try {
        fs.appendFileSync(path, data);
    } catch (e) {
        lib.error('could not append to file "'+path+'"');
    }
};

$port.file.remove = function (path) {
    try {
        fs.unlinkSync(path);
    } catch (e) {
        lib.error('could not remove file "'+path+'"');
    }
};

$port.util = {};

$port.util.rng = function (count) {
    var b = forge.random.getBytesSync(count);
    var a = new Array(count);
    for (var i=0; i<count; i++) {
        a[i] = b[i].charCodeAt(0);
    }
    return a;
};

/*@TODO: this implementation is erroneous: leading '0's are sometime missing. => please use exact same implementation as $port-browser.js (it is anyway based on $port.util.rng()) + import _b2h @DONE
*/
$port.util.uuidv4 = function () {
    var r16 = $port.util.rng(16);
    r16[6]  &= 0x0f;  // clear version
    r16[6]  |= 0x40;  // set to version 4
    r16[8]  &= 0x3f;  // clear variant
    r16[8]  |= 0x80;  // set to IETF variant
    var i = 0;
    var uuid = _b2h[r16[i++]] + _b2h[r16[i++]] + _b2h[r16[i++]] + _b2h[r16[i++]] + '-' +
        _b2h[r16[i++]] + _b2h[r16[i++]] + '-' +
        _b2h[r16[i++]] + _b2h[r16[i++]] + '-' +
        _b2h[r16[i++]] + _b2h[r16[i++]] + '-' +
        _b2h[r16[i++]] + _b2h[r16[i++]] + _b2h[r16[i++]] +
        _b2h[r16[i++]] + _b2h[r16[i++]] + _b2h[r16[i++]];
    return uuid;
};

$port.util.btoa = function (str) {
    return new Buffer(str).toString('base64');
};

$port.util.atob = function (str) {
    return new Buffer(str, 'base64').toString();
};

$port.util.diagnostics = function () {
    var obj = {};
    obj.version = (process.env['oracle.iot.client.version'] || 'Unknown');
    var net = os.networkInterfaces();
    obj.freeDiskSpace = 'Unknown';
    obj.totalDiskSpace = 'Unknown';
    obj.ipAddress = 'Unknown';
    obj.macAddress = 'Unknown';
    var netInt = null;
    for (var key in net) {
        if ((key !== 'lo') && (key.indexOf('Loopback') < 0) && (net[key].length > 0)) {
            netInt = net[key][0];
            break;
        }
    }
    if (netInt && netInt.address) {
        obj.ipAddress = netInt.address;
    }
    if (netInt && netInt.mac) {
        obj.macAddress = netInt.mac;
    }
    return obj;
};

$port.util.query = {};

$port.util.query.escape = function (str) {
    return querystring.escape(str);
};

$port.util.query.unescape = function (str) {
    return querystring.unescape(str);
};

$port.util.query.parse = function (str, sep, eq, options) {
    return querystring.parse(str, sep, eq, options);
};

$port.util.query.stringify = function (obj, sep, eq, options) {
    return querystring.stringify(obj, sep, eq, options);
};

/*@TODO: check that Promise are actually supported! either try/catch or if (!Promise) else lib.error ...
*/
$port.util.promise = function(executor){
    return new Promise(executor);
};


//////////////////////////////////////////////////////////////////////////////
// file: library/shared/$impl.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/** @ignore */
var $impl = {};

if (lib.debug) {
    lib.$impl = $impl;
}

/** @ignore */
$impl.https = $impl.https || {};


//@TODO: Default TAM Integration
/** @ignore */
$impl.https.req = $impl.https.req || function (options, payload, callback) {
    if (!$impl.tam && !(options.tam)) {
        _initTAM(function () {
            _httpsTAMReq(options, payload, callback);
        });
    } else {
        _httpsTAMReq(options, payload, callback);
    }
};

function _initTAM (callback) {
    if (lib.oracle.iot.tam.store && (typeof window !== 'undefined') && location.hostname && location.protocol) {
        var i = location.protocol.indexOf(':');
        var protocol = (i<0) ? location.protocol : location.protocol.substring(0, i);
        $port.https.req({
            method: 'GET',
            path: lib.oracle.iot.tam.store,
            protocol: protocol,
            hostname: location.hostname,
            port: location.port
        }, '', function(response) {
            $port.file.store(lib.oracle.iot.tam.store, response);
            $impl.tam = new $impl.TrustedAssetsManager();
            callback();
        }, false);
    } else {
        $impl.tam = new $impl.TrustedAssetsManager();
        callback();
    }
}

/** @ignore */
function _httpsTAMReq (options, payload, callback) {

    var basePath = null;
    var testPath = null;

    if (options.path.indexOf($impl.reqroot) > -1) {
        basePath = $impl.reqroot;
        testPath = (lib.oracle.iot.client.test ? lib.oracle.iot.client.test.reqroot : null);
    } else if (lib.oracle.iot.client.test && (options.path.indexOf(lib.oracle.iot.client.test.reqroot) > -1)) {
        basePath = lib.oracle.iot.client.test.reqroot;
    }

    // @TODO: Better way of handling links
    if(options.path && ((options.path.indexOf('http:') === 0) || (options.path.indexOf('https:') === 0))){
        options.path = options.path.substring(options.path.indexOf(basePath));
    }

    var _opt = {};
    var oracleIoT = true;
    if (!(options.tam)) {
        options.tam = $impl.tam;
    }
    if ((options.tam) && (options.tam instanceof $impl.TrustedAssetsManager)) {
        _opt.protocol = 'https';
        _opt.hostname = options.tam.getServerHost();
        _opt.port = options.tam.getServerPort();
    } else if (typeof location !== 'undefined') {
        if (location.protocol) {
            var i = location.protocol.indexOf(':');
            _opt.protocol = (i<0) ? location.protocol : location.protocol.substring(0, i);
        }
        if (location.hostname) {
            _opt.hostname = location.hostname;
        }
        if (location.port) {
            _opt.port = location.port;
        }
        oracleIoT = false;
    }
    _opt.headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    //@TODO: Remove basic auth; only for tests and test server
    //@TODO: (jy) use lib.debug if this configuration is really/always needed for tests ...
    if (lib.oracle.iot.client.test && lib.oracle.iot.client.test.auth.activated) {
        _opt.protocol = lib.oracle.iot.client.test.auth.protocol;
        _opt.headers.Authorization = 'Basic ' + $port.util.btoa(lib.oracle.iot.client.test.auth.user + ':' + lib.oracle.iot.client.test.auth.password);
        if (testPath) {
            options.path = options.path.replace(basePath, testPath);
        }
    }

    for (var key in options) {
        if (key === 'headers') {
            for (var header in options.headers) {
                if (options.headers[header] === null) {
                    delete _opt.headers[header]
                } else {
                    _opt.headers[header] = options.headers[header];
                }
            }
        } else {
            _opt[key] = options[key];
        }
    }

    $port.https.req(_opt, payload, function(response_body, error) {
        if (!response_body || error) {
            callback(null, error);
            return;
        }
        var response_json = null;
        try {
            response_json = JSON.parse(response_body);
        } catch (e) {

        }
        if (!response_json || (typeof response_json !== 'object')) {
            callback(null, lib.createError('response not JSON'));
            return;
        }
        callback(response_json);
    }, oracleIoT);
}


//////////////////////////////////////////////////////////////////////////////

/** @ignore */
function _mandatoryArg(arg, types) {
    if (!arg) {
        lib.error('missing argument');
        return;
    }
    __checkType(arg, types);
}

/** @ignore */
function _optionalArg(arg, types) {
    if (!arg) {
        return;
    }
    __checkType(arg, types);
}

/** @ignore */
//@TODO: [v2] (?) increase check on 'number' with parseInt()!==NaN ?? 
//@TODO: [v2] add support for {'array':'type'}
function __isArgOfType(arg, type) {
    switch(typeof(type)) {
    case 'function':
    case 'object':
        return (arg instanceof type);
    case 'string':
        return (type==='array')
            ? Array.isArray(arg)
            : (typeof(arg) === type);
    default:
    }
    return false;
}

/** @ignore */
function __checkType(arg, types) {
    var argType = typeof(arg);
    if (Array.isArray(types)) {
        var nomatch = types.every(function(type) { return !__isArgOfType(arg, type); });
        if (nomatch) {
            lib.log('type mismatch: got '+argType+' but expecting any of '+types+')');
            lib.error('illegal argument type');
            return;
        }
        return;
    }
    if (!__isArgOfType(arg, types)) {
        lib.log('type mismatch: got '+argType+' but expecting '+types+')');
        lib.error('illegal argument type');
        return;
    }
}


//////////////////////////////////////////////////////////////////////////////
// file: library/shared/Client.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

//@TODO: add and validate this.tam = new $impl.TrustedAssetsManager();

/**
 * Client of the Oracle IoT Cloud Service. A client is a
 * directly-connected device, a gateway, or an enterprise
 * application.
 *
 * @class
 */
lib.Client = function () {
    this.cache = this.cache || {};
    this.cache.deviceModels = {};
};

/**
 * Create an AbstractVirtualDevice instance with the given device model
 * for the given device identifier. This method creates a new
 * AbstractVirtualDevice instance for the given parameters. The client
 * library does not cache previously created AbstractVirtualDevice
 * objects.
 * <p>
 * A device model can be obtained by it's afferent urn with the
 * Client if it is registered on the cloud.
 *
 * @see {@link iotcs.Client#getDeviceModel}
 * @param {string} endpointId - The endpoint identifier of the
 * device being modeled. 
 * @param {object} deviceModel - The device model object
 * holding the full description of that device model that this
 * device implements. 
 * @returns {iotcs.AbstractVirtualDevice} The newly created virtual device
 *
 * @memberof iotcs.Client.prototype
 * @function createVirtualDevice
 */
lib.Client.prototype.createVirtualDevice = function (endpointId, deviceModel) {
    _mandatoryArg(endpointId, 'string');
    _mandatoryArg(deviceModel, 'object');
    return new lib.AbstractVirtualDevice(endpointId, deviceModel, this);
};

/**
 * Get the device model for the urn.
 *
 * @param {string} deviceModelUrn - The URN of the device model
 * @param {function} callback - The callback function. This
 * function is called with the following argument: a
 * deviceModel object holding full description e.g. <code>{ name:"",
 * description:"", fields:[...], created:date,
 * isProtected:boolean, lastModified:date ... }</code> 
 *
 * @memberof iotcs.Client.prototype
 * @function getDeviceModel
 */
lib.Client.prototype.getDeviceModel = function (deviceModelUrn, callback) {
    _mandatoryArg(deviceModelUrn, 'string');
    _mandatoryArg(callback, 'function');
    var deviceModel = this.cache.deviceModels[deviceModelUrn];
    if (deviceModel) {
        callback(deviceModel);
        return;
    }
    var self = this;
    $impl.https.req({
        method: 'GET',
        path:   $impl.reqroot
            + '/deviceModels/' + deviceModelUrn
    }, '', function (response, error) {
        if(!response || error || !(response.urn)){
            callback(null, lib.createError('invalid response on get device model', error));
            return;
        }
        var deviceModel = response;
        Object.freeze(deviceModel);
        self.cache.deviceModels[deviceModelUrn] = deviceModel;
        callback(deviceModel);
    });
};


//////////////////////////////////////////////////////////////////////////////
// file: library/shared/Monitor.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

//@TODO: a little more JSDOC is needed; explain the (simple) state machine and e.g. when the monitor thread is actually started, whether start and stop can be called multiple time; the default frequency ...etc...

/**
 * @param {function()} callback - function associated to this monitor
 * @class
 */
/** @ignore */
$impl.Monitor = function (callback) {
    _mandatoryArg(callback, 'function');
    this.running = false;
    this.callback = callback;
};

//@TODO: a little more JSDOC is needed

/**
 * @memberof iotcs.util.Monitor.prototype
 * @function start
 */
$impl.Monitor.prototype.start = function () {
    if (this.running) {
        return;
    }
    this.running = true;
    var self = this;
    this.monitorid = _register(this.callback);
};

//@TODO: a little more JSDOC is needed

/**
 * @memberof iotcs.util.Monitor.prototype
 * @function stop
 */
$impl.Monitor.prototype.stop = function () {
    if (!this.running) {
        return;
    }
    this.running = false;
    _unregister(this.monitorid);
};

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
var monitors = {};

/** @ignore */
var index = 0;

/** @ignore */
var threadid = null;

/** @ignore */
function _caroussel() {
    Object.keys(monitors).forEach(function (id) {
        if (typeof monitors[id] === 'function') {
            monitors[id]();
        }
    });
}

/** @ignore */
function _register(callback) {
    monitors[++index] = callback;
    if (Object.keys(monitors).length === 1) {
        // if at least one registered monitor, then start thread
        if (threadid) {
            lib.log('inconsistent state: monitor thread already started!');
            return;
        }
        threadid = setInterval(_caroussel, lib.oracle.iot.client.monitor.pollingInterval);
    }
    return index;
}

/** @ignore */
function _unregister(id) {
    if (!monitors[id]) {
        lib.log('unknown monitor id #'+id);
        return;
    }
    delete monitors[id];
    if (Object.keys(monitors).length === 0) {
        // if no registered monitor left, then stop thread
        if (!threadid) {
            lib.log('inconsistent state: monitor thread already stopped!');
            return;
        }
        clearInterval(threadid);
        threadid = null;
    }
}


//////////////////////////////////////////////////////////////////////////////
// file: library/shared/AbstractVirtualDevice.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

//@TODO: is AbstractVirtualDevice supposed to be a public/visible class ? if not, could be moved to $impl @DONE: it is public in JavaSE

/**
 * AbstractVirtualDevice is a representation of a device model
 * implemented by an endpoint. A device model is a
 * specification of the attributes, formats, and resources
 * available on the endpoint. 
 * <p>
 * The AbstractVirtualDevice API is identical for both the enterprise
 * client and the device client. The semantics of the API are
 * also the same. The processing model on the enterprise
 * client is different, however, from the processing model on
 * the device client. 
 * <p>
 * A device model can be obtained by it's afferent urn with the
 * Client if it is registered on the cloud.
 * <p>
 * An AbstractVirtualDevice can also be created with the appropriate
 * parameters from the Client.
 *
 * @see {@link iotcs.Client#getDeviceModel}
 * @see {@link iotcs.Client#createVirtualDevice}
 * @param {string} endpointId - The endpoint id of this device
 * @param {object} deviceModel - The device model object
 * holding the full description of that device model that this
 * device implements.
 * @class
 */
lib.AbstractVirtualDevice = function (endpointId, deviceModel) {
    _mandatoryArg(endpointId, 'string');
    _mandatoryArg(deviceModel, 'object');

    this.endpointId = endpointId;
    this.model = deviceModel;

    Object.defineProperty(this, '_', {
        enumerable: false,
        configurable: false,
        writable: true,
        value: {}
    });

    Object.defineProperty(this, 'onChange', {
        enumerable: true,
        configurable: false,
        get: function () {
            return this._.onChange;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set something to onChange that is not a function!');
                return;
            }
            this._.onChange = newValue;
        }
    });
    this._.onChange = null;

    Object.defineProperty(this, 'onError', {
        enumerable: true,
        configurable: false,
        get: function () {
            return this._.onError;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set something to onError that is not a function!');
                return;
            }
            this._.onError = newValue;
        }
    });
    this._.onError = null;
};

/**
 * Get the device model of this device object. This is the exact model
 * that was used at construction of the device object.
 *
 * @returns {Object} the object representing the device model for this
 * device
 *
 * @memberof iotcs.AbstractVirtualDevice.prototype
 * @function getDeviceModel
 */
lib.AbstractVirtualDevice.prototype.getDeviceModel = function () {
    return this.model;
};

/**
 * Get the endpoint id of the device.
 *
 * @returns {string} The endpoint id of this device as given at construction
 * of the virtual device
 *
 * @memberof iotcs.AbstractVirtualDevice.prototype
 * @function getEndpointId
 */
lib.AbstractVirtualDevice.prototype.getEndpointId = function () {
    return this.endpointId;
};

//@TODO: accessing directly a very internal object is not clean: e.g. "this.attributes[attribute]._."

/**
 * The update call allows more than one value to be set on
 * this Device object and in the end, it is sending the values
 * to the server.
 * <p>
 * The values are sent to the server when the method is
 * called, which also marks the end of the update
 * transaction.
 * <p>
 * For example <code>device.update({"min":10, "max":20});</code>
 * <p>
 * If the virtual device has the onError property set with a callback
 * method or any/all of the attributes given in the update call
 * have the onError attribute set with a callback method, in case
 * of error on update the callbacks will be called with related attribute
 * information. See VirtualDevice description for more info on onError.
 *
 * @param {Object} attributes - An object holding a list of attribute name/
 * value pairs to be updated as part of this transaction,
 * e.g. <code>{ "temperature":23, ... }</code>. Note that keys shall refer
 * to device attribute names or aliases. 
 *
 * @see {@link iotcs.enterprise.VirtualDevice}
 * @memberof iotcs.AbstractVirtualDevice.prototype
 * @function update
 */
lib.AbstractVirtualDevice.prototype.update = function (attributes) {

};

/**
 * Close this virtual device and all afferent resources used
 * for monitoring or controlling the device.
 *
 * @memberof iotcs.AbstractVirtualDevice.prototype
 * @function close
 */
lib.AbstractVirtualDevice.prototype.close = function () {
    this.endpointId = null;
    this.model = null;
    this.onChange = function (arg) {};
    this.onError = function (arg) {};
};

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
function _link(name, device, element) {
    _mandatoryArg(name, 'string');
    _mandatoryArg(device, 'object'); //@TODO: should be checked against instance name
    _mandatoryArg(element, 'object');
    if (device[name]) {
        lib.error('cannot link, device already has a property called "'+name+'"');
        return;
    }
    Object.defineProperty(device, name, {
        enumerable: true,
        configurable: false,
        writable: false,
        value: element
    });
    Object.defineProperty(element, 'device', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: device
    });
}


//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/$impl-ecl.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

//General TODOs:

//@TODO: all $impl.https.req(...,...,(function(response){ /*HERE*/})); do not handle error cases consistently: some are lib.error(), while others are callback(null) @DONE
//@TODO: all conditions should be defensively parenthized e.g. "if (a==b && !c && d)" => if ((a==b) && (!c) && (d))"
//@TODO: there should be more lib.oracle.iot.XXX.defaultLimit and every Pageable instanciation should use its own explicitely for maximum configurability: e.g. "new lib.enterprise.Pageable({},,,lib.oracle.iot.XXX.defaultLimit);"

//@TODO: code as flat as possible: e.g. instead of if(ok) { } => use if(!ok) {error | return ...} ... } @DONE
//@TODO: error message case should be consistent: all lowercase or w first letter Uppercase ...etc... @DONE
//@TODO: if/while/catch/... are not functions e.g. conventionally "if(XX)" should be "if (X)"
//@TODO: "function(" => "function ("
//@TODO: "){" => ") {"
//@TODO: "}\nelse {\n" => "} else {\n"

//@TODO: we probably need a few global (lib-private) functions to do advanced parameter value checking (e.g. check that appid has no "/" (or %XX equivalent ...etc...) ... this depends on needs from other classes/functions...
//@TODO: lib.error() is currently not satisfactory; related: callbacks (especially not in timeout/intervals) should not throw any exceptions ...etc...


//@TODO (last) align DCL to ECL for all sibling definitions (use winmerge ...)

//////////////////////////////////////////////////////////////////////////////

//@TODO: should probably be /iot/webapi/v2
//@TODO: should probably be moved to "lib.oracle.iot.server.pathroot" => @globals.js
/** @ignore */
$impl.reqroot = '/iot/webapi/v2';




//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/Action.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

//@TODO: missing JSDOC

/**
 * @class
 */
/** @ignore */
$impl.Action = function (actionSpec) {
    _mandatoryArg(actionSpec, 'object');

    if (!actionSpec.name) {
        lib.error('attribute specification in device model is incomplete');
        return;
    }

    var spec = {
        name: actionSpec.name,
        description: (actionSpec.description || ''),
        argType: (actionSpec.argType || null),
        alias: (actionSpec.alias || null)
    };

    if (actionSpec.range) {
        spec.range = _parseRange(spec.argType, actionSpec.range);
    }

    /** @private */
    Object.defineProperty(this, '_', {
        enumerable: false,
        configurable: false,
        writable: true,
        value: {}
    });

    // public members

    /**
     * @memberof iotcs.Action
     * @member {string} name - the name of this action
     */
    Object.defineProperty(this, 'name', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.name
    });

    /**
     * @memberof iotcs.Action
     * @member {string} description - the description of this action
     */
    Object.defineProperty(this, 'description', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.description
    });

    /**
     * @memberof iotcs.Action
     * @member {function(Object)} onExecute - the action to perform when the response to an execute() is
     * received from the other party
     */
    Object.defineProperty(this, 'onExecute', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.onExecute;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set something to onExecute that is not a function!');
                return;
            }
            this._.onExecute = newValue;
        }
    });
    this._.onExecute = function (arg) {};

    /** @private */
    this.checkVarArg = function (arg) {
        if (!spec.argType) {
            if (typeof arg !== 'undefined') {
                lib.error('invalid number of arguments');
                return false;
            }
        } else {
            if (typeof arg === 'undefined') {
                lib.error('invalid number of arguments');
                return false;
            }
            if (!_matchType(spec.argType, arg)) {
                lib.error('type mismatch; action "'+spec.name+'" requires arg type [' + spec.argType + ']');
                return false;
            }
            if (spec.range && ((arg<spec.range.low) || (arg>spec.range.high))) {
                lib.error('trying to use an argument which is out of range ['+spec.range.low+' - '+spec.range.high+']');
                return false;
            }
        }
        return true;
    };
};


//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/Alert.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

//@TODO: missing JSDOC

/**
 * @class
 */
/** @ignore */
$impl.Alert = function (alertSpec) {
    _mandatoryArg(alertSpec, 'object');

    if (!alertSpec.urn) {
        lib.error('alert specification in device model is incomplete');
        return;
    }

    var spec = {
        urn: alertSpec.name,
        description: (alertSpec.description || ''),
        name: (alertSpec.name || null)
    };

    /** @private */
    Object.defineProperty(this, '_', {
        enumerable: false,
        configurable: false,
        writable: true,
        value: {}
    });

    // public members

    Object.defineProperty(this, 'urn', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.urn
    });

    Object.defineProperty(this, 'name', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.name
    });

    Object.defineProperty(this, 'description', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.description
    });

    Object.defineProperty(this, 'onAlerts', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.onAlerts;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set something to onAlert that is not a function!');
                return;
            }
            this._.onAlerts = newValue;
        }
    });
    this._.onAlerts = function (arg) {};

};

//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/Attribute.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

//@TODO: missing jsdoc

/**
 * @class
 */
/** @ignore */
$impl.Attribute = function (attributeSpec) {
    _mandatoryArg(attributeSpec, 'object');
    
    if ((!attributeSpec.name) || (!attributeSpec.type)) {
        lib.error('attribute specification in device model is incomplete');
        return;
    }

    var spec = {
        name: attributeSpec.name,
        description: (attributeSpec.description || ''),
        type: attributeSpec.type,
        writable: (attributeSpec.writable || false),
        alias: (attributeSpec.alias || null)
    };

    if (attributeSpec.range) {
        spec.range = _parseRange(spec.type, attributeSpec.range);
    }
    
    /** @private */
    Object.defineProperty(this, '_', {
        enumerable: false,
        configurable: false,
        writable: true,
        value: {}
    });
    this._.value = null;
    this._.lastKnownValue = null;
    this._.lastUpdate = null;
    this._.localUpdateRequest = false;

    var self = this;

    //@TODO: see comment in AbstractVirtualDevice; this is not clean especially it is supposed to be a private function and yet used in 4 other objects ...etc...; this looks like a required ((semi-)public) API ... or an $impl.XXX or a function ()...

    /** @private */
    Object.defineProperty(this._, 'remoteUpdate', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (newValue) {

            try {
                newValue = _checkAndGetNewValue(newValue, spec);
            } catch (e) {
                return false;
            }

            if (typeof newValue === 'undefined') {
                return false;
            }

            if (spec.range && ((newValue < spec.range.low) || (newValue > spec.range.high))) {
                return false;
            }

            self._.lastUpdate = Date.now();

            if (_equal(newValue, self._.lastKnownValue, spec)) {
                return false;
            }

            self._.lastKnownValue = newValue;

            if (spec.writable && self._.localUpdateRequest) {
                return false;
            } else {
                lib.log('updating attribute "' + spec.name + '" of type "' + spec.type + '" from ' + self._.value + ' to ' + newValue);
                self._.value = newValue;
                return true;
            }
        }
    });

    /** @private */
    Object.defineProperty(this._, 'onUpdateResponse', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (error) {
            if (error) {
                lib.log('updating attribute "' + spec.name + '" of type "' + spec.type + '" from ' + self._.value + ' to ' + self._.lastKnownValue);
                self._.value = self._.lastKnownValue;
            }
            self._.lastUpdate = new Date().getTime();
            self._.localUpdateRequest = false;
        }
    });

    /** @private */
    Object.defineProperty(this._, 'localUpdate', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (newValue, nosync) {

            newValue = _checkAndGetNewValue(newValue, spec);

            if (typeof newValue === 'undefined') {
                lib.error('trying to set an invalid value');
                return;
            }

            if (!spec.writable) {
                lib.error('illegal write access; attribute "' + spec.name + '" is read-only"');
                return;
            }

            if (spec.range && ((newValue < spec.range.low) || (newValue > spec.range.high))) {
                lib.error('trying to set a value out of range [' + spec.range.low + ' - ' + spec.range.high + ']');
                return;
            }

            if (_equal(newValue, self._.value, spec)) {
                return;
            }

            lib.log('updating attribute "' + spec.name + '" of type "' + spec.type + '" from ' + self._.value + ' to ' + newValue);
            self._.value = newValue;
            self._.localUpdateRequest = true;

            if (!nosync) {
                if (!self.device || !(self.device instanceof lib.enterprise.VirtualDevice)) {
                    return;
                }
                var attributes = {};
                attributes[spec.name] = newValue;
                self.device.controller.updateAttributes(attributes, true);
            }
        }
    });


    // public properties

    /**
     * @memberof iotcs.Attribute 
     * @member {string} id - the unique/reproducible
     * id for this attribute (usually its name)
     */
    Object.defineProperty(this, 'id', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.name
    });

    /**
     * @memberof iotcs.Attribute
     * @member {string} description - the description
     * of this attribute
     */
    Object.defineProperty(this, 'description', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.description
    });

    /**
     * @memberof iotcs.Attribute 
     * @member {string} type - one of <code>INTEGER</code>,
     * <code>NUMBER</code>, <code>STRING</code>, <code>BOOLEAN</code>, 
     * <code>DATETIME</code> 
     */
    Object.defineProperty(this, 'type', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.type
    });

    /**
     * @ignore
     * @memberof iotcs.Attribute 
     * @member {boolean} writable - expressing whether
     * this attribute is writable or not 
     */
    Object.defineProperty(this, 'writable', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: spec.writable
    });

    /**
     * @memberof iotcs.Attribute 
     * @member {function(Object)} onChange - function called
     * back when value as changed on the server side. Callback
     * signature is <code>function (e) {}</code>, where <code>e</code> 
     * is <code>{'attribute':this, 'newValue':, 'oldValue':}</code>
     */
    Object.defineProperty(this, 'onChange', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.onChange;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set to onChange something that is not a function!');
                return;
            }
            this._.onChange = newValue;
        }
    });

    /**
     * @memberof iotcs.Attribute 
     * @member {function(Object)} onError - function called
     * back when value could not be changed. Callback signature is
     * <code>function (e) {}</code>, where <code>e</code> is 
     * <code>{'attribute':this, 'newValue':, 'tryValue':}</code>
     */
    Object.defineProperty(this, 'onError', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.onError;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set to onError something that is not a function!');
                return;
            }
            this._.onError = newValue;
        }
    });

    /**
     * @memberof iotcs.Attribute 
     * @member {(number|string|boolean|Date)} value - used for setting or
     * getting the current value of this attribute (subject to whether it is writable
     * or not).
     */
    Object.defineProperty(this, 'value', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.value;
        },
        set: function (newValue) {
            this._.localUpdate(newValue, false);
        }
    });

    /**
     * @memberof iotcs.Attribute 
     * @member {(number|string|boolean|Date)} lastKnownValue - 
     * used for getting the current value of this attribute 
     */
    Object.defineProperty(this, 'lastKnownValue', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.lastKnownValue;
        },
        set: function (newValue) {
            return;
        }
    });

    /**
     * @memberof iotcs.Attribute
     * @member {Date} lastUpdate - the date of the last value update
     */
    Object.defineProperty(this, 'lastUpdate', {
        enumerable: false,
        configurable: false,
        get: function () {
            return this._.lastUpdate;
        },
        set: function (newValue) {
            return;
        }
    });
};

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
function _parseRange(type, rangeStr) {
    _mandatoryArg(type, 'string');
    _mandatoryArg(rangeStr, 'string');
    if ((type !== 'NUMBER') && (type !== 'INTEGER')) {
        lib.error('device model specification is invalid');
        return;
    }
    var rangeLimits = rangeStr.split(',');
    if (rangeLimits.length != 2) {
        lib.error('device model specification is invalid');
        return;
    }
    var first = parseFloat(rangeLimits[0]);
    var second = parseFloat(rangeLimits[1]);
    return { low:Math.min(first,second), high:Math.max(first,second) };
}

/** @ignore */
function _matchType(reqType, value) {
    _mandatoryArg(reqType, 'string');
    switch(reqType) {
        case 'INTEGER':
            return ((typeof value === 'number') && (value % 1 === 0));
        case 'NUMBER':
            return (typeof value === 'number');
        case 'STRING':
            return (typeof value === 'string');
        case 'BOOLEAN':
            return (typeof value === 'boolean');
        case 'DATETIME':
            return (value instanceof Date);
        default:
            lib.error('illegal state');
            return;
    }
}

/** @ignore */
function _checkAndGetNewValue(newValue, spec) {
    if (spec.type === 'DATETIME') {
        if (typeof newValue === 'number') {
            var str = '' + newValue;
            if (str.match(/^[-+]?[1-9]\.[0-9]+e[-]?[1-9][0-9]*$/)) {
                newValue = newValue.toFixed();
            }
        }
        newValue = new Date(newValue);
        if (isNaN(newValue.getTime())) {
            lib.error('invalid date in date time parameter');
            return;
        }
    }
    if (!_matchType(spec.type, newValue)) {
        lib.error('type mismatch; attribute "' + spec.name + '" has type [' + spec.type + ']');
        return;
    }
    return newValue;
}

/** @ignore */
function _equal(newValue, oldValue, spec) {
    if (spec.type === 'DATETIME'
        && (newValue instanceof Date)
        && (oldValue instanceof Date)) {
        return (newValue.getTime() === oldValue.getTime());
    } else {
        return (newValue === oldValue);
    }
}


//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/AsyncRequestMonitor.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/** @ignore */
$impl.AsyncRequestMonitor = function (requestId, callback) {
    _mandatoryArg(requestId, ['string','number']);
    _mandatoryArg(callback, 'function');
    this.requestId = requestId;
    this.callback = callback;
    this.monitor = null;
    this.startTime = null;
};

/** @ignore */
$impl.AsyncRequestMonitor.prototype.start = function () {
    var self = this;
    if (!this.monitor) {
        this.monitor = new $impl.Monitor(function () {
            _requestMonitor(self);
        });
    }
    if (!this.monitor.running) {
        this.monitor.start();
        this.startTime = Date.now();
    }
};

/** @ignore */
$impl.AsyncRequestMonitor.prototype.stop = function () {
    if (this.monitor) {
        this.monitor.stop();
    }
    this.startTime = null;
};

/** @ignore */
function _requestMonitor (monitorObject){
    if (monitorObject.startTime
        && (Date.now() > (monitorObject.startTime + lib.oracle.iot.client.controller.asyncRequestTimeout))) {
        monitorObject.stop();
        var response = {
            complete: true,
            id: monitorObject.requestId,
            status: 'TIMEOUT'
        };
        monitorObject.callback(response);
        return;
    }
    $impl.https.req({
        'method': 'GET',
        'path': $impl.reqroot
        + '/requests/'
        + monitorObject.requestId
    }, '', function (response, error) {
        try {
            if (!response || error) {
                monitorObject.stop();
                monitorObject.callback(response, lib.createError('invalid response',error));
                return;
            }
            if (!(response.status) || (typeof response.complete === 'undefined')) {
                monitorObject.stop();
                monitorObject.callback(response, lib.createError('invalid response type', error));
                return;
            }
            if (response.complete) {
                monitorObject.stop();
                monitorObject.callback(response);
            }
        } catch(e) {
            monitorObject.stop();
            monitorObject.callback(response, lib.createError('error on response',e));
            return;
        }
    });
}


//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/Controller.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

//@TODO: a little more JSDOC is needed

/**
 * @param {function()} callback - function associated to this monitor
 * @class
 */
/** @ignore */
$impl.Controller = function (device) {
    _mandatoryArg(device, lib.AbstractVirtualDevice);
    this.device = device;
    this.requestMonitors = {};
};

/**
 * @TODO: MISSING DESCRIPTION
 *
 * @param {Object} attributeNameValuePairs - map of attribute names to update with
 * associated values. e.g. { name1:value1, name2:value2, ...}
 *
 * @memberof iotcs.util.Controller.prototype
 * @function updateAttributes
 */
$impl.Controller.prototype.updateAttributes = function (attributeNameValuePairs, singleAttribute) {
    _mandatoryArg(attributeNameValuePairs, 'object');

    if (Object.keys(attributeNameValuePairs).length === 0) {
        return;
    }
    for(var attributeName in attributeNameValuePairs) {
        if (!this.device[attributeName]) {
            lib.error('device model attribute mismatch');
            return;
        }
    }
    var endpointId = this.device.getEndpointId();
    var deviceModelUrn = this.device.getDeviceModel().urn;
    var selfDevice = this.device;
    var self = this;

    _checkIfDeviceIsDeviceApp(this.device, function () {

        $impl.https.req({
            method: (singleAttribute ? 'PUT' : 'POST'),
            headers: (singleAttribute ? {} : {
                'X-HTTP-Method-Override': 'PATCH'
            }),
            path: $impl.reqroot
            + '/apps/' + self.device.client.appid
            + ((self.device._.isDeviceApp === 2) ? '/deviceApps/' : '/devices/') + endpointId
            + '/deviceModels/' + deviceModelUrn
            + '/attributes'
            + (singleAttribute ? ('/'+Object.keys(attributeNameValuePairs)[0]) : '')
        }, (singleAttribute ? JSON.stringify({value: attributeNameValuePairs[Object.keys(attributeNameValuePairs)[0]]}) : JSON.stringify(attributeNameValuePairs)), function (response, error) {
            if (!response || error || !(response.id)) {
                _attributeUpdateResponseProcessor(null, selfDevice, attributeNameValuePairs, lib.createError('invalid response on update async request', error));
                return;
            }
            var reqId = response.id;

            try {
                var monitor = new $impl.AsyncRequestMonitor(reqId, function (response, error) {
                    _attributeUpdateResponseProcessor(response, selfDevice, attributeNameValuePairs, error);
                });
                self.requestMonitors[reqId] = monitor;
                self.requestMonitors[reqId].start();
            } catch (e) {
                _attributeUpdateResponseProcessor(null, selfDevice, attributeNameValuePairs, lib.createError('invalid response on update async request', e));
            }
        });
    });
};

/**
 * @memberof iotcs.util.Controller.prototype
 * @function invokeAction
 */
$impl.Controller.prototype.invokeAction = function (actionName, arg) {
    _mandatoryArg(actionName, 'string');

    if (!this.device[actionName]) {
        lib.error('device model action mismatch');
        return;
    }
    if (!this.device[actionName].checkVarArg(arg)) {
        lib.error('invalid parameters on action call');
        return;
    }

    var endpointId = this.device.getEndpointId();
    var deviceModelUrn = this.device.getDeviceModel().urn;
    var selfDevice = this.device;
    var self = this;

    _checkIfDeviceIsDeviceApp(this.device, function () {

        $impl.https.req({
            method: 'POST',
            path: $impl.reqroot
            + '/apps/' + self.device.client.appid
            + ((self.device._.isDeviceApp === 2) ? '/deviceApps/' : '/devices/') + endpointId
            + '/deviceModels/' + deviceModelUrn
            + '/actions/' + actionName
        }, ((typeof arg !== 'undefined') ? JSON.stringify({value: arg}) : JSON.stringify({})) , function (response, error) {
            if (!response || error || !(response.id)) {
                _actionExecuteResponseProcessor(response, selfDevice, actionName, lib.createError('invalid response on execute async request', error));
                return;
            }
            var reqId = response.id;

            try {
                var monitor = new $impl.AsyncRequestMonitor(reqId, function (response, error) {
                    _actionExecuteResponseProcessor(response, selfDevice, actionName, error);
                });

                self.requestMonitors[reqId] = monitor;
                self.requestMonitors[reqId].start();
            } catch (e) {
                _actionExecuteResponseProcessor(response, selfDevice, actionName, lib.createError('invalid response on execute async request', e));
            }
        });
    });
};


/**
 * @TODO MISSING DESCRIPTION
 *
 * @memberof iotcs.util.Controller.prototype
 * @function close
 */
$impl.Controller.prototype.close = function () {
    for(var key in this.requestMonitors) {
        this.requestMonitors[key].stop();
    }
    this.requestMonitors = {};
    this.device = null;
};

//////////////////////////////////////////////////////////////////////////////

/**@ignore*/
function _attributeUpdateResponseProcessor (response, device, attributeNameValuePairs, extError) {
    var error = false;
    if (!response || extError) {
        error = true;
        response = extError;
    } else {
        error = (response.status === 'FAILED'
        || (!response.response)
        || (!response.response.statusCode)
        || (response.response.statusCode > 299)
        || (response.response.statusCode < 200));
    }
    var attrObj = {};
    var newValObj = {};
    var tryValObj = {};
    for (var attributeName in attributeNameValuePairs) {
        var attribute = device[attributeName];
        attribute._.onUpdateResponse(error);
        attrObj[attribute.id] = attribute;
        newValObj[attribute.id] = attribute.value;
        tryValObj[attribute.id] = attributeNameValuePairs[attributeName];
        if (error && attribute.onError) {
            var onAttributeErrorTuple = {
                attribute: attribute,
                newValue: attribute.value,
                tryValue: attributeNameValuePairs[attributeName],
                errorResponse: response
            };
            attribute.onError(onAttributeErrorTuple);
        }
    }
    if (error && device.onError) {
        var onDeviceErrorTuple = {
            attributes: attrObj,
            newValues: newValObj,
            tryValues: tryValObj,
            errorResponse: response
        };
        device.onError(onDeviceErrorTuple);
    }
}

/**@ignore*/
function _actionExecuteResponseProcessor(response, device, actionName, error) {
    var action = device[actionName];
    if (action.onExecute) {
        action.onExecute(response, error);
    }
}

/** @ignore */
function _checkIfDeviceIsDeviceApp(virtualDevice, callback) {

    if (virtualDevice._.isDeviceApp) {
        callback();
        return;
    }

    var deviceId = virtualDevice.getEndpointId();

    var filter = new lib.enterprise.Filter();
    filter = filter.eq('id',deviceId);

    $impl.https.req({
        method: 'GET',
        path:   $impl.reqroot
        + (virtualDevice.client.appid ? ('/apps/' + virtualDevice.client.appid) : '')
        + '/deviceApps'
        + '?fields=type'
        + '&q=' + filter.toString()
    }, '', function (response, error) {
        if (!response || error || !response.items || !Array.isArray(response.items)) {
            lib.createError('invalid response on device app check request - assuming virtual device is a device');
        } else {
            if ((response.items.length > 0) && response.items[0].type && (response.items[0].type === 'DEVICE_APPLICATION')) {
                virtualDevice._.isDeviceApp = 2;
                callback();
                return;
            }
        }

        virtualDevice._.isDeviceApp = 1;
        callback();

    });

}



//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/Pageable.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * The Pageable is a utility class used by the implementation
 * of some operations of this library that retrieve requested
 * data page by page. This processor is typically returned on
 * {@link lib.enterprise.EnterpriseClient#getApplications} or {@link
 * lib.enterprise.EnterpriseClient#getDevices}.
 *
 * @memberOf iotcs.enterprise
 * @alias Pageable
 *
 * @param {Object} options - the options that are given to the
 * XMLHttpRequest object for making the initial request without
 * the paging parameters (without offset or limit)
 * @param {string} [payload] - the payload used in the initial and
 * subsequent requests made for generating the pages
 * @param {number} [limit] - the initial limit used for generating
 * the pages requested; optional as if none is given the default is 50
 * @class
 */
lib.enterprise.Pageable = function (options, payload, limit) {
    _mandatoryArg(options, 'object');
    _optionalArg(payload, 'string');
    _optionalArg(limit, 'number');

    this.options = options;
    this.payload = payload || '';
    this.limit = limit || lib.oracle.iot.client.pageable.defaultLimit;

    this.next = null;
    this.last = null;
    this.first = null;
    this.prev = null;
    this.basepath = _GetBasePath(options);
};

//@TODO: (jy) look for cleaner solution than "((this.basepath.indexOf('?') > -1)"

/**
 * This method requests a specific page based on the
 * parameters given to it. The method returns a Promise
 * with the parameter given to the handlers (response) in the form
 * of a JSON object representing the actual page requested.
 * <p>
 * A standard page response would have the following useful properties:<br>
 * - items: the array of items representing content of the page<br>
 * - hasMore: a boolean value that would tell if a 'next' call can be made<br>
 * - count: the count of all the items that satisfy the request query
 *
 * @param {(number|string)} offset - this parameters will set
 * where the initial element of the page to be set; if the
 * parameter is a number then the exact number is the position
 * of the first element of the page, if the parameter is string
 * then the values can be: 'first', 'last', 'next' and 'prev'
 * and the page requested will be according to link associated
 * to each setting: 'first page', 'next page' etc.
 * @param {number} [limit] - if the offset is a number
 * then this parameter will be used to set a new limit for pages;
 * if the parameter is not set the limit used in the constructor
 * will be used
 *
 * @returns {Promise} a promise of the response to the requested
 * page; the promise can be used in the standard way with
 * .then(resolve, reject) or .catch(resolve) resolve and reject
 * functions are defined as reject(response)
 *
 * @memberof iotcs.enterprise.Pageable.prototype
 * @function page
 */
lib.enterprise.Pageable.prototype.page = function (offset, limit) {
    _mandatoryArg(offset, ['string', 'number' ]);
    _optionalArg(limit, 'number');

    var _limit = limit || this.limit;

    switch (typeof(offset)) {
    case 'number':
        if (this.basepath) {
            this.options.path = this.basepath + ((this.basepath.indexOf('?') > -1) ? '&' : '?') + 'offset=' + offset + '&limit=' + _limit;
        }
        break;
    case 'string':
        if ((offset === 'first') && (!this.first)) {
            this.options.path = this.basepath + ((this.basepath.indexOf('?') > -1) ? '&' : '?') + 'offset=0&limit=' + _limit;
        } else if (['first', 'last', 'next', 'prev'].indexOf(offset) !== -1) {
            if (this[offset]) {
                this.options.path = this[offset];
            } else {
                lib.error('invalid request');
                return;
            }
        } else {
            lib.error('invalid request');
            return;
        }
    }

    var self = this;

    var parseLinks = function (response) {
        self.first = null;
        self.last = null;
        self.next = null;
        self.prev = null;
        if (response.links && Array.isArray(response.links)) {
            var links = response.links;
            links.forEach(function (link) {
                if(!link.rel || !link.href){
                    return;
                }
                self[link.rel] = link.href;
            });
        }
    };

    var rejectHandle = function (response, error) {
        lib.createError('invalid response on pageable request', error);
        return;
    };

    var promise = $port.util.promise( function (resolve, reject) {
        $impl.https.req(self.options, self.payload, function (response, error) {
            if (!response || error || !response.links || !Array.isArray(response.links)) {
                reject(response, error);
                return;
            }
            Object.freeze(response);
            resolve(response);
        });
    });

    promise.then(parseLinks, rejectHandle);
    return promise;
};

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
function _GetBasePath(options){
    if (!options.path || (typeof options.path !== 'string')) {
        lib.error('invalid path for request');
        return null;
    }
    var index = options.path.indexOf('?');
    if (index < 0) {
        return options.path;
    }
    var query = $port.util.query.parse(options.path.substr(index + 1));
    delete query.offset;
    delete query.limit;
    var result = options.path.substr(0, (index + 1)) + $port.util.query.stringify(query);
    //@TODO: need to understand this; decodeURI is usually applied only on query-parameter values ... not whole query 
    result = decodeURI(result);  //Added this line because of strange behaviour in browser without it (open a new window then close it)
    return result;
}


//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/MessageEnumerator.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 * @overview
 * The device and enterprise client libraries simplify working with
 * the Oracle IoT Cloud Service. This is a lower level abstraction
 * over top of messages and REST APIs. The API uses enumerators for
 * basic entities that can be retrieved via REST API from the cloud
 * server.
 */

//@TODO: jsdoc issue: MessageEnumerator appears in iotcs.* and not at index level (probably due to missing class jsdoc on lib.enterprise.MessageEnumerator) @DONE

//@TODO: move default value pageSize to lib.oracle.iot.... global @DONE
//@TODO: move default value messageListenMaxSize to lib.oracle.iot.... global @DONE: changed name also

/**
 * A class that implements a way of getting the history
 * of all messages from the cloud and also register listeners
 * to the messages received.
 *
 * @param {iotcs.enterprise.EnterpriseClient} client - The enterprise client
 * associated with the application context of the messages that need to be enumerated
 * or listened to.
 *
 * @memberOf iotcs.enterprise
 * @alias MessageEnumerator
 * @class
 */
lib.enterprise.MessageEnumerator = function (client) {
    _mandatoryArg(client, lib.enterprise.EnterpriseClient);
    this.client = client;
    this._message = {
        callbacks: {},
        monitors: {},
        lastTime: {},
        inProgress: {},
        maxLimit: 1000,
        types: ['DATA', 'ALERT', 'REQUEST', 'RESPONSE', 'WAKEUP', 'UPDATE_BUNDLE', 'RESOURCES_REPORT'],
        allKey: 'ALL'
    };
};

//@TODO: (jy) check why model is param,paramValue
/**
 * Return a list of messages according to the given parameters.
 * The method will generate a query and make a request to the cloud
 * and a list of messages will be returned based on the query
 * in descendant order of arrival of the messages to the cloud.
 * <p>
 * The query for messages must be made based on one of the following
 * criteria or both:<br>
 * - "device": messages from a specific device<br>
 * - "type": messages of a given type<br>
 *
 * @param {string} [deviceId] - The id of the device as the source of the messages
 * from the enumerator. If this is null the messages for all devices will
 * be enumerated.
 * @param {string} [messageType] - The type of the messages to be enumerated.
 * If this is null then messages of all types will be enumerated.
 * The only types are: ['DATA', 'ALERT', 'REQUEST', 'RESPONSE', 'WAKEUP', 'UPDATE_BUNDLE', 'RESOURCES_REPORT'].
 * @param {boolean} [expand] - A flag that would say if the messages
 * in the response contains expanded data. If this is not present
 * the value is false.
 * @param {number} [since] - The timestamp in milliseconds since EPOC
 * that would represent that minimum time when the messages were received
 * @param {number} [until] - The timestamp in milliseconds since EPOC
 * that would represent that maximum time when the messages were received
 *
 * @returns {iotcs.enterprise.Pageable} A pageable instance with
 * which pages can be requested that contain messages as items
 *
 * @memberof iotcs.enterprise.MessageEnumerator.prototype
 * @function getMessages
 */
lib.enterprise.MessageEnumerator.prototype.getMessages = function(deviceId, messageType, expand, since, until){
    _optionalArg(deviceId, 'string');
    _optionalArg(messageType, 'string');
    _optionalArg(expand, 'boolean');
    _optionalArg(since, 'number');
    _optionalArg(until, 'number');

    if (messageType && this._message.types.indexOf(messageType) === -1) {
        lib.error('invalid parameter');
        return;
    }

    var separator = '&';
    var query = '?orderBy=deliveredTime:asc';

    if (deviceId) {
        query = query + separator + 'device=' + deviceId;
    }
    if (messageType) {
        query = query + separator + 'type=' + messageType;
    }
    if (expand) {
        query = query + separator + 'expand=true';
    }
    if (since) {
        query = query + separator + 'since=' + since;
    }
    if (until) {
        query = query + separator + 'until=' + until;
    }

    return new lib.enterprise.Pageable({
        method: 'GET',
        path:   $impl.reqroot
            + '/apps/' + this.client.appid
            + '/messages'
            + query
    }, '');

};

/**
 * Registers a callback method to be called when new messages of a given
 * type and/or for a given device are received.
 *
 * @param {string} [deviceId] - The id of the device for which the callback
 * is called when new messages arrives. If this is null the callback
 * will be called when messages for any device arrives.
 * @param {string} [messageType] - The type of the messages that the listener
 * listens to. The types are described in the getMessages method. If this is null
 * the callback will be called for all message types.
 * @param {function} callback - The callback function that will be called
 * when a new message from the associated device is received
 *
 * @see {@link iotcs.enterprise.MessageEnumerator#getMessages}
 * @memberof iotcs.enterprise.MessageEnumerator.prototype
 * @function setListener
 */
lib.enterprise.MessageEnumerator.prototype.setListener = function (deviceId, messageType, callback) {

    if (deviceId && (typeof deviceId === 'function')) {
        callback = deviceId;
        deviceId = null;
    } else if (messageType && (typeof messageType === 'function')) {
        callback = messageType;
        messageType = null;
    }

    _optionalArg(messageType, 'string');
    _optionalArg(deviceId, 'string');
    _mandatoryArg(callback, 'function');

    if (messageType && this._message.types.indexOf(messageType) === -1) {
        lib.error('invalid parameter');
        return;
    }

    if (!deviceId) {
        deviceId = this._message.allKey;
    }

    if (!messageType) {
        messageType = this._message.allKey;
    }

    if (!this._message.callbacks[messageType]) {
        this._message.callbacks[messageType] = {};
    }
    this._message.callbacks[messageType][deviceId] = callback;
    var self = this;
    _addMessageMonitor(self, messageType);
};

/**
 * The library will no longer monitor messages for the specified device and/or message type.
 *
 * @param {string} [deviceId] - The id of the device for which the monitoring
 * of messages will be stopped.
 * @param {string} [messageType] - The type of messages for which the monitoring
 * will be stopped. The types are described in the getMessages method.
 *
 * @see {@link iotcs.enterprise.MessageEnumerator#getMessages}
 * @memberof iotcs.enterprise.MessageEnumerator.prototype
 * @function unsetListener
 */
lib.enterprise.MessageEnumerator.prototype.unsetListener = function (deviceId, messageType) {
    _optionalArg(deviceId, 'string');
    _optionalArg(messageType, 'string');

    if (messageType && this._message.types.indexOf(messageType) === -1) {
        lib.error('invalid parameter');
        return;
    }

    if (!deviceId) {
        deviceId = this._message.allKey;
    }

    if (!messageType) {
        messageType = this._message.allKey;
    }

    if (messageType in this._message.callbacks) {
        if (deviceId in this._message.callbacks[messageType]) {
            delete this._message.callbacks[messageType][deviceId];
        }
        if (Object.keys(this._message.callbacks[messageType]).length === 0) {
            delete this._message.callbacks[messageType];
            _removeMessageMonitor(this, messageType);
        }
    }
};

//////////////////////////////////////////////////////////////////////////////

/**ignore*/
function _addMessageMonitor(enumerator, messageType) {
    if (messageType === enumerator._message.allKey) {
        enumerator._message.types.forEach(function(type){
            if (!enumerator._message.monitors[type]) {
                enumerator._message.monitors[type] = new $impl.Monitor(function (){
                    _messagesMonitor(enumerator, type);
                });
            }
            if (enumerator._message.monitors[type] && !enumerator._message.monitors[type].running) {
                enumerator._message.lastTime[type] = Date.now();
                enumerator._message.inProgress[type] = false;
                enumerator._message.monitors[type].start();
            }
        });
    } else {
        if (!enumerator._message.monitors[messageType]) {
            enumerator._message.monitors[messageType] = new $impl.Monitor(function (){
                _messagesMonitor(enumerator, messageType);
            });
        }
        if (enumerator._message.monitors[messageType] && !enumerator._message.monitors[messageType].running) {
            enumerator._message.lastTime[messageType] = Date.now();
            enumerator._message.inProgress[messageType] = false;
            enumerator._message.monitors[messageType].start();
        }
    }
}

/**ignore*/
function _removeMessageMonitor(enumerator, messageType) {
    if (messageType === enumerator._message.allKey) {
        enumerator._message.types.forEach(function(type){
            if (enumerator._message.monitors[type]
                && enumerator._message.monitors[type].running
                && !(type in enumerator._message.callbacks)) {
                enumerator._message.monitors[type].stop();
            }
        });
    } else {
        if (enumerator._message.monitors[messageType]
            && enumerator._message.monitors[messageType].running
            && !(messageType in enumerator._message.callbacks)) {
            enumerator._message.monitors[messageType].stop();
        }
    }
}

/**ignore*/
function _messagesMonitor(enumerator, messageType) {

    if (enumerator._message.inProgress[messageType]) {
        return;
    }

    enumerator._message.inProgress[messageType] = true;

    var now = Date.now();
    if (now > enumerator._message.lastTime[messageType]) {
        var pageable = enumerator.getMessages(null, messageType, false, enumerator._message.lastTime[messageType], now);
        var hasMore = false;
        pageable.page('first', enumerator._message.maxLimit).then(function (response) {
            _handleMessagesResponse(enumerator, response, messageType);
            hasMore = response.hasMore;
            var nextCheck = function () {
                pageable.page('next').then(function (response) {
                    _handleMessagesResponse(enumerator, response, messageType);
                    hasMore = response.hasMore;
                    if (hasMore) {
                        nextCheck();
                    } else {
                        enumerator._message.inProgress[messageType] = false;
                    }
                }, function (response, error) {lib.createError('invalid response on message monitoring');});
            };
            if (hasMore) {
                nextCheck();
            } else {
                enumerator._message.inProgress[messageType] = false;
            }
        }, function (response, error) {lib.createError('invalid response on message monitoring');} );
    }
}

/**ignore*/
function _handleMessagesResponse(enumerator, response, messageType){
    if (response
        && (response.items)
        && (Array.isArray(response.items))
        && (response.items.length > 0)) {
        for (var i = 0; i < response.items.length; i++ ){
            if (response.items[i].receivedTime && (response.items[i].receivedTime === enumerator._message.lastTime[messageType])) {
                continue;
            }
            var key2 = response.items[i].source;
            var key1 = response.items[i].type;
            if (enumerator._message.callbacks[key1] && enumerator._message.callbacks[key1][key2]) {
                enumerator._message.callbacks[key1][key2]([response.items[i]]);
            }
            key2 = enumerator._message.allKey;
            key1 = response.items[i].type;
            if (enumerator._message.callbacks[key1] && enumerator._message.callbacks[key1][key2]) {
                enumerator._message.callbacks[key1][key2]([response.items[i]]);
            }
            key2 = response.items[i].source;
            key1 = enumerator._message.allKey;
            if (enumerator._message.callbacks[key1] && enumerator._message.callbacks[key1][key2]) {
                enumerator._message.callbacks[key1][key2]([response.items[i]]);
            }
            key2 = enumerator._message.allKey;
            key1 = enumerator._message.allKey;
            if (enumerator._message.callbacks[key1] && enumerator._message.callbacks[key1][key2]) {
                enumerator._message.callbacks[key1][key2]([response.items[i]]);
            }
        }
        if (!response.hasMore) {
            if ((response.items.length > 0) && response.items[response.items.length-1].receivedTime) {
                enumerator._message.lastTime[messageType] = response.items[response.items.length - 1].receivedTime;
            } else {
                enumerator._message.lastTime[messageType] = enumerator._message.lastTime[messageType] + 1;
            }
        }
    }
}



//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/ResourceEnumerator.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * A class that implements a way of getting the custom
 * resources registered by a device and the possibility
 * of invoking them (V1 implementation).
 *
 * @memberOf iotcs.enterprise
 * @alias ResourceEnumerator
 *
 * @param {iotcs.enterprise.EnterpriseClient} client - The enterprise
 * client associated with the application context of the device
 * for which the resources need to be enumerated
 * @param {string} deviceId - The id for which the resources
 * are to be enumerated/invoked
 * @class
 */
lib.enterprise.ResourceEnumerator = function (client, deviceId) {
    _mandatoryArg(client, lib.enterprise.EnterpriseClient);
    _mandatoryArg(deviceId, 'string');
    this.client = client;
    this.deviceId = deviceId;
    this.requestMonitors = {};
};

/**
 * Return the list of resources that the device associated with the
 * enumerator has registered in the cloud.
 *
 * @returns {iotcs.enterprise.Pageable} A pageable instance with
 * which pages can be requested that contain resources as items
 *
 * @memberof iotcs.enterprise.ResourceEnumerator.prototype
 * @function getResources
 */
lib.enterprise.ResourceEnumerator.prototype.getResources = function () {
    return new lib.enterprise.Pageable({
        method: 'GET',
        path: $impl.reqroot
        + '/apps/' + this.client.appid
        + '/devices/' + this.deviceId
        + '/resources'
    }, '');
};

/**
 * Invokes the specified resource with defined options, query and payload.
 * <p>
 * Resources can be retrieved by using the getResources method and from the
 * items property of the response the resource objects can be extracted.
 * A resource object must have the following properties:<br>
 * - methods: an array of methods the resource accepts<br>
 * - endpointId: the device id<br>
 * - the self link: this the link that the resource can be accessed with present
 * in the links array property
 *
 * @param {object} resource -The resource to be invoked as described.
 * @param {{method:string,headers:object}} options - The request options.
 * The headers are optional and method is mandatory.
 * @param {object} [query] - The query for the request as JSON object.
 * @param {string} [body] - The payload for the request.
 * @param {function} callback - The callback function that is called when a
 * response arrives. The whole HTTP response as JSON object
 * is given as parameter to the callback function.
 *
 * @see {@link iotcs.enterprise.ResourceEnumerator#getResources}
 * @memberof iotcs.enterprise.ResourceEnumerator.prototype
 * @function invokeResource
 */
lib.enterprise.ResourceEnumerator.prototype.invokeResource = function (resource, options, query, body, callback) {

    if (query && (typeof query === 'function')) {
        callback = query;
        query = null;
    }

    if (body && (typeof body === 'function')) {
        callback = body;
        body = null;
    }

    _mandatoryArg(resource, 'object');
    _mandatoryArg(resource.methods, 'array');
    _mandatoryArg(resource.endpointId, 'string');
    _mandatoryArg(resource.links, 'array');
    _mandatoryArg(options, 'object');
    _mandatoryArg(options.method, 'string');
    _optionalArg(options.headers, 'object');
    _optionalArg(query, 'object');
    _optionalArg(body, 'string');
    _mandatoryArg(callback, 'function');

    if (resource.endpointId !== this.deviceId){
        lib.error('invalid resource');
        return;
    }

    var path = null;

    resource.links.forEach(function(link){
        if(link.rel && link.href && (link.rel === 'self')){
            path = link.href;
        }
    });

    if (!path) {
        lib.error('invalid resource');
        return;
    }

    var method = null;

    resource.methods.forEach(function (m) {
        if (m === options.method){
            method = options.method;
        }
    });

    if (!method) {
        lib.error('invalid options');
        return;
    }

    path = decodeURI(path + (query ? ('?=' + $port.util.query.stringify(query)) : ''));

    var opt = {
        method: method,
        path: path
    };

    if (options.headers) {
        opt.headers = options.headers;
    }

    var self = this;
    $impl.https.req(opt, (body ? body : null), function (response, error) {
        if (!response || error || !(response.id)) {
            callback(null, lib.createError('invalid response on async request for resource invocation', error));
            return;
        }
        var reqId = response.id;

        try {
            var monitor = new $impl.AsyncRequestMonitor(reqId, function (response, error) {
                if (!response || error) {
                    callback(null, lib.createError('invalid response on resource invocation', error));
                    return;
                }
                Object.freeze(response);
                callback(response);
            });
            self.requestMonitors[reqId] = monitor;
            self.requestMonitors[reqId].start();
        } catch (e) {
            callback(null, lib.createError('invalid response on async request for resource invocation', e));
        }
    });

};

/**
 * Closes the enumerator and will stop any pending resource invocations.
 *
 * @memberof iotcs.enterprise.ResourceEnumerator.prototype
 * @function close
 */
lib.enterprise.ResourceEnumerator.prototype.close = function () {
    for(var key in this.requestMonitors) {
        this.requestMonitors[key].stop();
    }
    this.requestMonitors = {};
    this.deviceId = null;
};




//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/DeviceAppEnumerator.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * A class that implements a way of getting device applications
 *
 * @memberOf iotcs.enterprise
 * @alias DeviceAppEnumerator
 *
 * @param {iotcs.enterprise.EnterpriseClient} client - The enterprise
 * client associated with the application context
 * for which the deviceApps need to be enumerated
 * @class
 */
lib.enterprise.DeviceAppEnumerator = function (client) {
    _mandatoryArg(client, lib.enterprise.EnterpriseClient);
    this.client = client;
};

/**
 * Return the list of deviceApps from the enterprise client context
 *
 * @returns {iotcs.enterprise.Pageable} A pageable instance with
 * which pages can be requested that contain deviceApps as items
 *
 * @memberof iotcs.enterprise.DeviceAppEnumerator.prototype
 * @function getDeviceApps
 */
lib.enterprise.DeviceAppEnumerator.prototype.getDeviceApps = function (filter) {

    _optionalArg(filter, lib.enterprise.Filter);

    return new lib.enterprise.Pageable({
        method: 'GET',
        path: $impl.reqroot
        + '/apps/' + this.client.appid
        + '/deviceApps'
        + (filter ? ('?q=' + filter.toString()) : '')
    }, '');
};

//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/EnterpriseClient.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * EnterpriseClient is a enterprise application, client of the
 * Oracle IoT Cloud Service.
 *
 * @memberOf iotcs.enterprise
 * @alias EnterpriseClient
 *
 * @param {string} appid - The application identifier as it is in the cloud
 * @class
 * @extends iotcs.Client
 */
lib.enterprise.EnterpriseClient = function (appid) {
    _mandatoryArg(appid, 'string');

    lib.Client.call(this);

    if(appid.indexOf('/') > -1){
        lib.error('invalid app id parameter given');
        return;
    }

    this.cache = this.cache || {};

    Object.defineProperty(this, 'appid',{
        enumerable: true,
        configurable: false,
        writable: false,
        value: appid
    });

    Object.defineProperty(this, '_',{
        enumerable: false,
        configurable: false,
        writable: false,
        value: {}
    });

    Object.defineProperty(this._, 'bulkMonitorInProgress',{
        enumerable: false,
        configurable: false,
        writable: true,
        value: false
    });

    Object.defineProperty(this._, 'lastUntil',{
        enumerable: false,
        configurable: false,
        writable: true,
        value: Date.now()
    });

    Object.defineProperty(this._, 'virtualDevices',{
        enumerable: false,
        configurable: false,
        writable: false,
        value: {}
    });

    var self = this;

    Object.defineProperty(this._, 'removeVirtualDevice',{
        enumerable: false,
        configurable: false,
        writable: false,
        value: function(device) {
            if (self._.virtualDevices[device.getEndpointId()]) {
                if (self._.virtualDevices[device.getEndpointId()][device.getDeviceModel().urn]) {
                    delete self._.virtualDevices[device.getEndpointId()][device.getDeviceModel().urn];
                }
                if (Object.keys(self._.virtualDevices[device.getEndpointId()]).length === 0) {
                    delete self._.virtualDevices[device.getEndpointId()];
                }
            }
        }
    });

    Object.defineProperty(this._, 'addVirtualDevice',{
        enumerable: false,
        configurable: false,
        writable: false,
        value: function(device){
            self._.removeVirtualDevice(device);
            if (!self._.virtualDevices[device.getEndpointId()]) {
                self._.virtualDevices[device.getEndpointId()] = {};
            }
            self._.virtualDevices[device.getEndpointId()][device.getDeviceModel().urn] = device;
        }
    });

    this.monitor = new $impl.Monitor(function(){
        _remoteBulkMonitor(self);
    });
    this.monitor.start();

};

lib.enterprise.EnterpriseClient.prototype = Object.create(lib.Client.prototype);
lib.enterprise.EnterpriseClient.constructor = lib.enterprise.EnterpriseClient;

/**
 * Creates an enterprise client based on the application name.
 *
 * @param {string} appName - The application name as it is on
 * the cloud server.
 * @param {function} callback - The callback function. This function is called with
 * an object as parameter that is a created and initialized instance of an
 * EnterpriseClient with the application endpoint id associated with the application
 * name given as parameter.
 *
 * @see {@link iotcs.enterprise.EnterpriseClient}
 * @memberof iotcs.enterprise.EnterpriseClient
 * @function newClient
 */
lib.enterprise.EnterpriseClient.newClient = function (appName, callback) {

    _mandatoryArg(appName, 'string');
    _mandatoryArg(callback, 'function');

    var f = (new lib.enterprise.Filter()).eq('name', appName);

    $impl.https.req({
        method: 'GET',
        path: $impl.reqroot
        + '/apps'
        + '?q=' + f.toString()
    }, '', function(response, error) {
        if((!response) || error
            || (!response.items)
            || (!Array.isArray(response.items))
            || (response.items.length !== 1)
            || (!response.items[0].id)) {
            callback(null, lib.createError('invalid response on client creation request', error));
            return;
        }
        try {
            var client = new lib.enterprise.EnterpriseClient(response.items[0].id);
            callback(client);
        } catch (e) {
            callback(null, lib.createError('invalid response on client creation request', e));
        }
    });
};

/**
 * Get the all the applications that the user has access to.
 *
 * @returns {iotcs.enterprise.Pageable} A pageable instance with
 * which pages can be requested that contain application info
 * objects as items
 *
 * @memberof iotcs.enterprise.EnterpriseClient
 * @function getApplications
 */
lib.enterprise.EnterpriseClient.getApplications = function () {
    return new lib.enterprise.Pageable({
        method: 'GET',
        path:   $impl.reqroot
        + '/apps'
    }, '');
};

/**
 * Create a VirtualDevice instance with the given device model
 * for the given device identifier. This method creates a new
 * VirtualDevice instance for the given parameters. The client
 * library does not cache previously created VirtualDevice
 * objects.
 * <p>
 * A device model can be obtained by it's afferent urn with the
 * EnterpriseClient if it is registered on the cloud.
 *
 * @param {string} endpointId - The endpoint identifier of the
 * device being modeled.
 * @param {object} deviceModel - The device model object
 * holding the full description of that device model that this
 * device implements.
 * @returns {iotcs.enterprise.VirtualDevice} The newly created virtual device
 *
 * @see {@link iotcs.enterprise.EnterpriseClient#getDeviceModel}
 * @memberof iotcs.enterprise.EnterpriseClient.prototype
 * @function createVirtualDevice
 */
lib.enterprise.EnterpriseClient.prototype.createVirtualDevice = function (endpointId, deviceModel) {
    _mandatoryArg(endpointId, 'string');
    _mandatoryArg(deviceModel, 'object');
    return new lib.enterprise.VirtualDevice(endpointId, deviceModel, this);
};

/**
 * Get the application information that this enterprise client is associated with.
 *
 * @param {function} callback - The callback function. This function is called with the following argument:
 * an appinfo object holding all data and metadata associated to that appid e.g.
 * <code>{ id:"", name:"", description:"", metadata: { key1:"value1", key2:"value2", ... } }</code>
 *
 * @memberof iotcs.enterprise.EnterpriseClient.prototype
 * @function getApplication
 */
lib.enterprise.EnterpriseClient.prototype.getApplication = function (callback) {
    _mandatoryArg(callback, 'function');
    $impl.https.req({
        method: 'GET',
        path:   $impl.reqroot
            + '/apps/' + this.appid
    }, '', function(response, error) {
        if(!response || error || !response.id){
            callback(null, lib.createError('invalid response on application request', error));
            return;
        }
        var appinfo = response;
        Object.freeze(appinfo);
        callback(appinfo);
    });
};

/**
 * Get the device models associated with the application of
 * this enterprise client.
 *
 * @returns {iotcs.enterprise.Pageable} A pageable instance with
 * which pages can be requested that contain device models
 * associated with the application as items. An item can be used
 * to create VirtualDevices.
 *
 * @memberof iotcs.enterprise.EnterpriseClient.prototype
 * @function getDeviceModels
 */
lib.enterprise.EnterpriseClient.prototype.getDeviceModels = function () {
    return new lib.enterprise.Pageable({
        method: 'GET',
        path:   $impl.reqroot
            + '/apps/' + this.appid
            + '/deviceModels'
    }, '');
};

/**@inheritdoc*/
lib.enterprise.EnterpriseClient.prototype.getDeviceModel = function (deviceModelUrn, callback) {
    _mandatoryArg(deviceModelUrn, 'string');
    _mandatoryArg(callback, 'function');

    var deviceModel = this.cache.deviceModels[deviceModelUrn];
    if (deviceModel) {
        callback(deviceModel);
        return;
    }
    
    var f = (new lib.enterprise.Filter()).eq('urn', deviceModelUrn);
    var self = this;
    $impl.https.req({
        method: 'GET',
        path:   $impl.reqroot
            + '/apps/' + this.appid
            + '/deviceModels'
            + '?q=' + f.toString()
    }, '', function (response, error) {
        if((!response) || error
           || (!response.items)
           || (!Array.isArray(response.items))
           || (response.items.length !== 1)) {
            callback(null, lib.createError('invalid response on get device model request', error));
            return;
        }
        var deviceModel = response.items[0];
        Object.freeze(deviceModel);
        self.cache.deviceModels[deviceModelUrn] = deviceModel;
        callback(deviceModel);
    });
};

/**
 * Get the list of all active devices implementing the
 * specified device model and application of the client.
 *
 * @param {string} deviceModelUrn - The device model expected.
 * @returns {iotcs.enterprise.Pageable} A pageable instance with
 * which pages can be requested that contain devices as items.
 * A standard device item would have the "id" property that can
 * be used as endpoint id for creating virtual devices.
 *
 * @memberof iotcs.enterprise.EnterpriseClient.prototype
 * @function getActiveDevices
 */
lib.enterprise.EnterpriseClient.prototype.getActiveDevices = function (deviceModelUrn) {
    _mandatoryArg(deviceModelUrn, 'string');
    var f = new lib.enterprise.Filter();
    f = f.and([f.eq('deviceModels.urn', deviceModelUrn), f.eq('connectivityStatus', 'ONLINE'), f.eq('state','ACTIVATED')]);
    return this.getDevices(f, null);
};


//@TODO: (JY) simplify query builder ...

/**
 * Return a list of Devices associated with the application of the client.
 * The returned fields are limited to the fields defined in
 * fields. Filters forms a query.
 * Only endpoints that satisfy all the statements in filters
 * are returned.
 *
 * @param {iotcs.enterprise.Filter} filter - A filter as generated by the
 * Filter class.
 * @param {string[]} [fields] - Array of fields for the selected endpoint. Can be null.
 *
 * @returns {iotcs.enterprise.Pageable} A pageable instance with
 * which pages can be requested that contain devices as items
 *
 * @memberof iotcs.enterprise.EnterpriseClient.prototype
 * @function getDevices
 */
lib.enterprise.EnterpriseClient.prototype.getDevices = function (filter, fields) {
    _mandatoryArg(filter, lib.enterprise.Filter);
    _optionalArg(fields, 'array');

    var query = '?q=' + filter.toString();
    if (fields) {
        query += '&fields=' + fields.toString();
    }

    return new lib.enterprise.Pageable({
        method: 'GET',
        path:   $impl.reqroot
            + '/apps/' + this.appid
            + '/devices'
            + query
    }, '');
};

/**
 * Closes the resources used by this Client.
 * This will close all the virtual devices
 * created and associated with this enterprise
 * client.
 *
 * @see {@link iotcs.AbstractVirtualDevice#close}
 * @memberof iotcs.enterprise.EnterpriseClient.prototype
 * @function close
 */
lib.enterprise.EnterpriseClient.prototype.close = function () {
    this.monitor.stop();
    this.cache.deviceModels = {};
    for (var key in this._.virtualDevices) {
        for (var key1 in this._.virtualDevices[key]) {
            this._.virtualDevices[key][key1].close();
        }
    }
};

/** @ignore */
function _deviceMonitorInitialization(virtualDevice) {

    var deviceId = virtualDevice.getEndpointId();
    var urn = virtualDevice.getDeviceModel().urn;

    var postData = {};
    postData[deviceId] = [urn];

    $impl.https.req({
        method: 'POST',
        path:   $impl.reqroot
        + (virtualDevice.client.appid ? ('/apps/' + virtualDevice.client.appid) : '')
        + '/devices/data'
        + '?formatLimit=' + lib.oracle.iot.client.monitor.formatLimit
    }, JSON.stringify(postData), function (response, error) {

        if (!response || error || !response.data || !response.until
            || !(deviceId in response.data)
            || !(urn in response.data[deviceId])) {
            lib.createError('invalid response on device initialization data');
        } else {
            virtualDevice.client._.lastUntil = response.until;
            _processMonitorData(response.data, virtualDevice);
        }

        virtualDevice.client._.addVirtualDevice(virtualDevice);

    });

}

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
function _remoteBulkMonitor(client) {

    if (client._.bulkMonitorInProgress) {
        return;
    }

    client._.bulkMonitorInProgress = true;

    if (!client._.virtualDevices) {
        client._.bulkMonitorInProgress = false;
        return;
    }

    var devices = client._.virtualDevices;
    var postData = {};

    for (var devId in devices) {
        var deviceModels = devices[devId];
        postData[devId] = [];
        for (var urn in deviceModels) {
            postData[devId].push(urn);
        }
    }

    if (Object.keys(postData).length > 0) {
        $impl.https.req({
            method: 'POST',
            path:   $impl.reqroot
            + (client.appid ? ('/apps/' + client.appid) : '')
            + '/devices/data'
            + '?since=' + client._.lastUntil
            + '&formatLimit=' + lib.oracle.iot.client.monitor.formatLimit
        }, JSON.stringify(postData), function (response, error) {
            client._.bulkMonitorInProgress = false;
            if (!response || error || !response.until || !response.data) {
                lib.createError('invalid response on monitoring');
                return;
            }
            client._.lastUntil = response.until;
            var data = response.data;
            for (var devId in data) {
                for (var urn in data[devId]){
                    if (devices[devId] && devices[devId][urn]) {
                        _processMonitorData(data, devices[devId][urn]);
                    }
                }
            }
        });
    } else {
        client._.bulkMonitorInProgress = false;
    }

}

/** @ignore */
function _processMonitorData(data, virtualDevice) {
    var deviceId = virtualDevice.getEndpointId();
    var urn = virtualDevice.getDeviceModel().urn;
    var onChangeArray = [];
    if (data[deviceId][urn].attributes) {
        var attributes = data[deviceId][urn].attributes;
        for (var attributeName in attributes) {
            var attribute = virtualDevice[attributeName];
            if (!attribute) {
                lib.createError('device model attribute mismatch on monitoring');
                return;
            }
            var oldValue = attribute.value;
            if (!attribute._.remoteUpdate(attributes[attributeName])) {
                continue;
            }
            var onChangeTuple = {
                attribute: attribute,
                newValue: attribute.value,
                oldValue: oldValue
            };
            if (attribute.onChange) {
                attribute.onChange(onChangeTuple);
            }
            onChangeArray.push(onChangeTuple);
        }
    }
    if (virtualDevice.onChange) {
        virtualDevice.onChange(onChangeArray);
    }
    if (data[deviceId][urn].formats) {
        var formats = data[deviceId][urn].formats;
        for (var formatUrn in formats) {
            var alert = virtualDevice[formatUrn];
            if (!alert) {
                lib.createError('device model alert format mismatch on monitoring');
                return;
            }
            if (alert.onAlerts) {
                alert.onAlerts(formats[formatUrn]);
            }
        }
        if (virtualDevice.onAlerts) {
            virtualDevice.onAlerts(formats);
        }
    }
}


//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/Filter.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * Creates a Filter builder object.
 * This class allows to easily formulate filter queries and
 * convert straight to Json Queries. 
 *
 * @example
 * var f = new iotcs.enterprise.Filter();
 * f = f.and([
 *     f.eq("name","Andrew"),
 *     f.or([f.not(f.in("maritalStatus", ["MARRIED", "SINGLE"])),
 *           f.gte("children.count", 1)]),
 *     f.gt("salary.rank", 3),
 *     f.lte("salary.rank", 7),
 *     f.like("lastName", "G%")
 * ]);
 * lib.log(f.stringify());
 * // '{"$and":[{"name":{"$eq":"Andrew"}},{"$or":[{"$not":{"maritalStatus":{"$in":["MARRIED","SINGLE"]}}},{"children.count":{"$gte":1}}]},{"salary.rank":{"$gt":3}},{"salary.rank":{"$lte":7}},{"lastName":{"$like":"G%"}}]}';
 *
 * @memberOf iotcs.enterprise
 * @alias Filter
 * @class
 */
lib.enterprise.Filter = function (query) {
    this.query = query || {};
};

/**
 * Converts this filter into a JSON object
 *
 * @memberof iotcs.enterprise.Filter.prototype
 * @function toJSON
 */
lib.enterprise.Filter.prototype.toJSON = function () {
    return this.query;
};

/**
 * Returns a string containing a stringified version of the current filter
 *
 * @memberof iotcs.enterprise.Filter.prototype
 * @function toString
 */
lib.enterprise.Filter.prototype.toString = function () {
    return JSON.stringify(this.query);
};

/**
 * Alias for toString
 *
 * @memberof iotcs.enterprise.Filter.prototype
 * @function stringify
 */
lib.enterprise.Filter.prototype.stringify = lib.enterprise.Filter.prototype.toString;

/**
 * Equality operator
 * <p>
 * Note that if the value string does contain a <code>%</code>, 
 * then this operation is replaced by the 
 * {@link iotcs.enterprise.Filter#like like} operation.
 *
 * @param {string} field - the field name
 * @param {(string|number)} value - the value to compare the field
 * against. Values can only be simple types such as numbers or
 * string. 
 * @returns {iotcs.enterprise.Filter} a new Filter expressing this operation
 * @memberof iotcs.enterprise.Filter.prototype
 * @function eq
 */
lib.enterprise.Filter.prototype.eq = function (field, value) {
    if (_is(field, ['string']) &&
        _is(value, ['string', 'number'])) {
        var query = {};
        if ((typeof value === 'string') && (value.indexOf('%')>=0)) {
            lib.log('$eq value field contains a "%". Operation replaced into a $like');
            query[field] = {"$like":value};
        } else {
            query[field] = {"$eq":value};
        }
        return new lib.enterprise.Filter(query);
    }
    return null;
};

/**
 * Greater-than operator 
 *
 * @param {string} field - the field name
 * @param {number} value - the value to compare the field
 * against. Values can only be simple types such as numbers or
 * string. 
 * @returns {iotcs.enterprise.Filter} a new Filter expressing this operation
 * @memberof iotcs.enterprise.Filter.prototype
 * @function gt
 */
lib.enterprise.Filter.prototype.gt = function (field, value) {
    if (_is(field, ['string']) &&
        _is(value, ['number'])) {
        var query = {};
        query[field] = {"$gt":value};
        return new lib.enterprise.Filter(query);
    }
    return null;
};

/**
 * Greater-than-or-equal operator
 *
 * @param {string} field - the field name
 * @param {number} value - the value to compare the field
 * against. Values can only be simple types such as numbers or
 * string. 
 * @returns {iotcs.enterprise.Filter} a new Filter expressing this operation
 * @memberof iotcs.enterprise.Filter.prototype
 * @function gte
 */
lib.enterprise.Filter.prototype.gte = function (field, value) {
    if (_is(field, ['string']) &&
        _is(value, ['number'])) {
        var query = {};
        query[field] = {"$gte":value};
        return new lib.enterprise.Filter(query);
    }
    return null;
};

/**
 * Less-than operator
 *
 * @param {string} field - the field name
 * @param {number} value - the value to compare the field
 * against. Values can only be simple types such as numbers or
 * string. 
 * @returns {iotcs.enterprise.Filter} a new Filter expressing this operation
 * @memberof iotcs.enterprise.Filter.prototype
 * @function lt
 */
lib.enterprise.Filter.prototype.lt = function (field, value) {
    if (_is(field, ['string']) &&
        _is(value, ['number'])) {
        var query = {};
        query[field] = {"$lt":value};
        return new lib.enterprise.Filter(query);
    }
    return null;
};

/**
 * Less-than-or-equal operator
 *
 * @param {string} field - the field name
 * @param {number} value - the value to compare the field
 * against. Values can only be simple types such as numbers or
 * string. 
 * @returns {iotcs.enterprise.Filter} a new Filter expressing this operation
 * @memberof iotcs.enterprise.Filter.prototype
 * @function lte
 */
lib.enterprise.Filter.prototype.lte = function (field, value) {
    if (_is(field, ['string']) &&
        _is(value, ['number'])) {
        var query = {};
        query[field] = {"$lte":value};
        return new lib.enterprise.Filter(query);
    }
    return null;
};

/**
 * Not-equal operator
 *
 * @param {string} field - the field name
 * @param {(string|number)} value - the value to compare the field
 * against. Values can only be simple types such as numbers or
 * string. 
 * @returns {iotcs.enterprise.Filter} a new Filter expressing this operation
 * @memberof iotcs.enterprise.Filter.prototype
 * @function ne
 */
lib.enterprise.Filter.prototype.ne = function (field, value) {
    if (_is(field, ['string']) &&
        _is(value, ['string', 'number'])) {
        var query = {};
        query[field] = {"$ne":value};
        return new lib.enterprise.Filter(query);
    }
    return null;
};

/**
 * Is-in operator.
 * <p>
 * Checks whether the field's value is one of the proposed values.
 * 
 * @param {string} field - the field name
 * @param {(string[]|number[])} valuearray - an array of same typed
 * values to test the field against. Values can only be simple
 * types such as numbers or string. 
 * @returns {iotcs.enterprise.Filter} a new Filter expressing this operation
 * @memberof iotcs.enterprise.Filter.prototype
 * @function in
 */
lib.enterprise.Filter.prototype.in = function (field, valuearray) {
    if (_is(field, ['string']) &&
        Array.isArray(valuearray)) {
        var type = null;
        for (var index in valuearray) {
            var value = valuearray[index];
            if (!type && _is(value, ['string', 'number'])) {
                type = typeof value;
            } else if (typeof value !== type) {
                lib.error('inconsistent value types in $in valuearray');
                return null;
            }
        }
        var query = {};
        query[field] = {"$in":valuearray};
        return new lib.enterprise.Filter(query);
    }
    return null;
};

/**
 * Exists operator.
 * <p>
 * Checks whether the field's value matches the given boolean state.
 *
 * @param {string} field - the field name
 * @param {boolean} state - the boolean to test field against
 * @returns {iotcs.enterprise.Filter} a new Filter expressing this operation
 * @memberof iotcs.enterprise.Filter.prototype
 * @function exists
 */
lib.enterprise.Filter.prototype.exists = function (field, state) {
    if (_is(field, ['string']) &&
        _is(state, ['boolean'])) {
        var query = {};
        query[field] = {"$exists":state};
        return new lib.enterprise.Filter(query);
    }
    return null;
};

/**
 * Like operator.
 * <p>
 * Checks whether the field's value matches the search query. Use 
 * <code>%</code> in the match string as search jocker, e.g. 
 * <code>"jo%"</code>.
 * <p>
 * Note that if the match string does not contain any <code>%</code>, 
 * then this operation is replaced by the 
 * {@link iotcs.enterprise.Filter#eq eq} operation.
 *
 * @param {string} field - the field name
 * @param {string} match - the pattern matching string to test field against
 * @returns {iotcs.enterprise.Filter} a new Filter expressing this operation
 * @memberof iotcs.enterprise.Filter.prototype
 * @function like
 */
lib.enterprise.Filter.prototype.like = function (field, match) {
    if (_is(field, ['string']) &&
        _is(match, ['string'])) {
        var query = {};
        if (match.indexOf('%')<0) {
            lib.log('$eq match field does not contains any "%". Operation replaced into a $eq');
            query[field] = {"$eq":match};
        } else {
            query[field] = {"$like":match};
        }
        return new lib.enterprise.Filter(query);
    }
    return null;
};

/**
 * And operator.
 * <p>
 * Checks if all conditions are true.
 * <p>
 * This function takes either an array of iotcs.enterprise.Filter
 * or an indefinit number of iotcs.enterprise.Filter.
 * 
 * @param {(iotcs.enterprise.Filter[]|...iotcs.enterprise.Filter)} args - an array
 * or variable length argument list of filters to AND
 * @returns {iotcs.enterprise.Filter} a new Filter expressing this operation
 * @memberof iotcs.enterprise.Filter.prototype
 * @function and
 */
lib.enterprise.Filter.prototype.and = function (args) {
    var filters = null;
    if (Array.isArray(args)) {
        if (!_argsAreFilters(args)) {
            lib.error('invalid operation type(s)');
            return;
        }
        filters = args;
    } else {
        if (!_argsAreFilters(arguments)) {
            lib.error('invalid operation type(s)');
            return;
        }
        filters = [];
        for (var i=0; i<arguments.length; i++) {
            filters.push(arguments[i]);
        }
    }
    var query = {"$and":filters};
    return new lib.enterprise.Filter(query);
};

/**
 * Or operator.
 * <p>
 * Checks if at least one of the conditions is true.
 * <p>
 * This function takes either an array of iotcs.enterprise.Filter
 * or an indefinit number of iotcs.enterprise.Filter.
 *
 * @param {(iotcs.enterprise.Filter[]|...iotcs.enterprise.Filter)} args - an array
 * or variable length argument list of filters to OR
 * @returns {iotcs.enterprise.Filter} a new Filter expressing this operation
 * @memberof iotcs.enterprise.Filter.prototype
 * @function or
 */
lib.enterprise.Filter.prototype.or = function (args) {
    var filters = null;
    if (Array.isArray(args)) {
        if (!_argsAreFilters(args)) {
            lib.error('invalid operation type(s)');
            return;
        }
        filters = args;
    } else {
        if (!_argsAreFilters(arguments)) {
            lib.error('invalid operation type(s)');
            return;
        }
        filters = [];
        for (var i=0; i<arguments.length; i++) {
            filters.push(arguments[i]);
        }
    }
    var query = {"$or":filters};
    return new lib.enterprise.Filter(query);
};

/**
 * Not operator
 * <p>
 * Checks if the negative condition is true.
 *
 * @param {iotcs.enterprise.Filter} filter - a filter to negate
 * @memberof iotcs.enterprise.Filter.prototype
 * @function not
 */
lib.enterprise.Filter.prototype.not = function (filter) {
    if (!_argIsFilter(filter)) {
        lib.error('invalid type');
        return;
    }
    var query = {"$not":filter};
    return new lib.enterprise.Filter(query);
};

/** @ignore */
function _argIsFilter(arg) {
    return (arg instanceof lib.enterprise.Filter);
}

/** @ignore */
function _argsAreFilters(args) {
    if (Array.isArray(args)) {
        // args is []
        return args.every(function (arg) {
            return (arg instanceof lib.enterprise.Filter);
        });
    } else {
        // args are varargs
        for (var i = 0; i < args.length; i++) {
            if (! (args[i] instanceof lib.enterprise.Filter)) {
                return false;
            }
        }
        return true;
    }
    return false;
}

/** @ignore */
function _is(parameter, types) {
    var ptype = typeof parameter;
    for(var index in types) {
        if (types[index] === ptype) {
            return true;
        }
    }
    lib.log('type is "'+ptype+'" but should be ['+types.toString()+']');
    lib.error('invalid parameter type for "'+parameter+'"');
    return false;
}


//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/VirtualDevice.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

//@TODO: jsdoc issue: MessageEnumerator appears in iotcs.* and not at index level (probably due to missing class jsdoc on lib.enterprise.MessageEnumerator) @DONE

/**
 * VirtualDevice is a representation of a device model
 * implemented by an endpoint. A device model is a
 * specification of the attributes, formats, and resources
 * available on the endpoint.
 * <p>
 * The VirtualDevice API is specific to the enterprise
 * client. Also it implements the device monitoring and
 * control specific to the enterprise client and the call
 * to an action method. Actions are defined in the device
 * model.
 * <p>
 * A device model can be obtained by it's afferent urn with the
 * EnterpriseClient if it is registered on the cloud.
 * <p>
 * The VirtualDevice has the attributes and actions of the device
 * model as properties and it provides functionality to the device
 * model in the following ways:
 * <p>
 * <b>Get the value of an attribute:</b><br>
 * <code>var value = device.temperature.value;</code><br>
 * <p>
 * <b>Get the last known value of an attribute:</b><br>
 * <code>var lastValue = device.temperature.lastKnownValue;</code><br>
 * <p>
 * <b>Set the value of an attribute (with update on cloud and error callback handling):</b><br>
 * <code>device.maxThreshold.onError = function (errorTuple);</code><br>
 * <code>device.maxThreshold.value = 27;</code><br>
 * where errorTuple is an object of the form
 * <code>{attribute: ... , newValue: ... , tryValue: ... , errorResponse: ...}</code>.
 * The library will throw an error in the value to update is invalid
 * according to the device model.
 * <p>
 * <b>Monitor a specific attribute for any value change (that comes from the cloud):</b><br>
 * <code>device.temperature.onChange = function (changeTuple);</code><br>
 * where changeTuple is an object of the form
 * <code>{attribute: ... , newValue: ... , oldValue: ...}</code>.
 * <p>
 * <b>Monitor all attributes for any value change (that comes from the cloud):</b><br>
 * <code>device.onChange = function (changeTuple);</code><br>
 * where changeTuple is an object with array type properties of the form
 * <code>[{attribute: ... , newValue: ... , oldValue: ...}]</code>.
 * <p>
 * <b>Monitor all update errors:</b><br>
 * <code>device.onError = function (errorTuple);</code><br>
 * where errorTuple is an object with array type properties (besides errorResponse) of the form
 * <code>{attributes: ... , newValues: ... , tryValues: ... , errorResponse: ...}</code>.
 * <p>
 * <b>Monitor a specific alert format for any alerts that where generated:</b><br>
 * <code>device.tooHot.onAlerts = function (alerts);</code><br>
 * where alerts is an array containing all the alerts generated of the specific format. An
 * alert is an object of the form:
 * <code>{eventTime: ... , severity: ... , fields: {field1: value1, field2: value2 ... }}</code>.
 * The onAlerts can be set also by urn:
 * <code>device['temperature:format:tooHot'].onAlerts = function (alerts);</code><br>
 * <p>
 * <b>Monitor all alerts generated for all formats:</b><br>
 * <code>device.onAlerts = function (alerts);</code><br>
 * where alerts is an object containing all the alert formats as keys and each has as value the above described array:
 * <code>{formatUrn1: [ ... ], formatUrn2: [ ... ], ... }</code>.
 * <p>
 * A VirtualDevice can also be created with the appropriate
 * parameters from the EnterpriseClient.
 *
 * @see {@link iotcs.enterprise.EnterpriseClient#getDeviceModel}
 * @see {@link iotcs.enterprise.EnterpriseClient#createVirtualDevice}
 * @param {string} endpointId - The endpoint id of this device
 * @param {object} deviceModel - The device model object
 * holding the full description of that device model that this
 * device implements.
 * @param {iotcs.enterprise.EnterpriseClient} client - The enterprise client
 * associated with the device application context.
 *
 * @class
 * @memberOf iotcs.enterprise
 * @alias VirtualDevice
 * @extends iotcs.AbstractVirtualDevice
 */
lib.enterprise.VirtualDevice = function (endpointId, deviceModel, client) {
    _mandatoryArg(endpointId, 'string');
    _mandatoryArg(deviceModel, 'object');
    _mandatoryArg(client, lib.enterprise.EnterpriseClient);

    lib.AbstractVirtualDevice.call(this, endpointId, deviceModel);

    this.client = client;
    this.controller = new $impl.Controller(this);

    this.attributes = this;

    var attributes = this.model.attributes;
    for (var indexAttr in attributes) {
        var attribute = new $impl.Attribute(attributes[indexAttr]);
        if (attributes[indexAttr].alias) {
            _link(attributes[indexAttr].alias, this, attribute);
        }
        _link(attributes[indexAttr].name, this, attribute);
    }

    this.actions = this;

    var actions = this.model.actions;
    for (var indexAction in actions) {
        var action = new $impl.Action(actions[indexAction]);
        if (actions[indexAction].alias) {
            _link(actions[indexAction].alias, this.actions, action);
        }
        _link(actions[indexAction].name, this.actions, action);
    }


    Object.defineProperty(this, 'onAlerts', {
        enumerable: true,
        configurable: false,
        get: function () {
            return this._.onAlerts;
        },
        set: function (newValue) {
            if (!newValue || (typeof newValue !== 'function')) {
                lib.error('trying to set something to onAlerts that is not a function!');
                return;
            }
            this._.onAlerts = newValue;
        }
    });
    this._.onAlerts = function (arg) {};

    var self = this;

    if (this.model.formats) {

        this.alerts = this;
        this.model.formats.forEach(function (format) {
            if (format.type && (format.type === 'ALERT') && format.urn) {
                var alert = new $impl.Alert(format);
                if (format.name) {
                    _link(format.name, self.alerts, alert);
                }
                _link(format.urn, self.alerts, alert);
            }
        });

    }

    this._.isDeviceApp = 0;

    Object.preventExtensions(this);

    _deviceMonitorInitialization(self);

};

lib.enterprise.VirtualDevice.prototype = Object.create(lib.AbstractVirtualDevice.prototype);
lib.enterprise.VirtualDevice.constructor = lib.enterprise.VirtualDevice;

/**@inheritdoc */
lib.enterprise.VirtualDevice.prototype.update = function (attributes) {
    _mandatoryArg(attributes, 'object');
    if (Object.keys(attributes).length === 0) {
        return;
    }
    for (var attribute in attributes) {
        var value = attributes[attribute];
        if (attribute in this.attributes) {
            this.attributes[attribute]._.localUpdate(value, true); //XXX not clean
        } else {
            lib.error('unknown attribute "'+attribute+'"');
            return;
        }
    }
    if (this.controller) {
        this.controller.updateAttributes(attributes, false);
    }
};

/**@inheritdoc */
lib.enterprise.VirtualDevice.prototype.close = function () {
    if (this.controller) {
        this.controller.close();
    }
    if (this.client) {
        this.client._.removeVirtualDevice(this);
    }
    this.endpointId = null;
    this.onChange = function (arg) {};
    this.onError = function (arg) {};
    this.onAlerts = function (arg) {};
    this.controller = null;
};

/**
 * Execute an action. The library will throw an error if the action is not in the model
 * or if the argument is invalid (or not present when it should be). The actions
 * are as attributes properties of the virtual device.
 * <p>
 * The response from the cloud to the execution of the action can be retrieved by
 * setting a callback function to the onExecute property of the action:<br>
 * <code>device.reset.onExecute = function (response);</code><br>
 * <code>device.call('reset');</code><br>
 * where response is a JSON representation fo the response from the cloud if any.
 *
 * @param {string} actionName - The name of the action to execute
 * @param {Object} [arg] - An optional unique argument to pass
 * for action execution. This is specific to the action and description
 * of it is provided in the device model
 *
 * @memberof iotcs.enterprise.VirtualDevice.prototype
 * @function call
 */
lib.enterprise.VirtualDevice.prototype.call = function (actionName, arg) {
    _mandatoryArg(actionName, 'string');
    if (arguments.length > 2) {
        lib.error('invalid number of arguments');
    }
    var action = this[actionName];
    if (!action) {
        lib.error('action "'+actionName+'" is not executable');
        return;
    }
    this.controller.invokeAction(action.name, arg);
};



//////////////////////////////////////////////////////////////////////////////
// file: library/enterprise/TrustedAssetsManager.js

/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and 
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * The <code>TrustedAssetsManager</code> interface defines methods for handling trust
 * material used for activation and authentication to the IoT CS. Depending on
 * the capability of the client or device as well as on the security
 * requirements implementations of this interface may simply store sensitive
 * trust material in a plain persistent store, in some keystore or in a secure
 * token.
 * @class
 */
/** @ignore */
$impl.TrustedAssetsManager = function () {
    this.serverHost = null;
    this.serverPort = null;

    this.load = function () {
        var taStoreFile = lib.oracle.iot.tam.store;
        var taStorePassword = lib.oracle.iot.tam.storePassword;
        if (!taStorePassword) {
            lib.error('no TA store password defined');
            return;
        }
        var input = $port.file.load(taStoreFile);
        var entries = JSON.parse(input);
        
        if (!_verifyTaStoreContent(entries, taStorePassword)) {
            lib.error('TA store not signed or tampered with');
            return;
        }
        
        this.serverHost = entries.serverHost;
        this.serverPort = entries.serverPort;
    };
    this.load();
};

/**
 * Retrieves the IoT CS server host name.
 *
 * @returns {String} the IoT CS server host name
 * or <code>null</code> if any error occurs retrieving the server host
 * name.
 *
 * @memberof iotcs.$impl.TrustedAssetsManager.prototype
 * @function getServerHost
 */
$impl.TrustedAssetsManager.prototype.getServerHost = function () {
    return this.serverHost;
};

/**
 * Retrieves the IoT CS server port.
 *
 * @returns {Number} the IoT CS server port (a positive integer)
 * or <code>null</code> if any error occurs retrieving the server port.
 * 
 * @memberof iotcs.$impl.TrustedAssetsManager.prototype
 * @function getServerPort
 */
$impl.TrustedAssetsManager.prototype.getServerPort = function () {
    return this.serverPort;
};

/**
 * Returns whether the client is activated.
 * @returns {boolean} whether the device is activated.
 *
 * @memberof iotcs.$impl.TrustedAssetsManager.prototype
 * @function isActivated
 */
$impl.TrustedAssetsManager.prototype.isActivated = function () {
    return true;
};

/**
 * Provisions the designated Trusted Assets Store with the provided provisioning assets.
 * 
 * @param {string} taStoreFile the Trusted Assets Store file name.
 * @param {string} taStorePassword the Trusted Assets Store password.
 * @param {string} serverHost the IoT CS server host name.
 * @param {number} serverPort the IoT CS server port.
 */
$impl.TrustedAssetsManager.provision = function (taStoreFile, taStorePassword, serverHost, serverPort) {
    _mandatoryArg(taStoreFile, 'string');
    _mandatoryArg(taStorePassword, 'string');
    _mandatoryArg(serverHost, 'string');
    _mandatoryArg(serverPort, 'number');
    var entries = {
        'serverHost' : serverHost,
        'serverPort' : serverPort,
    };
    entries = _signTaStoreContent(entries, taStorePassword);
    var output = JSON.stringify(entries);
    lib.$port.file.store(taStoreFile, output);
};

//////////////////////////////////////////////////////////////////////////////

/** @ignore */
function _signTaStoreContent (taStoreEntries, password) {
    var data = '{' + taStoreEntries.serverHost + '}'
        + '{' + taStoreEntries.serverPort + '}';
    var key = _pbkdf(password);
    var hmac = forge.hmac.create();
    hmac.start('sha256', key);
    hmac.update(data);
    taStoreEntries.signature = hmac.digest().toHex();
    return taStoreEntries;
}

/** @ignore */
function _verifyTaStoreContent (taStoreEntries, password) {
    var data = '{' + taStoreEntries.serverHost + '}'
        + '{' + taStoreEntries.serverPort + '}';
    var key = _pbkdf(password);
    var hmac = forge.hmac.create();
    hmac.start('sha256', key);
    hmac.update(data);
    return taStoreEntries.signature && hmac.digest().toHex() === taStoreEntries.signature;
}

/** @ignore */
//PBKDF2 (RFC 2898) 
function _pbkdf (password) {
    return forge.pkcs5.pbkdf2(password, '', 1000, 16);
}



//END/////////////////////////////////////////////////////////////////////////
    lib.log(lib.description+' v'+ lib.version+' loaded!');
    return lib;
}
//////////////////////////////////////////////////////////////////////////////
// module initialization
if ((typeof module === 'object') && (module.exports)) {
    //((typeof exports !== 'undefined') && (this.exports !== exports))
    // node.js
    module.exports = function iotcs (lib) {
        return init(lib);
    };
    module.exports(module.exports);
}
})();
