#! /usr/bin/env python

import re
import sys

include_re = re.compile('(?:\n    ///file:(.+))\n')
options_re = re.compile('(.+?)(?::(\d+))?(?::(\d+))?(?::(link))?$')

if len(sys.argv) < 2:
  sys.stderr.write('usage: sys.argv[0] FILE [DEST]\n')
  sys.exit(1)

def replacer(mo):
  options = options_re.findall(mo.group(1))[0]
  
  path = options[0]
  if path[0] == ':':
    raise
  
  if len(options[1]) > 0: begin = int(options[1])
  else: begin = 0
  
  if len(options[2]) > 0: end = int(options[2])
  else: end = 99999999
  
  if options[3] == 'link': link = True
  else: link = False
  
  #print path, begin, end, link
  
  line_num = 0
  repl = '\n'
  
  if link:
    repl = repl + '    // %s\n\n' % path
  
  with open(path) as f:
    for line in f:
      line_num = line_num + 1
      if line_num >= begin and line_num < end:
        repl = repl + '    ' + line
  
  return repl

ronn = sys.argv[1]

if ronn == '-':
  content = sys.stdin.read()
else:
  with open(ronn) as f:
    content = f.read()

subst = include_re.sub(replacer, content)

if len(sys.argv) == 3 and sys.argv[2] == '-':
  sys.stdout.write(subst)
  sys.exit(0)

if len(sys.argv) == 3:
  sub_path = sys.argv[2]
else:
  sub_path = "%s_subst" % ronn

with open(sub_path, 'w') as g:
  g.write(subst)
