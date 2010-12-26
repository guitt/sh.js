#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');

var hasRun = [];


process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

function testEach(expected, output) {
  var i = hasRun.length;
  hasRun.push(false);
  var args = [];
  sh('echo "'+output+'"').each(function(arg) {
    args.push(arg);
  }).then(function() {
    hasRun[i] = true;
    assert.deepEqual(expected, args);
  });
}

testEach(['hello', 'world'],'hello world');
testEach(['hello', 'world'], ' hello world');
testEach(['hello', 'world'], ' hello world ');
testEach(['hello', 'world', 'and', 'earth']
  , '\t \t\r\nhello \f \nworld and earth\n\r');
