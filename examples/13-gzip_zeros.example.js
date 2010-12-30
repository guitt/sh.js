#! /usr/bin/env node

var sh = require('../sh.js');

var s = sh('dd if=/dev/zero count=10000 bs=50K')('gzip').file('zeros.gz');

s.then('echo compression stopped');
s.or('echo compression failed');
s.and('echo compression succeeded');
