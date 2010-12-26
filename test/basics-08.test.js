#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');

var hasRun = [false];

process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

var sh1 = sh.cd('..').then;

setTimeout(function() {
  sh1('ls')('grep sh.js').result(function(arg) {
    hasRun[0] = true;
  });
}, 1);
