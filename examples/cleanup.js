#! /usr/bin/env node

var sh = require('../sh.js');

sh('rm AUTHORS 100c_files zeros.gz').err.file('/dev/null');
