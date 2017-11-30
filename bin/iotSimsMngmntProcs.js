var http = require('http');
var cron = require('cron');
var PORT = 9009;

var simulators = [];
//var selectedSim;
var output = '';

// Cron job created to shutdown simulators once they have been running for 60 minutes
var job = new cron.CronJob('* * * * *', function() {
    console.log('Function executed!');
    var vTime = new Date();
    var hours = vTime.getHours();
    var minutes = vTime.getMinutes();
    var seconds = vTime.getSeconds();
    currentTime=(60*hours)+(1*minutes);
    //console.log("currentTime: " + currentTime);

    console.log("Number of simulators in the list: " + simulators.length);
    simulators.forEach(function(simulator) {
       if ( simulator.startedAt.length > 0 ) {
          var parts = simulator.startedAt.split(':');
          if (parts[1] != null) {
             initTime=(60*parts[0])+(1*parts[1])
          } else {
             //time does not include hh:mm so assuming started more than a day before
             initTime=0
          }
          minutesStarted=currentTime-initTime;
          //Simulators started more tha 60 minutes ago must be deleted.
          if ( minutesStarted > 60 ) {
             console.log("Deleting simulator running on port " + simulator.listenPort + " because has been already running: " + minutesStarted);
             //stopSimulator(simulator.listenPort);
             deleteSimulator(simulator.listenPort);
          }
       }
    });
//var iSecondsToAdd = ( iSeconds + (iMinutes * 60) + (iHours * 3600) + (iDays * 86400) );
updateSimulatorList();
}, null, true);


function writeOutput(stdout) {
  console.log("Writting output to global var");
  output = stdout;
}


function addSimulator(demoZone, hotelName, listenPort, procStatus, procId, startedAt, folderName) {
  console.log("addSim(" + demoZone + "," + hotelName + ")");
  simulators.push({demoZone: demoZone, hotelName: hotelName, listenPort: listenPort, procStatus: procStatus, procId: procId, startedAt: startedAt, folderName: folderName});
}


function updateSimulatorList() {
  console.log("updating simulator list.");
  simulators = [];
  //var result = '';
  var child;
  var util = require('util');
  var exec = require('child_process').exec;

  child = exec("./statusSimulators.sh", function (error, stdout, stderr) {
    console.log("starting execution of ./statusSimulators.sh");
    if(error) {
        console.log("error trying to execute the Unix command.");
    } else {            
        console.log("no errors during the execution of the Unix command.");
        processResult(stdout);
    }
  });

  var processResult = function(stdout) {
    var lines = stdout.toString().split('\n');
    console.log("starting preload");
    lines.forEach(function(line) {
        var parts = line.split(';');
        if ( parts[0] != '') {
           addSimulator(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], parts[6]) ;
        }
    });

    console.log("preload done");
  };
}


function getSimStatus(simulatorPort) {
  updateSimulatorList();
  console.log("Getting element from array.");
  var objIndex = simulators.findIndex((obj => obj.listenPort == simulatorPort));
  console.log("selected Sim: " + objIndex);
  return objIndex;
}


function startSimulator(simulatorPort) {
  console.log("Starting simulator running at port" + simulatorPort);
  var child;
  var util = require('util');
  var exec = require('child_process').execSync;
  output = exec("./startSimulator.sh " + simulatorPort).toString();
  updateSimulatorList();
}


function startSimulators() {
  console.log("Starting all existing simulators.");
  var child;
  var util = require('util');
  var exec = require('child_process').execSync;
  output = exec("./startSimulators.sh").toString();
  updateSimulatorList();
}


function stopSimulator(simulatorPort) {
  console.log("Stopping simulator running at port" + simulatorPort);
  var child;
  var util = require('util');
  var exec = require('child_process').execSync;
  output = exec("./stopSimulator.sh " + simulatorPort).toString();
  updateSimulatorList();
}


function stopSimulators() {
  console.log("Stopping all existing simulators.");
  var child;
  var util = require('util');
  var exec = require('child_process').execSync;
  output = exec("./stopSimulators.sh").toString();
  updateSimulatorList();
}


function deleteSimulator(simulatorPort) {
  console.log("Deleting simulator running at port" + simulatorPort);
  var child;
  var util = require('util');
  var exec = require('child_process').execSync;
  output = exec("./deleteSimulator.sh " + simulatorPort).toString();
  updateSimulatorList();
}


function createSimulator(demoZone, hotelName, roomNumber, roomType) {
  console.log("Creating simulator for demozone: " + demoZone + ", for Hotel Name: " + hotelName + ", Room: " + roomNumber + ", roomType: " + roomType);
  var child;
  var util = require('util');
  //var exec = require('child_process').execSync;
  //output = exec("./createSimulator.sh " + demoZone + " " + hotelName + " " + simulatorPort).toString();
  //var lines = stdout.toString().split('\n');
  //lines.forEach(function(line) {
  //    console.log(line.toString());
  //});

  var exec = require('child_process').exec;
  child = exec("./createSimulator.sh " + demoZone + " " + hotelName + " " + roomNumber + " " + roomType, function (error, stdout, stderr) {
    console.log("Creating exec");
    if(error) {
        console.log("error trying to execute the Unix command.");
    } else {            
        console.log("no errors during the execution of the Unix command.");
        processResult(stdout);
    }
  });

  var processResult = function(stdout) {
    var lines = stdout.toString().split('\n');
    console.log("Starting the creation of Simulator");
    lines.forEach(function(line) {
       console.log(line.toString());
    });

    console.log("### Simulator created.");
    updateSimulatorList();
  };
}


