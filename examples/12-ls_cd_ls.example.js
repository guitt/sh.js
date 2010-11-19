#! /usr/bin/env node

var sh = require('../sh.js').sh;

sh('ls -l')
.and.cd('..')
.and('ls -l');
