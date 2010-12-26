#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');
var path = require('path');

var hasRun = [false, false];


process.on('exit', function() {
  hasRun.forEach(function(v,i) {
    if (!v) throw new Error('callback ' + i + ' has not run');
  });
});

var date = (new Date).getTime();
var
  file1 = 'sh.js_' + path.basename(__filename) + '.dump1_' + date,
  path1 = '/tmp/' + file1,
  path2 = 'sh.js_' + path.basename(__filename) + '.dump2_' + date;

sh('pwd').file(path1).and.cd('..').and('pwd',
  sh.append(path1),
  sh.and.cd('test').and('pwd').append(path1).and(function() {
    sh('cat ' + path1).result(function(content) {
      var expected = __dirname + '\n' 
        + path.join(__dirname, '..') + '\n'
        + __dirname + '\n';
      
      assert.equal(content, expected);
      
      sh('rm ' + path1).and(function() { hasRun[0] = true; });
    });
  })
);

sh.cd('/tmp').and('true',
  sh.file(path2),
  sh.and('rm /tmp/' + path2).and(function() { hasRun[1] = true; })
);
