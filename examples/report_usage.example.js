#! /usr/bin/env node

var sh = require('../sh.js');

sh('df')('awk \'{ if ($6 == "/") printf "%s", $5 }\'')
  .result(function(available) {
    console.log('space available on /: ' + available);
  });
