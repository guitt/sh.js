#! /usr/bin/env node

var sh = require('../sh.js');

sh('sleep 2').and(function() {
  console.log('woke up!');
});
