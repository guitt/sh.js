#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');
var path = require('path');

var hasRun = [false, false];


process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

var date = (new Date).getTime();
var
  path1 = '/tmp/' + 'sh.js_' + path.basename(__filename) + '.dump1_' + date,
  path2 = '/tmp/' + 'sh.js_' + path.basename(__filename) + '.dump2_' + date;

sh.define({
  SHJS_TEST_VAR1: 'hello',
  SHJS_TEST_VAR2: 'WORLD'
}).and('true',
  sh.and('./define_env-01.sh').file(path1).and(function() {
    sh('cat ' + path1).result(function(content) {
      assert.equal(content, 'hello WORLD\n', 'keeping environement variables '
        + 'in a branch argument');
      sh('rm ' + path1).and(function() { hasRun[0] = true; });
    });
  })
);

sh.define({
  SHJS_TEST_VAR1: 'hello',
  SHJS_TEST_VAR2: 'WORLD'
}).and('true',
  sh.and.define('SHJS_TEST_VAR2', sh.UNSET).and('./define_env-01.sh').file(path2)
  .and(function() {
    sh('cat ' + path2).result(function(content) {
      assert.equal(content, 'hello\n', 'modifying environement variables '
        + 'in a branch argument');
      sh('rm ' + path2).and(function() { hasRun[1] = true; });
    });
  })
);