function handleRequest(request, response, requestBody) {
  console.log(request.method + ":" + request.url + ' >>' + requestBody);
  var req_url_arr = request.url.split("/");
  if ((req_url_arr[1] == 'iotsims') && (req_url_arr[2] == 'admin') && (req_url_arr[3] == 'status')) {
    if ((req_url_arr.length > 4) && (req_url_arr[4] != '')) {
      console.log("req_url_arr[4]: " + req_url_arr[4]);
      var simulatorPort = req_url_arr[4];
      var simulatorIndex = getSimStatus(simulatorPort);
      if (request.method == 'GET') {
        if ( simulatorIndex > -1 ) {
          response.end(JSON.stringify(simulators[simulatorIndex]));
        } else {
          response.end("There is no simulator listenning on that port");
        }
      } else {
        console.log("Only GET method valid.")
      }
    } else  {
      if (request.method == 'GET') {
        console.log("sending the list to the caller.");
        response.end(JSON.stringify(simulators));
      } else {
        console.log("Only GET method valid.")
      }
      updateSimulatorList();
    }
  } else if ((req_url_arr[1] == 'iotsims') && (req_url_arr[2] == 'admin') && (req_url_arr[3] == 'start')) {
    if ((req_url_arr.length > 4) && (req_url_arr[4] != '')) {
      console.log("req_url_arr[4]: " + req_url_arr[4]);
      var simulatorPort = req_url_arr[4];
      startSimulator(simulatorPort);
      if (request.method == 'GET') {
          //response.end(JSON.stringify(simulators[simulatorIndex]));
          response.end(output);
      } else {
          console.log("Only GET method valid.")
      }
    } else {
      //StartAll simulators
      startSimulators();
      if (request.method == 'GET') {
          //response.end(JSON.stringify(simulators[simulatorIndex]));
          response.end(output);
      } else {
          console.log("Only GET method valid.")
      }
    }
  } else if ((req_url_arr[1] == 'iotsims') && (req_url_arr[2] == 'admin') && (req_url_arr[3] == 'stop')) {
    if ((req_url_arr.length > 4) && (req_url_arr[4] != '')) {
      console.log("req_url_arr[4]: " + req_url_arr[4]);
      var simulatorPort = req_url_arr[4];
      stopSimulator(simulatorPort);
      if (request.method == 'GET') {
          //response.end(JSON.stringify(simulators[simulatorIndex]));
          response.end(output);
      } else {
          console.log("Only GET method valid.")
      }
    } else {
      //StopAll simulators
      stopSimulators();
      if (request.method == 'GET') {
          //response.end(JSON.stringify(simulators[simulatorIndex]));
          response.end(output);
      } else {
          console.log("Only GET method valid.")
      }
    }
  } else if ((req_url_arr[1] == 'iotsims') && (req_url_arr[2] == 'admin') && (req_url_arr[3] == 'delete')) {
    if ((req_url_arr.length > 4) && (req_url_arr[4] != '')) {
      console.log("req_url_arr[4]: " + req_url_arr[4]);
      var simulatorPort = req_url_arr[4];
      deleteSimulator(simulatorPort);
      if (request.method == 'GET') {
          //response.end(JSON.stringify(simulators[simulatorIndex]));
          response.end(output);
      } else {
          console.log("Only GET method valid.")
      }
    } else {
      response.end("Need to specify simulator listen port.");
    }
  } else if ((req_url_arr[1] == 'iotsims') && (req_url_arr[2] == 'admin') && (req_url_arr[3] == 'create')) {
    var simDemo='';
    var simHotel='';
    var simRoomNum='';
    var simRoomType='';
    if ((req_url_arr.length > 4) && (req_url_arr[4] != '')) 
      simDemo = req_url_arr[4];
    if ((req_url_arr.length > 5) && (req_url_arr[5] != '')) 
      simHotel = req_url_arr[5];
    if ((req_url_arr.length > 6) && (req_url_arr[6] != '')) 
      simRoomNum = req_url_arr[6];
    if ((req_url_arr.length > 7) && (req_url_arr[7] != '')) 
      simRoomType = req_url_arr[7];
    if ((simDemo == '') || (simHotel == '') || (simRoomNum == '') || (simRoomType == '')) {
      response.end("Need to specify demo zone, hotel name, roomm number(number between 1 and 999), and room type(SINGLE|DOUBLE).");
    } else {
      createSimulator(simDemo, simHotel, simRoomNum, simRoomType);
      if (request.method == 'GET') {
          //response.end(JSON.stringify(simulators[simulatorIndex]));
          //response.end(output);
          response.end("Creation of the simulator has been submited.");
      } else {
          console.log("Only GET method valid.");
      }
    }
  } else {
      console.log("No valid method/URL");
      response.end("No valid method/URL");
  }
}


var server = http.createServer(function (request, response) {
  //response.end("HELLO WORLD");
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  response.setHeader('Access-Control-Allow-Credentials', true);

  console.log('simulators=' + JSON.stringify(simulators));
      
  var requestBody = '';
  request.on('data', function (data) {
    requestBody += data;
  });
  request.on('end', function () {
    handleRequest (request, response, requestBody);
  });

});

server.listen(PORT, function () {
  console.log('Server running...');
  updateSimulatorList();
});

