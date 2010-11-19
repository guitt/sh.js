What is sh.js?
==============

sh.js is a Javascript <b>library</b> for Unix shell scripting working on [node.js](nodejs.org).

For example, to sort user names in `/etc/passwd` in a classical shell script, you could write:

    cut -f1 -d: /etc/passwd | sort

With sh.js, the following statement would accomplish the same:

    sh('cut -f1 -d: /etc/passwd')('sort');

Why try it?
-----------

You may find sh.js useful if:

-   you use node.js and you want a high-level, prototyping-friendly API to use Unix utilities from Javascript.
-   you would like to try shell scripting in a different language than Bourne's (<b>disclaimer: sh.js is far from ready</b>).

What sh.js isn't
----------------

-   sh.js isn't an interactive shell (unfortunately, for now). You need to write some Javascript in a file, and run it with node.js
-   sh.js isn't a command interpreter. It doesn't interpret a language. However, it is a library to experiment an alternative to command interpreters such as Bash.

Examples
--------

Run a command:

    sh('echo hello');

Change the working directory and run a command in the new directory:

    sh.cd('/').and('ls -l');

In a Git repository, put all authors with their email in a file:

    sh('git log --pretty=format:"%aN %aE"')
    ('uniq')('sort').file('AUTHORS');
    
Report the space availability of the root partition to the remote `monitor.lan` server:

    sh('df')('awk \'{ if ($6 == "/") printf "%s", $5 }\'')
      .result(function(available) {
        sh('curl -d root="' + available + '" https://monitor.lan/disk_report');
      });

You'll find a tutorial below. You may also look at the `example` directory.

Acknowledgements
----------------

