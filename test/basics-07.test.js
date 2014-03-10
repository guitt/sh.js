#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');

var
  count = 0,
  hasRun = [false, false, false];

process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

sh('ls . nxfile',
  sh.err.file('/dev/null')
).out('grep test').each(function(arg) {
  
  hasRun[0] = true;
  assert.ok(arg.indexOf('test') > 0, 'we get grep\'s output');
  assert.ok(arg.indexOf('nxfile') === -1, 'we don\'t get the error stream');
  assert.ok(arg.trim().length === arg.length,
    'the argument does not have leading/trailing spaces');

  count++;
  
}).then(function() {
  hasRun[1] = true;
  assert.ok(count > 0, 'the closure is called at least once');
});

sh('true').each(function(arg) {
  throw new Error('The callback is run when there is not output');
}).then(function() {
  hasRun[2] = true;
});
