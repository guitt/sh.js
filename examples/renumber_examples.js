#! /usr/bin/env node

/*
 This is not really an example but a script to rename examples according to their position in the tutorial.
 */

var sh = require('../sh.js').sh;

// references to examples in the tutorial should follow the format
// ./XX-example_name.example.js
// to be recognized
var re = new RegExp('\\./\\d\\d-.+?\\.example\\.js(?=\n)', 'gm');
var exRe = new RegExp('\\d\\d-.+$');
var numRe = new RegExp('^\\d\\d');

function padNum(n) {
  if (n < 0)
    throw new RangeError('n must be positive: ' + n);
  if (n < 10)
    return '0' + n;
  if (n < 100)
    return String(n);
  
  throw new RangeError('n too big: ' + n);
}

// load the README
sh('cat ../README.md').result(function(readme) {
  // look for references to examples
  var examples = readme.match(re),
    changeMade = false;
  
  examples.forEach(function(ex, i) {
    var oldName = ex.match(exRe)[0];
    // renumber the example file name
    var newName = oldName.replace(numRe, padNum(i + 1));
    
    if (oldName === newName)
      return;

    changeMade = true;    
    
    console.log("renaming: %s   =>   %s", oldName, newName);
    
    sh('mv "' + oldName + '" "' + newName + '"');
    readme = readme.replace(oldName, newName, 'gm');
  });
  
  if (changeMade)
    sh(['echo', '-n', readme]).file('../README.md');
  else
    console.log('no change was made');
});
