#! /usr/bin/env node

var sh = require('../sh.js');

sh('cat 100c_files')('wc -l').result(function(count) {
  console.log('found %d file(s) smaller than 100 bytes', Number(count));
});
