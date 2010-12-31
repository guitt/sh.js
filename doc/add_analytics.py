#! /usr/bin/env python

import sys, re

ga_re = re.compile(r'<!-- analytics placeholder -->')

ga_snippet = """<script type="text/javascript">

    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', 'UA-20491031-1']);
    _gaq.push(['_trackPageview']);

    (function() {
      var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
      ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
      var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    })();

  </script>"""

for f in sys.argv[1:]:
  with open(f) as ff:
    content = ff.read()
  content = ga_re.sub(ga_snippet, content)
  with open(f, 'w') as ff:
    ff.write(content)
