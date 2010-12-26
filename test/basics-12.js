#! /usr/bin/env node

var sh = require('../sh.js');
var assert = require('assert');


sh('ls . nxfile', sh.OO).result(function(arg) {
  // this isn't expected to work as long as the redirection of
  // stderr to stdout is not implemented.
  // if it was implemented, the middle cat is not necessary anymore
});
