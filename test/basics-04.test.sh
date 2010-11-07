#! /usr/bin/env bash

output1=`./basics-04.js`
expect1="hello
world"

output2=`./basics-04.js 1`
expect2="hello
universe"

if test "$output1" == "$expect1"
then
  if test "$output2" == "$expect2"
  then exit 0
  else 
    echo -e "expected:\n$expect2\ngot:\n$output2"
    exit 1
  fi
else
  echo -e "expected:\n$expect1\ngot:\n$output1"
  exit 1
fi
