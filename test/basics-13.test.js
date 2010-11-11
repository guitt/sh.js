#! /usr/bin/env node

var sh = require('../sh.js').sh;
var assert = require('assert');

var hasRun = [false];


process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

var date = (new Date).getTime();
var tmpFile = '/tmp/sh.js_basics-13.test.js.dump' + date;
sh('echo hello').file(tmpFile)
.then('echo world').append(tmpFile)
.then('cat ' + tmpFile).result(function(content) {
  hasRun[0] = true;
  assert.equal(content, 'hello\nworld\n', 'written "hello\n" to a file, and '
    + 'appended "world\n" to it');
});
