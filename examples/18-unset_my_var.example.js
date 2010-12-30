#! /usr/bin/env node

var sh = require('../sh.js');

sh.define('MY_VAR', 123)
.and.define('MY_VAR', sh.UNSET)
.and('env')('grep MY_VAR');
