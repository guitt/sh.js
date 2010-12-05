#! /usr/bin/env python

import re
import sys

h1_re = re.compile('''
  <h1>
    ([\s\S]*?)            # title
  </h1>'''
  , re.M | re.X)

title_re = re.compile('<title>sh\.js documentation</title>')

def replacer(mo):
  title = h1_re.search(mo.string)
  return "<title>%s</title>" % title.group(1)

path = sys.argv[1]

if path == '-':
  content = sys.stdin.read()
else:
  with open(path) as f:
    content = f.read()

subst = title_re.sub(replacer, content)

if len(sys.argv) == 3 and sys.argv[2] == '-':
  sys.stdout.write(subst)
  sys.exit(0)

if len(sys.argv) == 3:
  sub_path = sys.argv[2]
else:
  sub_path = "%s_high" % path

with open(sub_path, 'w') as g:
  g.write(subst)
