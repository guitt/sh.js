#! /usr/bin/env node

var sh = require('../sh.js').sh;

sh('find /var -type s').e.file('/dev/null');
