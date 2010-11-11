#! /usr/bin/env sh

output="`./exit_must_run_once.js`"
# echo $output
x=0

hellos=`echo "$output" | grep hello | wc -l`
bonjours=`echo "$output" | grep bonjour | wc -l`
holas=`echo "$output" | grep hola | wc -l`
nihaos=`echo "$output" | grep "ni hao" | wc -l`


if test $hellos -ne '1'
then
  echo "got $hellos hello(s)"
  x=1
fi

if test $bonjours -ne '1'
then
  echo "got $bonjours bonjour(s)"
  x=1
fi

if test $holas -ne '1'
then
  echo "got $holas hola(s)"
  x=1
fi

if test $nihaos -ne '1'
then
  echo "got $nihaos ni hao(s)"
  x=1
fi

exit $x
