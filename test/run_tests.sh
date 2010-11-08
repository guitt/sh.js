#! /usr/bin/env bash

x=0

for t in `ls *.test.*`
do
if ./$t
  then continue
  else
    echo -e "\033[1;31mfailed: \033[0;31m$t\033[0;00m"
    x=$(($x+1))
fi
done

if test $x -eq 0
then
  echo -e "\033[0;32mAll tests passed\033[0;00m"
  exit 0
else
  echo -e "\033[0;31m$x failure(s)\033[0;00m"
  exit 1
fi
