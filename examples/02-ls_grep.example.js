#! /usr/bin/env node

var sh = require('../sh.js').sh;

sh('ls')('grep \\.example\\.js$');
