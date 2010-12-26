#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');

/*
 * We expect to get one 'hello', one 'bonjour' and one 'hola'
 */
sh('ls').result(function(arg) {}).then(function() {
  console.log('hello');
});

sh('ls').result(function(arg) {}).then('echo bonjour');

sh('true').then('echo hola');

sh('echo hello').cache
.then('echo node').cache
.then('echo world').result(function() {}).then('echo ni hao')
