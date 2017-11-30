. ./setEnv.sh
#simulators=`ps -ef | grep IoTSimPort | grep -v grep `
#echo "${simulators}"


#for i in `ps -ef | grep -i IoTSimPort | grep -v grep | awk 'BEGIN{FS=" "} {print substr($10, 12)}'`
for i in `ls .. | grep _atPort_`
do
   pid=""
   startedAt=""
   demozone=`echo $i | awk 'BEGIN{FS="_"} {print $1}'`
   hotelname=`echo $i | awk 'BEGIN{FS="_"} {print $2}'`
   port=`echo $i | awk 'BEGIN{FS="_"} {print $4}'`
   #echo "demo zone: $demozone"
   #echo "hotel name: $hotelname"
   #echo "port: $port"
   pid=`ps -ef | grep "IoTSimPort=$port" | grep -v grep | awk 'BEGIN{FS=" "} {print $2}'`
   #echo "PID: $pid"
   startedAt=`ps -ef | grep "IoTSimPort=$port" | grep -v grep | awk 'BEGIN{FS=" "} {print $5}'`
   #echo "startedAt: $startedAt"
   if [ "${pid}" != "" ]; then 
     echo "${demozone};${hotelname};${port};ON;${pid};${startedAt}"
   else
     echo "${demozone};${hotelname};${port};OFF;N/A;N/A"
   fi
done
