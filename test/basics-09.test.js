#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');

var hasRun = [false, false, false, false];

process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});


/*
 * here we mainly test a closure as a second argument, and check the resulting
 * plumbing
 */
var ls = sh('ls . nxfile');

ls.out('sed s/test/TTEESSTT/', function() {
  hasRun[0] = true;
  
  this.out.result(function(arg) {
    hasRun[1] = true;
    assert.ok(arg.indexOf('TTEESSTT') > -1, 'we get sed\'s output, not ls\'');
  });

  this.or(function(status) {
    throw new Error('sed is supposed to return 0, we got: ' + status);
  });
  
  this.and(function() {
    hasRun[2] = true;
  });
});

ls.err('sed s/nxfile/NXFILE/').result(function(arg) {
  hasRun[3] = true;
  assert.ok(arg.indexOf('NXFILE') > -1, 'we get the second sed\'s output');
});;

