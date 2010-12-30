#! /usr/bin/env node

var sh = require('../sh.js');

sh('find . -size -100c').file('100c_files');
