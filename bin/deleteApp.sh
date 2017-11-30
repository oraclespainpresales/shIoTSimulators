# Param validation and usage instructions
if [[ $# -ne 2 ]] ; then
    echo 'usage: ./deleteApp.sh <demo_zone> <Hotel_name>'
    exit 1
fi

if [[ -z "$2" ]] ; then
   echo "error: Hotel name not provided" >&2; exit 1
fi
if [[ -z "$1" ]] ; then
   echo "error: Demozone not provided" >&2; exit 1
fi
app2remove="$1_$2"
echo "App to remove:$app2remove"
echo "========================="

if [[ -z "${IOT_SERVER}" ]] ; then 
  . ./setEnv.sh
fi
export PYTHONIOENCODING=utf8

# Retrieve 
curl -X GET -u ${IOT_USER}:${IOT_PASS} https://${IOT_SERVER}:${IOT_PORT}/iot/api/v2/apps --insecure > tmp.json

# Loop over the existing apps
#num_apps=`cat tmp.json | python2 -c 'import json,sys;obj=json.load(sys.stdin);print obj["count"]';`
num_apps=`cat tmp.json | python -c 'import json,sys;obj=json.load(sys.stdin);print(obj["count"])';`
for (( i=0; i<${num_apps}; i++ ))
do
  app_name=`cat tmp.json | python -c 'import json,sys;obj=json.load(sys.stdin);print(obj["items"]['$i']["name"])';`
  app_id=`cat tmp.json | python -c 'import json,sys;obj=json.load(sys.stdin);print(obj["items"]['$i']["id"])';`
  if [ "$app2remove" == "$app_name" ]
  then
    echo "**** REMOVING APPLICATION: $app_name with id: $app_id"
    curl -X DELETE -k -H 'Accept: application/json' -u ${IOT_USER}:${IOT_PASS} https://${IOT_SERVER}:${IOT_PORT}/iot/api/v2/apps/${app_id} --insecure 

  fi

done

