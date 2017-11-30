IOT_SCRIPTS_HOME=`echo $PWD`

# Param validation and usage instructions
if [[ $# -ne 1 ]] ; then
    echo 'usage: ./startSimulator.sh <listen_port>'
    exit 1
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

SIM_NAME=`echo ../*_atPort_$1`
if [ -d "${SIM_NAME}" ]
then
  sim_dir=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' `
  demo_zone=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[1]}' `
  hotel_name=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[2]}' `
  sim_port=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[4]}' `

  echo "#### Starting Simulator '${sim_dir}' configured at port '$1'."
  cd ../${sim_dir}
  nohup ./startSimulator.sh > ../logs/${sim_dir}.out 2>&1 &
  cd - >/dev/null 2>&1

  echo "Wait for IoT Simulator to be available"
  until $(curl --output /dev/null --silent --head --fail http://${SIM_SERVER}:${sim_port}); do
    printf '.'
    sleep 1
  done
  echo "#### IoT Simulator ${sim_dir} started. Check logs at `pwd`/logs/${sim_dir}.out"

  # Delete Application automatically created when a simulator is created and attached to the IoT Instance.
  ${IOT_SCRIPTS_HOME}/deleteApp.sh ${demo_zone} ${hotel_name}

fi


