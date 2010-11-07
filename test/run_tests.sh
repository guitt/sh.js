#! /usr/bin/env bash

x=0

for t in `ls *.test.*`
do
if ./$t
  then continue
  else
    echo -e "\033[1;31mfailed: \033[0;31m$t\033[0;00m"
    x=1
fi
done

exit $x
