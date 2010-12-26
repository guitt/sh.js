#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');

var
  hasRun = [false];

process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

sh('ls . nxfile')
  ('grep test').cache
  .err('sed s/nx/NX/').result(function(cache0, cache1) {
    hasRun[0] = true;
    assert.ok(cache0.indexOf('test') > 0, 'we get grep\'s output');
    assert.ok(cache1.indexOf('NXfile') > 0, 'we get sed\'s output');
  });
