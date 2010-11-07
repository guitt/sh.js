#! /usr/bin/env node

var sh = require('../sh.js').sh;
var assert = require('assert');

var
  count = 0,
  hasRun = [false, false];

process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

var p1 = sh('cat /home/guillaume/bin/node');

p1.then(function() {
  hasRun[0] = true;
  console.log("p1 returned:", this.status);
});

var p2 = p1('true');

p2.then(function() {
  hasRun[1] = true;
  console.log("p2 returned:", this.status);
});
