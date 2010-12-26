#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');
var path = require('path');

var hasRun = [false, false, false, false, false, false, false];


process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

sh('echo hello',
  sh.and(function() { hasRun[0] = true; }),
  sh.or(function() { throw new Error(); }),
  sh.then(function() { hasRun[1] = true; }),
  sh.out('cat',
    sh.and(function() { hasRun[2] = true; }),
    sh.or(function() { throw new Error(); }),
    sh.then(function() { hasRun[3] = true; })
  ),
  sh.err('cat',
    sh.and(function() { hasRun[4] = true; }),
    sh.or(function() { throw new Error(); }),
    sh.then(function() { hasRun[5] = true; })
  )
);

var date = (new Date).getTime();
var
  file = 'sh.js_' + path.basename(__filename) + '.dump_' + date,
  path = '/tmp/' + file;

sh('echo bonjour',
  sh.file(path),
  sh.and('echo tout le monde',
    sh.out('cat',
      sh.append(path),
      sh.and(function() {
        sh('cat ' + path).result(function(content) {
          hasRun[6] = true;
        
          assert.equal(content, 'bonjour\ntout le monde\n');
        }).then('rm ' + path)
      })
    )
  )
);
