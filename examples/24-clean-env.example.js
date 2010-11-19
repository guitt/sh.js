#! /usr/bin/env node

var sh = require('../sh.js').sh;

sh.define(sh.ENV, {
  'MY_VAR': 123
})
.and('env');
