#! /usr/bin/env node

var sh = require('../sh.js').sh;
var assert = require('assert');

var hasRun = [false];


process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});


/*
 * here we test that, despite calling .pipe but not .err, the commands work
 * and plug to the right parent
 */
sh('echo hello')
  .pipe('sed s/e/o/g')
  .pipe('sed s/o/l/g')
  .pipe('sed s/l/h/g')
  .result(function(r) {
    hasRun[0] = true;
    assert.equal(r, 'hhhhh\n');
  });
