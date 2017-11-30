IOT_SCRIPTS_HOME=`echo $PWD`

# Param validation and usage instructions
if [[ $# -lt 3 ]] ; then
    echo 'usage: ./createSimulator.sh <demo_zone> <Hotel_name> <room_number> [<SINGLE|DOUBLE>]'
    exit 1
fi

if ! [ "${2%%*[^A-Za-z0-9-.]*}" ] ; then
   echo "error: Hotel name can only include aZ 0-9 . and - but no other kind of character" >&2; exit 1
   exit 1
fi

re2='^[0-9]+$'
if ! [[ $3 =~ $re2 ]] ; then
   echo "error: Room number is not a number" >&2; exit 1
   exit 1
fi
if [ $3 -gt 999 ] || [ $3 -lt 0 ] 
then
  echo "Room number must be a possitive integer between 0 and 999."
  exit 1
fi

if [[ -z "$4" ]] ; then
   ROOM_TYPE="SINGLE"
else
   if [ "$4" != "SINGLE" ] && [ "$4" != "DOUBLE" ]
   then
     echo "Room type is not SINGLE or DOUBLE, assuming SINGLE."
     ROOM_TYPE="SINGLE"
   else
     ROOM_TYPE=$4
   fi
fi
echo "Room Type: $ROOM_TYPE"

# Selecction of ports to be used by each of the Simulators to be created
SIM_PORT_PREFIX=9000
SIM_PORT=$((${SIM_PORT_PREFIX} + $3))
DEMO_ZONE=$1
HOTEL_NAME=$2
ROOM_NUMBER=$3

# Setupand Startup script templates & files
SETUP_TEMPLATE=templates/setup.json.template
SETUP_FILE=setup.json
START_TEMPLATE=templates/startSimulator.sh.template
START_FILE=startSimulator.sh

# Setting IOT Server enviromental variables.
. ./setEnv.sh

# If simulator already exists, does not recreate it, just start it again
START_ONLY="false"
if [[ -d "../${DEMO_ZONE}_${HOTEL_NAME}_atPort_${SIM_PORT}" ]] ; then
   echo "Only start sim because a simulator with the same values already exists."
   START_ONLY="true"
fi

if [[ "${START_ONLY}" != "true" ]] ; then
   echo "Begin the creation of the simulator at ${DEMO_ZONE}_${HOTEL_NAME}_atPort_${SIM_PORT} folder."
   #Copy base simulator to a new simulator home
   cp -Rf ../src/iotcs-simulator-internal-demos-17.2.3.0.0-9 ../${DEMO_ZONE}_${HOTEL_NAME}_atPort_${SIM_PORT}
   
   # Preparation of setup.json file using the setup.json.template file
   cat ../$SETUP_TEMPLATE 2>/dev/null \
       | sed -e "s?sh_IoTSimForHotel_?${DEMO_ZONE}_${HOTEL_NAME}?" \
       | sed -e "s?##APP_USER##?${DEMO_ZONE} ${HOTEL_NAME}?" \
       | sed -e "s?##IOT_USER##?${IOT_USER}?" \
       | sed -e "s?##IOT_PASS##?${IOT_PASS}?" \
       | sed -e "s?##IOT_SERVER##?${IOT_SERVER}?" \
       | sed -e "s?##IOT_PORT##?${IOT_PORT}?" > ../${DEMO_ZONE}_${HOTEL_NAME}_atPort_${SIM_PORT}/$SETUP_FILE

   # Preparation of the start script using the startSimulator.sh.template file
   cat ../$START_TEMPLATE 2>/dev/null \
       | sed -e "s?##SIM_PORT##?${SIM_PORT}?" > ../${DEMO_ZONE}_${HOTEL_NAME}_atPort_${SIM_PORT}/$START_FILE
   chmod 755 ../${DEMO_ZONE}_${HOTEL_NAME}_atPort_${SIM_PORT}/$START_FILE

   # Customization of wedo_-_noise_sensor_simulator.json device model for this DemoZone-Hotel
   cat ../templates/wedo_-_noise_sensor_simulator.json 2>/dev/null \
       | sed -e "s?###DEMO_ZONE###?${DEMO_ZONE}?" \
       | sed -e "s?###HOTEL_NAME###?${HOTEL_NAME}?" \
       | sed -e "s?###ROOM_NUMBER###?${ROOM_NUMBER}?" \
       | sed -e "s?###NOISE_SENSOR_NUMBER###?1?" > ../${DEMO_ZONE}_${HOTEL_NAME}_atPort_${SIM_PORT}/devices/wedo_-_noise_sensor/wedo_-_noise_sensor_simulator.json

   # Customization of wedo_-_shower_unit_simulator.json device model for this DemoZone-Hotel
   cat ../templates/wedo_-_shower_unit_simulator.json 2>/dev/null \
       | sed -e "s?###DEMO_ZONE###?${DEMO_ZONE}?" \
       | sed -e "s?###HOTEL_NAME###?${HOTEL_NAME}?" \
       | sed -e "s?###ROOM_NUMBER###?${ROOM_NUMBER}?" > ../${DEMO_ZONE}_${HOTEL_NAME}_atPort_${SIM_PORT}/devices/wedo_-_shower_unit/wedo_-_shower_unit_simulator.json
fi

# Start Simulator 
cd ../${DEMO_ZONE}_${HOTEL_NAME}_atPort_${SIM_PORT}
nohup ./startSimulator.sh > ../logs/${DEMO_ZONE}_${HOTEL_NAME}_atPort_${SIM_PORT}.out 2>&1 &
cd - >/dev/null 2>&1

echo "*** IoT Simulator started at port $i. Check logs at `pwd`/logs/${DEMO_ZONE}_${HOTEL_NAME}_atPort_${SIM_PORT}.out"

if [[ "${START_ONLY}" != "true" ]] ; then
   echo "Wait for IoT Simulator to be available"
   until $(curl --output /dev/null --silent --head --fail http://${SIM_SERVER}:${SIM_PORT}); do
      printf '.'
      sleep 1
   done
   sleep 2

   # Create simulated devices (1 little room)
   MANUFACT="WH-${SIM_PORT}"
   DEV_NAME="WH ${HOTEL_NAME} ${ROOM_NUMBER}/S (${DEMO_ZONE})"
   DEV_DESC="WH ${HOTEL_NAME} room ${ROOM_NUMBER} - Shower unit (${DEMO_ZONE})"
   #SER_NUMB=`cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 36 | head -n 1`
   SER_NUMB=`openssl rand -hex 18`

   curl -d '{"simulatorId":"wedo_-_shower_unit", "autoRegister":true, "name": "'"${DEV_NAME}"'", "metadata":{"description": "'"${DEV_DESC}"'", "manufacturer":"'"${MANUFACT}"'", "serialNumber":"'"${SER_NUMB}"'", "modelNumber":"Shower unit"}, "location":{"latitude":"37.3982187", "longitude":"-121.979117", "altitude":"100"}}' -X POST -H 'Content-Type: application/json' http://${SIM_SERVER}:${SIM_PORT}/sim/devices

   DEV_NAME="WH ${HOTEL_NAME} ${ROOM_NUMBER}/N1 (${DEMO_ZONE})"
   DEV_DESC="WH ${HOTEL_NAME} room ${ROOM_NUMBER} - Noise 1 (${DEMO_ZONE})"
   #SER_NUMB=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 36 | head -n 1)
   SER_NUMB=`openssl rand -hex 18`

   curl -d '{"simulatorId":"wedo_-_noise_sensor", "autoRegister":true, "name": "'"${DEV_NAME}"'", "metadata":{"description": "'"${DEV_DESC}"'", "manufacturer":"'"${MANUFACT}"'", "serialNumber":"'"${SER_NUMB}"'", "modelNumber":"Noise sensor"}, "location":{"latitude":"37.3982187", "longitude":"-121.979117", "altitude":"100"}}' -X POST -H 'Content-Type: application/json' http://${SIM_SERVER}:${SIM_PORT}/sim/devices

   if [[ "${ROOM_TYPE}" == "DOUBLE" ]] ; then
      DEV_NAME="WH ${HOTEL_NAME} ${ROOM_NUMBER}/N2 (${DEMO_ZONE})"
      DEV_DESC="WH ${HOTEL_NAME} room ${ROOM_NUMBER} - Noise 2 (${DEMO_ZONE})"
      SER_NUMB=`openssl rand -hex 18`
     
      curl -d '{"simulatorId":"wedo_-_noise_sensor", "autoRegister":true, "name": "'"${DEV_NAME}"'", "metadata":{"description": "'"${DEV_DESC}"'", "manufacturer":"'"${MANUFACT}"'", "serialNumber":"'"${SER_NUMB}"'", "modelNumber":"Noise sensor"}, "location":{"latitude":"37.3982187", "longitude":"-121.979117", "altitude":"100"}}' -X POST -H 'Content-Type: application/json' http://${SIM_SERVER}:${SIM_PORT}/sim/devices
   fi

   # Delete Application automatically created when a simulator is created and attached to the IoT Instance.
   ${IOT_SCRIPTS_HOME}/deleteApp.sh ${DEMO_ZONE} ${HOTEL_NAME}

fi
