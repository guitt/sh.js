#! /usr/bin/env node

var sh = require('../sh.js');

sh('ls / non_existent_file',
  sh.out('grep etc'),
  sh.err('sed s/non_existent/NON_EXISTENT/')
);
