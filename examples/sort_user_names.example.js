#! /usr/bin/env node

var sh = require('../sh.js');

sh('cut -f1 -d: /etc/passwd')('sort');
