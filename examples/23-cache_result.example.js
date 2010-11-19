#! /usr/bin/env node

var sh = require('../sh.js').sh;

sh('echo hello').cache
.and('echo world').cache
.and('echo and').cache
.and('echo universe').result(function(var1, var2, var3, var4) {
  sh('echo '+var1+' '+var2+' '+var3+' '+var4);
});
