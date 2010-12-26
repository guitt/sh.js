#! /usr/bin/env node

var sh = require('../sh.js');

if (process.argv[2]) {
  var c = sh('true');
} else {
  var c = sh('false');
}

c.then('echo hello');

c.and(function() {
  setTimeout(function() {
    sh('echo universe');
  }, 20);
});

c.or(function() {
  setTimeout(function() {
    sh('echo world');
  }, 20);
});