Special thanks to the [Jison](http://zaach.github.com/jison/) project. Jison is a powerful Javascript parser generator that sh.js uses, although in a very basic, clumsy fashion, to parse commands.

Thanks to the [node.js](nodejs.org) project. Node.js uses Google's blazing-fast V8 Javascript virtual machine, adds APIs to interact with the operating system and is pleasant and fun to use.

Limitations
-----------

As of now, sh.js still has some serious limitations:

-   Node's `Stream`s are not supported. You can't easily redirect standard output to an HTTP stream for instance. This is likely to be resolved.
-   sh.js from an interactive command line is not usable. You can try it, but it'll be a pain. sh.js is better suited to be used in scripts for now. This is not very likely to be worked out any time soon.
-   There is a lack of features such as easy file and directory manipulation. This would be a great niche for a library.
-   sh.js is not extensible at all for now. It would be nice to have plugins adding high-level APIs abstracting some Unix commands. This seems quite feasible.

Installation
------------

sh.js <b>requires</b> [node.js](nodejs.org) to function.

I will be working on an [npm](https://github.com/isaacs/npm) installation. In the meantime, you'll have to clone the repository with git and use `require` with a path:

    var sh = require('/path/to/shjs/sh.js').sh;
    sh('echo hello');

You may go to the `test` directory and run `./run_tests.sh` to make sure it's worthwhile going on.

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
Before you start
----------------

The following tutorial aims people who are at least novice at shell scripting and know their way in node.js. In particular, you should be familiar with:
-   standard streams: standard input, output and error
-   pipes: `ls / | grep etc`
-   redirections: `find . -name "*.js" > results`
-   exit statuses and operators such as `&&` or `||`
-   Javascript
-   `require`
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

Tutorial
--------

Here we explain in greater details how to use sh.js, and to a lesser extent, how it works.

<b>In a terminal, head to the `examples` directory, and run `./00-hello.example.js`</b>

Other examples in this tutorial may have a file name indicating you can run it in the `examples` directory.

### Introduction

At its core, sh.js launches programs:
    
    // ./01-ls.example.js
    
    sh('ls');

This spawns a new process that executes the `ls` program.

That returns a function that you may call:

    // ./02-ls_grep.example.js
    
    var f = sh('ls');
    f('grep \\.example\\.js$');

By calling it, you tell sh.js that you want `ls`' output to be used as `grep`'s input. You can pipe like that as many times as you want:

    // ./03-multi_pipe.example.js
    
    sh('echo hello')('cat')('cat')('cat')('cat');

That is the equivalent to the following Bash command:

    echo hello | cat | cat | cat | cat

Now here's how to redirect standard output to a file:

    // ./04-find_files.example.js
    
    sh('find . -size -100c').file('100c_files');

Bash equivalent:
    
    find . -size -100c > 100c_files

Alternatively, there is an `.append()` method that appends to a file instead of (over)writting it (like `>>`).

You can also cache the output of a command, and receive it in an callback:

    // ./05-count_find_results.example.js
    
    sh('cat 100c_files')('wc -l').result(function(count) {
      console.log('found %d file(s) smaller than 100 bytes', Number(count));
    });

Bash equivalent:
    
    echo found `cat 100c_files | wc -l` file\(s\) smaller than 100 bytes

I hope you can see the pattern here: anywhere piping is syntactically correct, `.file()`, `.append()` and `.result()` are correct too:

    sh('echo hello')('cat');
    //              ^^^^^^^ piping is correct
    
    sh('echo hello').file('hello.dump');
    //              ^^^^^^ therefore .file() is correct too
    
    sh('echo hello').append('hello.dump');
    //              ^^^^^^^^ and so is .append()
    
    sh('echo hello').result(function(output) { console.log(output); });
    //              ^^^^^^^^ as well as .result()

Piping stderr is quite similar to stdout, you need to interleave `.e`:

    // ./06-pipe_err_to_null.example.js
    
    sh('find /var -type s').e.file('/dev/null');

Bash equivalent:
    
    find /var -type s 2> /dev/null

That will find socket files and discard errors messages.

<b>Note</b>: see the section on advanced piping to redirect both stdout and stderr.

### Quoting and escaping arguments

Typing commands with sh.js is meant to feel *almost* like a standard shell.

You can quote arguments:

    // ./07-quoting.example.js
    
    sh('echo "hello        world"');
    
    // Output:
    hello        world

You can escape characters:

    // ./08-escaping.example.js
    
    sh('echo hello\\ \\ world \\" \\\' \\\\');
    
    // Output:
    hello  world " ' \

In case, quoting or escaping are not satisfying, you may pass an array of arguments instead:

    sh(['echo', 'hello  world " \\']);

Finally, to avoid getting stuck because of a bug, you can access the parser like so:

    // ./09-parser.example.js

    var parser = require('../sh.js')._internal.parser;
    
    console.log(parser.parse('echo hello\\ \\ world \\" \\\' \\\\'));
    
    // Output:
    [ 'echo', 'hello  world', '"', '\'', '\' ]

The `.parse()` method returns an array with the arguments as it interprets them. If you spot a bug, please report it.

### Concurrent vs. sequential commands

*sh.js is non-blocking*. Every call returns immediately after some minor computations. For instance, consider:

    // ./10-concurrent.example.js
    
    sh('date');
    sh('sleep 2');
    sh('date');
    
    // Output:
    jeudi 18 novembre 2010, 20:30:54 (UTC+0100)
    jeudi 18 novembre 2010, 20:30:54 (UTC+0100)

Unlike in Bash, both dates are the same because calls to sh.js do not block. Both `date` commands are run <b>concurrently</b>. This is useful to run tasks in parallel.

Bash equivalent:

    date & sleep 2 & date &

If you want to run commands <b>sequentially</b>, use `.then()`:

    // ./11-sequential.example.js
    
    sh('date')
    .then('sleep 2')
    .then('date');
    
    // Output:
    jeudi 18 novembre 2010, 20:33:07 (UTC+0100)
    jeudi 18 novembre 2010, 20:33:09 (UTC+0100)

This does not block the execution of your program, but it <b>schedules</b> the next command only after the previous one exits. Notice dates are not the same, unlike before.

Bash equivalent:

    date
    sleep 2
    date

Concurrent and sequential commands are not mutually exclusive, you can use both:

    // ./12-concurrent_sequential.example.js
    
    var s = sh('sleep 1');
    
    s.and('sleep 2').and('date');
    s.and('sleep 2').and('date');
    
    // Output:
    jeudi 18 novembre 2010, 20:35:46 (UTC+0100)
    jeudi 18 novembre 2010, 20:35:46 (UTC+0100)

`sleep 2` commands are run after the `sleep 1` command, so that's sequential. But notice the dates are the same because `sleep 2` commands are run concurrently.

Bash equivalent:

    sleep 1 && ( ( sleep 2 && date ) & ( sleep 2 && date ) & )

### Reacting to an exit status with `.and()` and `.or()`

Using `.and()` and `.or()` methods, you can handle the exit of the previous process depending on its exit status. Take the following example:

    // ./13-gzip_zeros.example.js
    
    var s = sh('dd if=/dev/zero count=10000 bs=50K')('gzip').file('zeros.gz');

    s.then('echo compression stopped');     // (1)
    s.or('echo compression failed');        // (2)
    s.and('echo compression succeeded');     // (3)
    
    // Output:
    10000+0 enregistrements lus
    10000+0 enregistrements écrits
    512000000 octets (512 MB) copiés, 4,00177 s, 128 MB/s
    compression stopped
    compression succeeded

That copies 500 million null bytes from `/dev/zero` and `gzip`s them to `zeros.gz`.

- Line (1): the `.then()` method prints "compression stopped" as soon as gzip exits.
- Line (2): the `.or()` method prints "compression failed" as soon as gzip exits *and* if gzip returns a status not equal to zero.
- Line (2): the `.and()` method prints "compression succeeded" as soon as gzip exits *and* if gzip returns a status of `0`.

Bash equivalent:

    dd if=/dev/zero count=10000 bs=50K | gzip > zeros.gz
    
    status=$?
    
    echo compression stopped
    test $status || echo compression failed
    test $status && echo compression succeeded

`.and()`, `.or()` and `.then()` all accept functions as arguments, so you can run Javascript instead of a program:

    // ./14-callback.example.js
    
    sh('sleep 2').and(function() {
      console.log('woke up!');
    });

### Setting the environment: `.cd()` and `.define()`

If you want to run commands in a particular directory, call `.cd()` before them in a sequence:

    // ./15-ls_cd_ls.example.js
    
    sh('ls -l')
    .and.cd('..')
    .and('ls -l');

Pay attention on how to call `.cd()`. Here we call it as a method of `.and`.

You may also use it as a method of `.or`, `.then` or `sh` like below:

    sh('ls -l').or.cd('..').and('ls -l');
    sh('ls -l').then.cd('..').and('ls -l');
    sh.cd('..').and('ls -l');

Now if you want to set an environment variable, here's how:

    // ./16-grep_my_var.example.js
    
    sh.define('MY_VAR', 123).and('env')('grep MY_VAR');

You may also set several variables in one call:

    // ./17-grep_my_vars.example.js
    
    sh.define({
      'MY_VAR1': 123,
      'MY_VAR2': 'abc'
    })
    .and('env')('grep MY_VAR');

Finally, to unset a variable, just set it to `sh.UNSET`:

    // ./18-unset_my_var.example.js
    
    sh.define('MY_VAR', 123)
    .and.define('MY_VAR', sh.UNSET)
    .and('env')('grep MY_VAR');

By the way, once you `cd` to a directory or set environment variable, you can store the shell in a Javascript variable, and reuse it later:

    // ./19-unset_my_var.example.js
    
    var sh1 = sh.cd('/').and;
    var sh2 = sh.cd('/var').and;

    sh1('ls');
    sh2('ls');

Don't forget the `.and` however.

There is a restriction in that `.cd()` or `.define()` cannot be in a pipeline like so:

    // this doesn't work for now
    sh.cd('abcd').file('/dev/null').and('ls -l');

I hope that will work soon.

### Advanced piping and redirecting

<b>Note</b>: the main challenge of making sh.js was to find the right syntax. Suggestions are welcome.

On the one hand, a process has three standard streams and you may want to start several processes upon its exit. On the other hand, Javascript doesn't have lots of idioms to embed such syntax.

We're trying to reproduce the following Bash command (this uses process substitution which is not part of the standard):

    ls / non_existent_file \
      2> >( sed s/non_existent/NON_EXISTENT/ ) \
      > >( grep etc )

So I've found four ways that I believe do make sense, three of which are implemented so far.
-   chaining
-   variables
-   closures
-   arguments

#### 1. Chaining

If you want to pipe both stdout and stderr, you may use `.pipe()` and `.err()`:

    // ./20-chaining_pipes.example.js
    
    sh('ls / non_existent_file')
      .pipe('grep etc')
      .err('sed s/non_existent/NON_EXISTENT/');

    // Output
    etc
    ls: ne peut accéder NON_EXISTENT_file: Aucun fichier ou dossier de ce type

Pros:
-   chaining is probably as natural as you can get in Javascript.
Cons:
-   piping several levels of commands may feel awkward because `.pipe()` and `.err()` are a syntax of their own.

#### 2. Variables

By declaring a variable, you can make several method calls on the first command:

    // ./21-pipes_with_variables.example.js
    
    var l = sh('ls / non_existent_file');
    
    l('grep etc');
    l.e('sed s/non_existent/NON_EXISTENT/');

Pros:
-   variables are native to Javascript programmers
Cons:
-   it quickly gets messy

#### 3. Closures

Passing a closure after the command string will run it and identify the piping:

    // ./22-pipes_in_closures.example.js
    
    sh('ls / non_existent_file', function(l) {
      l.out('grep etc');
      l.err('sed s/non_existent/NON_EXISTENT/');
    });
    
Pros:
-   it doesn't clobber the variable namespace
Cons:
-   more syntactic noise
-   it still feels messy

#### 4. Arguments

I thought of this one only recently, so I haven't implemented it yet, but I believe it's very feasible:

    // not implemented yet
    
    sh('ls / non_existent_file',
      sh.out('grep etc'),
      sh.err('sed s/non_existent/NON_EXISTENT/')
    );

Pros:
-   no need for a throw-away variable
-   nearly as natural as chaining
-   will be very nice in [CoffeeScript](http://jashkenas.github.com/coffee-script/), except for the `sh.`:

    sh 'ls / non_existent_file',
      sh.out 'grep etc'
      sh.err 'sed s/non_existent/NON_EXISTENT/'

Cons:
-   there is still noise

### Random tricks

#### cache result
In Bash, you frequently use several variables before you run a command:

    var1=`echo hello`
    var2=`echo world`
    var3=`echo and`
    var4=`echo universe`
    
    echo $var1 $var2 $var3 $var4

To avoid having too many recursive callbacks, sh.js has the `.cache` property:

    // ./23-cache_result.example.js

    sh('echo hello').cache
    .and('echo world').cache
    .and('echo and').cache
    .and('echo universe').result(function(var1, var2, var3, var4) {
      sh('echo '+var1+' '+var2+' '+var3+' '+var4);
    });

`.cache` is hooked with a getter so sh.js interprets it as "cache the output of the previous command and give it back when I call `.result()`".

#### Output Only

If you want to redirect stderr to stdout, like with `&>` or `|&` in traditional shells, pass `sh.OO` after the command:

    sh('./configure', sh.OO).file('output+errors');

That's double-capital-O, as in "Output Only".

`sh.OO` must come before a closure if you use one:

    sh('./configure', sh.OO, function(c) {
      c.and('echo configure succeeded');
      c.or('echo configure failed');
    }).file('output+errors');

### Conclusion

That tutorial covered mostly everything. This is a work in progress. Every piece of feedback will be greatly appreciated (use my email in `git log`).

License
-------

Copyright 2010 Guillaume Tuton
    
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>
