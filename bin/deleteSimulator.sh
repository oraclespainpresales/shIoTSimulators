# Param validation and usage instructions
if [[ $# -ne 1 ]] ; then
    echo 'usage: ./deleteSimulator.sh <listen_port>'
    exit 1
fi

re='^[0-9]+$'
if ! [[ $1 =~ $re ]] ; then
   echo "error: Listen Port for simulator is not a number" >&2; exit 1
fi
re=${#1}
if [ $re -lt 4 ] || [ $re -gt 5 ]
then
   echo "error: Listen port must be a valid numeric value" >&2; exit 1
fi

. ./setEnv.sh

#Check status and stop if simulator is up
sim_started=`ps -ef | grep IoTSimPort | grep $1 | grep -v grep | wc -l`
if [ ${sim_started} -eq 1 ]
then
  sim_pid=`ps -ef | grep IoTSimPort | grep $1 | grep -v grep | awk '{split($0,a," "); print a[2]}'`
  echo '#### Stopping simulator process (PID: '${sim_pid}') running at port '$1'.'
  kill -9 ${sim_pid}
else
  echo '#### Simulator configured at port '$1' is not running.'
fi

for SIM_NAME in `ls ../*_atPort_$1 -d`
do
#SIM_NAME=`echo ../*_atPort_$1`
#if [ -d "${SIM_NAME}" ]
#then
  sim_dir=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' `
  demo_zone=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[1]}' `
  hotel_name=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[2]}' `
  sim_port=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[4]}' `
  echo "SimDir: ${sim_dir}"
  echo "DemoZone: ${demo_zone}"
  echo "Hotel: ${hotel_name}"
  echo "SimPort: ${sim_port}"

  # Decommisioning devices associated with simulator to be removed.
  echo "Decommisioning devices associated with simulator running at port '$1'."
  devices=`ls ../${sim_dir}/device-data/*/*.json`
  for device in $devices
  do
     device_id=`echo ${device} | awk '{split($0,a,"/"); print a[5]}' | awk '{split($0,b,"."); print b[1]}'`
     echo "Decommisioning device ID: $device_id"
     curl -X DELETE -u ${IOT_USER}:${IOT_PASS} -H 'Accept: application/json' https://${IOT_SERVER}:${IOT_PORT}/iot/api/v2/devices/${device_id} --insecure
  done

  # Removing Simulator folder
  echo "Removing Simulator folder"
  rm -rf ../${sim_dir}  

#fi
done

