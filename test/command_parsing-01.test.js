#! /usr/bin/env node

var assert = require('assert');
var util = require('util');
var sh = require('../sh.js');
var parser = require('../sh.js')._internal.parser;


function testParsing(command, argv, msg) {
  var parsed;
  try {
    parsed = parser.parse(command);
    assert.deepEqual(parsed, argv, msg);
  } catch (e) {
    console.log('parsing  : %s', command);
    if (parsed) console.log('getting  :', util.inspect(parsed));
    console.log('expecting:', util.inspect(argv));
    throw e;
  }
}

function testParsingFails(command, msg) {
  var parsed;
  try {
    assert.throws(function() {
      parsed = parser.parse(command);
    }, Error, msg);
  } catch (e) {
    console.log('parsing  : %s', command);
    console.log('getting  :', parsed);
    console.log('expecting an error');
    throw e;
  }
}

testParsing('echo hello world', ['echo', 'hello', 'world']);
testParsing('"echo"', ['echo']);
testParsing('"echo" hello "world"', ['echo', 'hello', 'world']);
testParsing('"echo" "hello world"', ['echo', 'hello world']);
testParsing('"ec""ho" "hello" "world"', ['echo', 'hello', 'world']);
testParsing('"echo" \\" "hello"   \t \n \r "world"',
  ['echo', '"', 'hello', 'world']);
testParsing('"echo" "hello \\"world"', ['echo', 'hello "world']);
testParsing('"echo" \'hello "world\'', ['echo', 'hello "world']);
testParsing('"ec"\'ho\' "hello" \'world\'', ['echo', 'hello', 'world']);
testParsing('"echo" hello \\\' world', ['echo', 'hello', '\'', 'world']);
testParsing("ech'o' 'hello''world'", ['echo', 'helloworld']);
testParsing('echo hello \\\\ world', ['echo', 'hello', '\\', 'world']);
testParsing(' echo', ['echo'], 'leading space');
testParsing('echo  ', ['echo'], 'trailing space');
testParsing(' echo  ', ['echo'], 'leading and trailing spaces');
testParsing(' echo hello ', ['echo', 'hello'], 'leading and trailing spaces');
testParsing('echo ""', ['echo', ''], 'empty quotes');
testParsing('echo """"', ['echo', ''], 'empty quotes');
testParsing('echo \'\'', ['echo', ''], 'empty quotes');
testParsing('echo \'\'\'\'', ['echo', ''], 'empty quotes');
testParsing('echo \\hello', ['echo', '\\hello'], 'backslash without escaping');
testParsing('echo "\\hello"', ['echo', '\\hello'], 'backslash without escaping');
testParsing('echo \\  hello', ['echo', ' ', 'hello'], 'escape space');
testParsing('echo hello\\ world', ['echo', 'hello world'], 'escape space');

testParsingFails('"echo" " "hello " " world"', 'unmatched/unescaped double quote');
testParsingFails('"echo" \\ " "hello " " world"', 'unmatched/unescaped double quote');
