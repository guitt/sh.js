#! /usr/bin/env bash

if ./basics-12.js &> /dev/null
then
  echo 'the tests may need updating'
  exit 1
else
  exit 0
fi
