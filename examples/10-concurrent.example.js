#! /usr/bin/env node

var sh = require('../sh.js').sh;

sh('date');
sh('sleep 2');
sh('date');
