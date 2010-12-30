#! /usr/bin/env node

var sh = require('../sh.js');

sh('find /var -type s').err.file('/dev/null');
