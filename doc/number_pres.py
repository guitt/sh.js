#! /usr/bin/env python

import re
import sys

pre_re = re.compile('''
  <pre>
    ([\s\S]*?)            # code
  </pre>'''
  , re.M | re.X)

def replacer(mo):
  code = mo.group(1)
  count = code.count('\n')
  
  if count < 5:
    lines = ['&nbsp;' for x in range(1, count + 1)]
  else:
    lines = [str(x) for x in range(1, count + 1)]

  num_pre = \
    '<pre class="line_nums">' \
    + '\n'.join(lines) \
    + '</pre>'
  return "%s<pre>%s</pre>" % (num_pre, code)

path = sys.argv[1]

if path == '-':
  content = sys.stdin.read()
else:
  with open(path) as f:
    content = f.read()
  
subst = pre_re.sub(replacer, content)

if len(sys.argv) == 3 and sys.argv[2] == '-':
  sys.stdout.write(subst)
  sys.exit(0)

if len(sys.argv) == 3:
  sub_path = sys.argv[2]
else:
  sub_path = "%s_num" % path

with open(sub_path, 'w') as g:
  g.write(subst)
