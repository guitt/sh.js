#! /usr/bin/env node

var sh = require('../sh.js').sh;

sh('ls / non_existent_file')
  .pipe('grep etc')
  .err('sed s/non_existent/NON_EXISTENT/');
