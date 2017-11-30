sims_created=`ls -d ../*_atPort_* 2>/dev/null`
for SIM_NAME in $sims_created
do
  sim_port=`echo ${SIM_NAME} | awk '{split($0,a,"/"); print a[2]}' | awk '{split($0,b,"_"); print b[4]}' `
  ./startSimulator.sh ${sim_port}
done

