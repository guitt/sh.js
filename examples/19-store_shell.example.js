#! /usr/bin/env node

var sh = require('../sh.js');

var sh1 = sh.cd('/').and;
var sh2 = sh.cd('/var').and;

sh1('ls');
sh2('ls');
