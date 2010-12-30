#! /usr/bin/env node

var sh = require('../sh.js');

sh('ls / non_existent_file', function(l) {
  l.out('grep etc');
  l.err('sed s/non_existent/NON_EXISTENT/');
});
