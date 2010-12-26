#! /usr/bin/env node

var sh = require('../sh.js');

sh('echo hello').file('./non_exitent_directory/phoney_file', function(err) {
  console.log('got the error!');
  // Return false to prevent an error to be thrown.
  // Since opening a file is asynchronous, you can't catch the error.
  return false;
});
