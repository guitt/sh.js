#! /usr/bin/env node

var sh = require('../sh.js');

sh('ls -l')
.and.cd('..')
.and('ls -l');
