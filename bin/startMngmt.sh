MNGMT_PID=`ps -ef | grep iotSimsMngmntProcs.js | grep -v grep | awk '{split($0, a," "); print a[2]}'`
if [ -z "${MNGMT_PID}" ]
then
  echo "Starting the IoT Management process."
  . ./setEnv.sh
  nohup node iotSimsMngmntProcs.js >../logs/iotSimsMngmntProcs.log 2>&1 &
else
  echo "IoT Management process already running (PID: ${MNGMT_PID})."
fi



