#! /usr/bin/env node

var sh = require('../sh.js').sh;

var l = sh('ls / non_existent_file');

l('grep etc');
l.e('sed s/non_existent/NON_EXISTENT/');
