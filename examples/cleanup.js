#! /usr/bin/env node

var sh = require('../sh.js').sh;

sh('rm AUTHORS 100c_files zeros.gz').e.file('/dev/null');
