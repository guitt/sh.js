#! /usr/bin/env node

var sh = require('../sh.js');

sh('ls / non_existent_file', function() {
  this.out('grep etc');
  this.err('sed s/non_existent/NON_EXISTENT/');
});
