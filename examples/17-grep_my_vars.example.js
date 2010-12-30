#! /usr/bin/env node

var sh = require('../sh.js');

sh.define({
  'MY_VAR1': 123,
  'MY_VAR2': 'abc'
})
.and('env')('grep MY_VAR');
