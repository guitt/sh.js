#! /usr/bin/env sh

x=0

for t in `ls *.test.*`
do
if ./$t
  then continue
  else
    echo "[1;31mfailed: [0;31m$t[0;00m"
    x=$(($x+1))
fi
done

if test $x -eq 0
then
  echo "[0;32mAll tests passed[0;00m"
  exit 0
else
  echo "[0;31m$x failure(s)[0;00m"
  exit 1
fi
