#! /usr/bin/env node

var sh = require('../sh.js');

sh('git log --pretty=format:"%aN %aE"')
('uniq')('sort').file('AUTHORS');
