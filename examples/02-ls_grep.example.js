#! /usr/bin/env node

var sh = require('../sh.js').sh;

var f = sh('ls');
f('grep \\.example\\.js$');
