#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');

var hasRun = [false, false, false, false, false, false];


process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

sh.cd('..').and('ls').result(function(listing1) {
  hasRun[0] = true;

  sh('ls').result(function(listing2) {
    hasRun[1] = true;
    assert.equal(listing1, listing2, 'the cwd persists inside a result callback');
    
    sh.cd('test').and('ls').result(function(listing3) {
      hasRun[2] = true;
      
      sh('ls').result(function(listing4) {
        hasRun[3] = true;
        
        assert.equal(listing3, listing4,
          'the cwd persists in deep nested callbacks');
      });
      
      sh('sh -c "pwd"').result(function(cwd) {
        hasRun[4] = true;
        
        assert.ok(cwd.slice(-5, -1) === 'test', 
          'the cwd should end with "test" as we are in the test directory');
      });
    });
  });
  
  sh('sh -c "pwd"').result(function(cwd) {
    hasRun[5] = true;
    
    assert.ok(cwd.slice(0, -1) !== 'test', 
      'the cwd should not end with "test" as we just moved to its parent');
  });
});
