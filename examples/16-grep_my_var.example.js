#! /usr/bin/env node

var sh = require('../sh.js').sh;

sh.define('MY_VAR', 123).and('env')('grep MY_VAR');
