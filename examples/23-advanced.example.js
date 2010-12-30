#! /usr/bin/env node

var sh = require('../sh.js');

var l = sh('ls / non_existent_file',
  sh.out('grep etc'),
  sh.and('echo ls succeeded'),
  function(l) {
    l.err.file('/dev/null');
    l.or('echo ls failed');
    l.then('echo ls finished (1)');
  }
);

l.then('echo ls finished (2)');
