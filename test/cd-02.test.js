#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');

var hasRun = [false,false,false,false,false];


process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

var pwd = 'sh -c "pwd"'
var cwd0, cwd1, cwd2, cwd3, cwd4;

sh.cd('/').and(function() {
  hasRun[0] = true;
  
  sh(pwd).result(function(cwd) {
    hasRun[1] = true;
    
    assert.equal(cwd.slice(0, -1), '/', 'cd / works');
  });
});

sh(pwd).result(function(cwd) {
  hasRun[2] = true;

  cwd0 = cwd; 
}).and.cd('..').and(function() {
  hasRun[3] = true;

  sh(pwd).result(function(cwd) {
    hasRun[4] = true;
    
    cwd1 = cwd;
    
    assert.equal(cwd0, cwd1.slice(0, -1) + '/test\n');
  });
});
