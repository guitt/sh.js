#! /usr/bin/env node

var sh = require('../sh.js').sh;

sh('ls / nxfile')
  .file('/dev/null')
  .err('sed s/nx/NX/');
