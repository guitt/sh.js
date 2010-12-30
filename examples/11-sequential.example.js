#! /usr/bin/env node

var sh = require('../sh.js');

sh('date')
.then('sleep 2')
.then('date');
