#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');
var path = require('path');

var hasRun = [false];


process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

var pwd = 'sh -c "pwd"'

var date = (new Date).getTime();
var
  file1 = 'sh.js_' + path.basename(__filename) + '.dump1_' + date,
  path1 = '/tmp/' + file1,
  file2 = 'sh.js_' + path.basename(__filename) + '.dump2_' + date,
  path2 = '/tmp/' + file2;

sh.cd('/tmp').and(pwd).file(file1).and(function() {
  sh(pwd).file(file2).and('cat ' + path1 + ' ' + path2).result(function(cwds) {
    assert.equal(cwds, '/tmp\n/tmp\n');
    sh('rm ' + path1 + ' ' + path2).and(function() { hasRun[0] = true });
  })
});
