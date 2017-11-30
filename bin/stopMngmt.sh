MNGMT_PID=`ps -ef | grep iotSimsMngmntProcs.js | grep -v grep | awk '{split($0, a," "); print a[2]}'`
if [ -z "${MNGMT_PID}" ]
then
  echo "IoT Management process is not running."
else
  echo "Found the PID (${MNGMT_PID}) of the IoT Management process. Killing it."
  kill -9 ${MNGMT_PID}
fi

