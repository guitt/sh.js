#! /usr/bin/env node

var sh = require('../sh.js');

sh('ls / nxfile',
  sh.file('/dev/null'),
  sh.err('sed s/nx/NX/')
)
