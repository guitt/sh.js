#! /usr/bin/env node

var sh = require('../sh.js');

var l = sh('ls / non_existent_file',
  sh.out('grep etc'),
  sh.and('echo ls succeeded'),
  function() {
    this.err.file('/dev/null');
    this.or('echo ls failed');
    this.then('echo ls finished (1)');
  }
);

l.then('echo ls finished (2)');
