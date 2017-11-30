. ./setEnv.sh

#Existing simulators in file system 
i=0
sims_created=`ls -d ../*_atPort_* 2>/dev/null`
for SIM_NAME in $sims_created
do
  sim_dir=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' `
  demo_zone=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[1]}' `
  hotel_name=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[2]}' `
  sim_port=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[4]}' `
  sim_status="`ps -ef | grep IoTSimPort | grep ${sim_port} | grep -v grep | wc -l`"
  if [ ${sim_status} -eq 1 ]
  then
    sim_pid=`ps -ef | grep IoTSimPort | grep ${sim_port} | grep -v grep | awk '{split($0,a," "); print a[2]}'`
    sim_startedAt=`ps -ef | grep IoTSimPort | grep ${sim_port} | grep -v grep | awk '{split($0,a," "); print a[5]}'`
  else
    sim_pid=""
    sim_startedAt=""
  fi

  echo "${demo_zone};${hotel_name};${sim_port};${sim_status};${sim_pid};${sim_startedAt};${sim_dir}"

  # Array to hold existing simulators
  simsArray[i]=${sim_port}
  i=$(expr $i+1)

done
#echo "Number of elements in the array: ${#simsArray[@]}"
#echo "${simsArray[@]}"

#Check if there is any simulator started for which there is no related folder 
sims_started=`ps -ef | grep IoTSimPort | grep -v grep | awk '{split($0,a," "); print a[10]}'`
for SIM_PORT_VAR in ${sims_started}
do
  if [[ ! " ${simsArray[@]} " =~ " ${sim_port} " ]]; then
    demo_zone="N/A"
    hotel_name="N/A"
    sim_port=`echo ${SIM_PORT_VAR} | awk '{split($0,a,"="); print a[2]}'`
    sim_status=1
    sim_pid=`ps -ef | grep IoTSimPort | grep ${sim_port} | grep -v grep | awk '{split($0,a," "); print a[2]}'`
    sim_startedAt=`ps -ef | grep IoTSimPort | grep ${sim_port} | grep -v grep | awk '{split($0,a," "); print a[5]}'`
    sim_dir="not found"
    #echo '#### Simulator started at '$sim_port' port has been erased. Process with PID: '$sim_pid' must be killed.'
    echo "${demo_zone};${hotel_name};${sim_port};${sim_status};${sim_pid};${sim_startedAt};${sim_dir}"
  fi
done

