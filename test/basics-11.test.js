#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');

var hasRun = [false, false, false, false];


process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

sh('ls . nxfile', sh.OO)('cat').result(function(arg) {
  //                    ^^^^^^^ : middle cat, work around to redirect
  // stderr to stdout with .result() / .cache and .each()
  hasRun[0] = true;
  
  assert.ok(arg.indexOf('nxfile') > -1, 'we get stderr on stdout');
  assert.ok(arg.indexOf('test.js') > -1, 'we get stdout too');
});

// Same test but with a closure
sh('ls . nxfile', sh.OO)('cat', function() {
  this.result(function(arg) {
    hasRun[1] = true;

    assert.ok(arg.indexOf('nxfile') > -1, 'we get stderr on stdout');
    assert.ok(arg.indexOf('test.js') > -1, 'we get stdout too');
  });
});

// Same test but with three arguments on the root
sh('ls . nxfile', sh.OO, function() {
  this('cat', function() {
    this.result(function(arg) {
      hasRun[2] = true;

      assert.ok(arg.indexOf('nxfile') > -1, 'we get stderr on stdout');
      assert.ok(arg.indexOf('test.js') > -1, 'we get stdout too');
    });
  });
});

// Redirect stderr and stdout to a file
var tmpFile = '/tmp/sh.js_basics-11.test.js.dump' + (new Date).getTime();
sh('ls . nxfile', sh.OO).file(tmpFile).then('cat ' + tmpFile).result(function(arg) {
  hasRun[3] = true;
  
  assert.ok(arg.indexOf('nxfile') > -1, 'we get stderr on stdout');
  assert.ok(arg.indexOf('test.js') > -1, 'we get stdout too');
}).then('rm ' + tmpFile);

// Same but with a closure
var tmpFile = '/tmp/sh.js_basics-11.test.js.dump' + ((new Date).getTime() + 1);
sh('ls . nxfile', sh.OO, function() {
  this.file(tmpFile).then('cat ' + tmpFile).result(function(arg) {
    hasRun[3] = true;
    
    assert.ok(arg.indexOf('nxfile') > -1, 'we get stderr on stdout');
    assert.ok(arg.indexOf('test.js') > -1, 'we get stdout too');
  }).then('rm ' + tmpFile);
});
