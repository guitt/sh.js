#! /usr/bin/env node

var sh = require('../sh.js').sh;

sh('date')
.then('sleep 2')
.then('date');
