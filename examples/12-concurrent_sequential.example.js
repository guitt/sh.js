#! /usr/bin/env node

var sh = require('../sh.js');

var s = sh('sleep 1');
    
s.and('sleep 2').and('date');
s.and('sleep 2').and('date');
