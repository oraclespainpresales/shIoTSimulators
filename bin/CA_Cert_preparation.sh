# IoT Server information to which simulators will be connected
IOT_SERVER=129.150.71.46
IOT_PORT=443
IOT_USER=adminuser
IOT_PASS="IoTRocks1#"
IOTSIM_HOME=/u01/node/shIoTSimulators/src/iotcs-simulator-internal-demos-17.2.3.0.0-9

#export PATH=$PWD/nodejs/bin:${PATH}

#export http_proxy=http://www-proxy.us.oracle.com:80
#export https_proxy=http://www-proxy.us.oracle.com:80
#export no_proxy=129.150.71.46
openssl s_client -showcerts -connect ${IOT_SERVER}:${IOT_PORT} -no_ign_eof | (openssl x509 -out iotserver.pem; openssl x509 -out ${IOTSIM_HOME}/server/config/iotca.pem)
#export npm_config_strict_ssl=false
#npm set strict-ssl false
#npm install npm -g --ca="/u01/node/shIoTSimulators/src/iotcs-simulator-internal-demos-17.2.3.0.0-9/server/config/iotca.pem"
#npm set ca "/u01/node/shIoTSimulators/src/iotcs-simulator-internal-demos-17.2.3.0.0-9/server/config/iotca.pem"

