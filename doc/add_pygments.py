#! /usr/bin/env python

import re
import sys
from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter

formatter = HtmlFormatter(encoding='utf-8')

code_re = re.compile('''
  <pre>\s*<code>\s*
    ///pygments:(.+)\n    # pick a lexer
    ([\s\S]*?)            # code
  </code>\s*</pre>'''
  , re.M | re.X)

amp_re = re.compile('&amp;')
gt_re = re.compile('&gt;')
lt_re = re.compile('&lt;')


open_pre_re = re.compile('<div class="highlight"><pre>')
close_pre_re = re.compile('</pre></div>')

def replacer(mo):
  code = mo.group(2)
  code = amp_re.sub('&', code)
  code = gt_re.sub('>', code)
  code = lt_re.sub('<', code)
  lexer = get_lexer_by_name(mo.group(1), stripall=True)
  code = highlight(code, lexer, formatter)
  code = open_pre_re.sub('<div class="highlight"><pre><code>', code)
  code = close_pre_re.sub('</code></pre></div>', code)
  return code

path = sys.argv[1]

if path == '-':
  content = sys.stdin.read()
else:
  with open(path) as f:
    content = f.read()

subst = code_re.sub(replacer, content)

if len(sys.argv) == 3 and sys.argv[2] == '-':
  sys.stdout.write(subst)
  sys.exit(0)

if len(sys.argv) == 3:
  sub_path = sys.argv[2]
else:
  sub_path = "%s_high" % path

with open(sub_path, 'w') as g:
  g.write(subst)
