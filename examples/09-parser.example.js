#! /usr/bin/env node

var parser = require('../sh.js')._internal.parser;

console.log(parser.parse('echo hello\\ \\ world \\" \\\' \\\\'));
