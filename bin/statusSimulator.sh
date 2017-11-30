# Param validation and usage instructions
if [[ $# -ne 1 ]] ; then
    echo 'usage: ./statusSimulator.sh <listen_port>'
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

sim_started=`ps -ef | grep IoTSimPort | grep $1 | grep -v grep | wc -l`

SIM_NAME=`echo ../*_atPort_$1`
if [ -d "${SIM_NAME}" ]
then
  folder_name=`echo ${SIM_NAME}`
  echo "primero: ${folder_name}"
  sim_dir=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' `
  demo_zone=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[1]}' `
  hotel_name=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[2]}' `
  sim_port=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[4]}' `
  echo "SimDir: ${sim_dir}"
  echo "DemoZone: ${demo_zone}"
  echo "Hotel: ${hotel_name}"
  echo "SimPort: ${sim_port}"
  echo "SimStarted: ${sim_started}"
else
  if [ ${sim_started} -eq 1 ]
  then
    sim_pid=`ps -ef | grep IoTSimPort | grep $1 | grep -v grep | awk '{split($0,a," "); print a[2]}'`
    echo '#### Simulator started at port '$1' is already running while its has been erased from the file system. Process with PID '$sim_pid' must be killed.'
  else
    echo 'Does not exist the folder nor the process. Just a check.'
  fi
fi

