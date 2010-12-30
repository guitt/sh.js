#! /usr/bin/env node

var sh = require('../sh.js');

var l = sh('ls / non_existent_file');

l('grep etc');
l.err('sed s/non_existent/NON_EXISTENT/');
