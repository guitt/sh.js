#! /usr/bin/env sh

output="`./basics-03.js`"
count=`echo $output | wc -l`

if test $count -eq 1
then
  if echo $output | grep NXfile
  then exit 0
  else
    echo "sed did not process standard error,"
    echo "or ls did not output 'nxfile' on stderr"
    exit 1
  fi
else
  echo ".file('/dev/null') does not work"
  exit 1
fi
