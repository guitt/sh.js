#! /usr/bin/env sh

if ./basics-12.js 2> /dev/null
then
  echo 'the tests may need updating'
  exit 1
else
  exit 0
fi
