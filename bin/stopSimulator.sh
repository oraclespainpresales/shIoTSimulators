# Param validation and usage instructions
if [[ $# -ne 1 ]] ; then
    echo 'usage: ./stopSimulator.sh <listen_port>'
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

