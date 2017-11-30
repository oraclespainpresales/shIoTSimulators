. ./setEnv.sh
for i in `ps -ef | grep IoTSimPort | grep -v grep | awk '{print $2}'`
do
   IoTPort=`ps -ef | grep $i | grep -v grep | awk '{split($10, a,"="); print a[2]}'`
   echo "*** Shutting down simulator on port: $IoTPort (PID $i)"
   kill $i
done

