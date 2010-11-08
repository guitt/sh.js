#! /usr/bin/env bash

echo -e '\n\nwe expect a javascript error below'
if ./basics-12.js
then
  echo 'the tests may need updating'
  exit 1
else
  exit 0
fi
