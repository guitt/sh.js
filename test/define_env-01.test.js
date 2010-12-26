#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');

var hasRun = [false, false, false, false, false, false, false, false];


process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

var sh1 = sh.define({
  SHJS_TEST_VAR1: 'hello',
  SHJS_TEST_VAR2: 'WORLD'
}).and;

var sh2 = sh.define({
  SHJS_TEST_VAR1: 'hi',
  SHJS_TEST_VAR2: 'sh.js'
}).and;

var sh3 = sh.define('SHJS_TEST_VAR1', 'bonjour').and;

var sh4 = sh.define(sh.ENV, {
  SHJS_TEST_VAR1: 'test',
  SHJS_TEST_VAR2: 'complete',
  SHJS_TEST_VAR3: 'env'
}).and;

process.nextTick(function() {
  
  sh('./define_env-01.sh').result(function(output) {
    assert.equal(output, '\n', 'using the default environment');
    hasRun[1] = true;
  });

  sh1('./define_env-01.sh').result(function(output) {
    assert.equal(output, 'hello WORLD\n', 'define enviromnent variables');
    hasRun[2] = true;
  });
  
  sh2('./define_env-01.sh').result(function(output) {
    assert.equal(output, 'hi sh.js\n', 'using multiple environments in parallel');
    hasRun[3] = true;
  });
  
  sh3('./define_env-01.sh').result(function(output) {
    assert.equal(output, 'bonjour\n', 'define a single environment variable');
    hasRun[4] = true;
  });
  
  sh4('./define_env-01.sh').result(function(output) {
    assert.equal(output, 'test complete env\n', 'define the whole environment');
    hasRun[5] = true;
  });
  
  sh4.define('SHJS_TEST_VAR1', sh.UNSET)
  .and('./define_env-01.sh').result(function(output) {
    assert.equal(output, 'complete env\n', 'unset a single environment variable');
    hasRun[6] = true;
  });;
  
  sh4.define({
    SHJS_TEST_VAR1: sh.UNSET,
    SHJS_TEST_VAR2: sh.UNSET,
    SHJS_TEST_VAR4: 'changed',
  })
  .and('./define_env-01.sh').result(function(output) {
    assert.equal(output, 'env changed\n', 'unset a group of environment variables');
    hasRun[7] = true;
  });;
  
  hasRun[0] = true;
});
