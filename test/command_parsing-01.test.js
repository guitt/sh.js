#! /usr/bin/env node

var assert = require('assert');
var sh = require('../sh.js').sh;
var parser = require('../command_parser.js');

var hasRun = [false];


process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});
var cmd = 'echo hello world';

var parsed = parser.parse(cmd);
var expected = ['echo', 'hello', 'world'];

assert.deepEqual(parsed, expected, 'basic space-separated arguments');

sh(parsed).result(function(a) {
  sh(cmd).result(function(b) {
    assert.equal(a, b, 'passing an argv array gives the same result as with '
      + 'command parsing');
    hasRun[0] = true;
  });
});
