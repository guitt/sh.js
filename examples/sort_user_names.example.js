#! /usr/bin/env node

var sh = require('../sh.js').sh;

sh('cut -f1 -d: /etc/passwd')('sort');
