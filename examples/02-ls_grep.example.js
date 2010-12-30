#! /usr/bin/env node

var sh = require('../sh.js');

var f = sh('ls');
f('grep \\.example\\.js$');
