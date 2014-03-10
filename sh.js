(function() {

var fs = require('fs');
var spawn = require('child_process').spawn;
var joinPaths = require('path').join;
var linkjs = require('./link.js');
var parser = require('./command_parser.js').parser;

var
  // Types of commands
  CMD_TYPE = 'CMD_TYPE',
  CACHE_TYPE = 'CACHE_TYPE',
  ENV_TYPE = 'ENV_TYPE',
  FD_TYPE = 'FD_TYPE',
  FOR_EACH_TYPE = 'FOR_EACH_TYPE',
  FORK_TYPE = 'FORK_TYPE',
  FUNC_TYPE = 'FUNC_TYPE',
  PATH_TYPE = 'PATH_TYPE',
  TRANSIENT_TYPE = 'TRANSIENT_TYPE',
  
  MAX_CACHE_SIZE = 2 * 1 << 20,
  
  THEN = 'THEN',
  AND = 'AND',
  OR = 'OR',
  
  OUT = 'out',
  ERR = 'err',
  
  forEachDelimiter = new RegExp('\\s+', 'g');

/*
 *  Representation alike the current working directory of a process; it will be
 *  inherited by commands chained after calling `sh.cd`
 */
function WorkingDir(arg0) {
  if (arg0 instanceof WorkingDir)
    this.previousDir = arg0;
  else if (typeof arg0 === 'string')
    this.path = arg0;
  else {
    console.log(arg0);
    throw new Error('internal error: bad argument for WorkingDir, got:' + arg0);
  }
}

WorkingDir.prototype = {
  check: function(callback) {
    var that = this;
    
    fs.realpath(this.path, function(err, path) {
      if (err === null) {
      
        fs.lstat(path, function(err, stat) {
          if (err === null) {
          
            if (stat.isDirectory()) {
              this.path = path;
              callback(0);
              
            } else
              callback(1);
              
          } else {
            console.log(err);
            throw new Error('internal errror: unknown error calling fs.lstat()');
            
          }
        });
        
      } else if (err && err.errno === 2)
        callback(2);
        
      else
        throw new Error('internal error: got error' + err);
    });
    
  },
  
  getPath: function() {
    var pDir = this;
    while (pDir) {
      if (pDir.path)
        return pDir.path;
      pDir = pDir.previousDir;
    }
    
    throw new Error('this WorkingDir has neither a path nor a previousDir which'
      + ' has one');
  }
}

/*
 *  Representation modeled after the environment of processes; you can export
 *  environment variables and chained commands will have them in their own
 *  environment
 */
function WorkingEnv(arg0) {
  if (arg0 instanceof WorkingEnv)
    this.previousEnv = arg0;
  else if (typeof arg0 === 'object') {
    this.vars = copyEnv(arg0);
  } else {
    console.log(arg0);
    throw new Error('internal error: bad argument for WorkingEnv, got:' + arg0);
  }
}

WorkingEnv.prototype = {
  getEnv: function() {
    var pEnv = this;
    while (pEnv) {
      if (pEnv.vars) {
        return pEnv.vars;
      }
      pEnv = pEnv.previousEnv;
    }
    
    throw new Error('this WorkingEnv has neither vars nor a previousEnv which'
      + ' has some');
  }
}

var
  defaultCwd = new WorkingDir(process.cwd());
  defaultEnv = new WorkingEnv(process.env);

/*
 *  Check the type provided is consistent with the property name.
 *  ex: sh('root command').file('we_are_working_on_this_link')
 *      Here the property name is 'file', therefore the type of the working
 *      command can be either FD_TYPE or PATH_TYPE
 *      So the canBe function may be used to determine wether the argument
 *      'we_are_working_on_this_link' is a unix command or a file name
 */
function canBe(type) {
  switch (this.propertyName) {
  case 'cache':
  case 'result':
    if (type === CACHE_TYPE) return true;
    return false;
  case 'file':
  case 'append':
    switch (type) {
    case FD_TYPE:
    case PATH_TYPE:
      return true;
    default:
      return false;
    }
  case 'define':
  case 'cd':
    if (type === ENV_TYPE) return true;
    return false;
  default:
    throw new Error('internal error: unlisted type: ' + type);
  }
}

/*
 *  Copy a Unix environment, by just copying the enumerable properties of an 
 *  object really
 */
function copyEnv(oldEnv) {
  var newEnv = {};
  for (var i in oldEnv) {
    newEnv[i] = oldEnv[i].toString();
  }
  return newEnv;
}

/*
 *  Plug the output or error streams of a process by setting the right file
 *  descriptors that process will be spawned with. For instance open Unix pipes
 *  to plug it with another process, or open a file to redirect the stream.
 */
function plug(s) {
  
  // Check s is 'out' or 'err' and capitalize it (to define camel case
  // member names)
  if (s === 'out') {
    var S = 'Out';
    var index = 1;
  } else if (s === 'err') {
    var S = 'Err';
    var index = 2;
  }
  else throw new Error('internal error: trying to plug ' + s
    + ' (neither out, nor err)');
  
  var c = this.cmd,
    that = this;
  if (typeof c[s] === 'object') {
  
    switch(c[s].type) {
    case CMD_TYPE:
      this.stdio[index] = 'pipe';
      this['close'+S] = true;
      
      c[s].in = {
        close: true,
        index: index,
        program: this
      };
      
      break;
    case FD_TYPE:
      this.stdio[index] = c[s].fd;
      if (c[s].close === true) this['close'+S] = true;
      
      break;
    case PATH_TYPE:
      if (c[s].append === true)
        var flags = 'a';
      
      else var flags = 'w'
      
      var waitingForStream = 'waitingFor'+S;
      
      var path = c[s].path;
      if (path.charAt(0) !== '/')
        // the path is relative, join it with the current directory
        path = joinPaths(c[s].cwd.getPath(), path);
      
      fs.open(path, flags, process.umask, function(err, fd) {
        if (err) {
          if (typeof c[s].onerror === 'function'
            && c[s].onerror(err) === false) {
            // there is an event handler and it returns false, meaning that it
            // doesn't want an error to be throw.
            // we need to close the FDs
            that[waitingForStream] = false;
            that.attemptAborting();
            return;
          } else {
            console.log(err)
            throw new Error('can\'t open file ' + c[s].path);
          }
        }
        that['close'+S] = true;
        that.stdio[index] = fd;
        that[waitingForStream] = false;
        that.attemptSpawning();
      });
      this[waitingForStream] = true;
      
      break;
    case CACHE_TYPE:
    case FOR_EACH_TYPE:
      this.stdio[index] = 'pipe';
      break;
    }
    
  } else if (c[s])
    throw new Error('internal error: c.' + s 
      + ' is defined but it\'s not an object');
}

function isString(v) {
  if (typeof v === 'string') return true;
  else return false;
}

/*
 *  Call the function pointed to by the callback in a CACHE_TYPE, only if
 *  all results are completely cached
 */
function attemptCallback() {
  if (this.args.every(isString)) {
    var st = this.func.apply(process, this.args) || 0;
    runExitCommands(this, st);
  }
}

/*
 *  Given a command or a result callback c, run commands contained in its
 *  exit array, depending on its exit status
 */
function runExitCommands(c, status) {
  var exit = c.exit;
  
  // We must not run exit commands from a cache type because, cache types don't
  // exit, only the associated callback may exit
  if (c.type === CACHE_TYPE)
    return;
    
  if (exit) {
    for (var i = 0, l = exit.length; i < l; i++) {
    
      if (exit[i].condition === AND && status === 0)
        runCommand(exit[i]);
        
      else if (exit[i].condition === OR && status !== 0
        || exit[i].condition === THEN)
        runCommand(exit[i], status);
    }
  }
}

/*
 *  Set the handlers to events emitted by a process. This is run after the
 *  process is spawned.
 */
function listen() {
  var 
    command = this.cmd,
    p = this.process,
    that = this;
    
  p.on('exit', function(status) {
    //console.log(command.cmd, 'exited with:', status);
    runExitCommands(command, status);
  });
  
  if (command.errToOut === true && command.out 
    && (command.out.type === CACHE_TYPE || command.out.type === FOR_EACH_TYPE)) {
    var
      stdout = p.stdout,
      stderr = p.stderr;
      
    throw new Error('redirecting errput to output is not implemented yet for'
      + ' .cache() / .result() and .each()');
    
    // TODO: pause, resume, setEncoding and ondata make sense but
    // destroy, onerror, onclose, onend don't
    // maybe we should directly add the feature to the child_process library
    
    // wrap the method of stdout so they callback their counterparts of stderr
    ['destroy', 'pause', 'resume', 'setEncoding'].forEach(function(methodName) {
      var method = stdout[methodName];
      stdout[method] = function() {
        stdout[method].apply(stdout, arguments);
        stderr[method].apply(stderr, arguments);
      };
    });
    
    // transfer events for stderr to stdout
  }
  
  var
    streams = ['out', 'err'],
    cmd = this.cmd;
  
  streams.forEach(function(s) {
    var stream = cmd[s];
    if (!stream)
      return;
    
    // XXX: what should we do on error events?
    switch(stream.type) {
    case CACHE_TYPE:
    
      var callback = stream.callback;
      
      p['std'+s].on('data', function(data) {
        callback.cacheSize += data.length;
        callback.args[stream.argPosition].push(data);
        
        if (callback.cacheSize > MAX_CACHE_SIZE)
          throw new Error('cache is full (' + callback.cacheSize + ' bytes');
      });
      
      p['std'+s].on('close', function() {
        var
          bufs = callback.args[stream.argPosition],
          arg = '';
          
        for (var j = 0, l = bufs.length; j < l; j++) {
          arg += bufs[j].toString('utf8', 0, bufs[j].length);
        }
        
        callback.args[stream.argPosition] = arg;
        attemptCallback.call(callback);
      });
      
      break;
    case FOR_EACH_TYPE:
    
      var 
        callback = stream.func,
        input = '';
        
      p['std'+s].on('data', function(data) {
        input += data.toString('utf8', 0, data.length);
      });
      
      p.on('close', function() {
        var args = input.split(forEachDelimiter);
        
        for (var i = 0, l = args.length; i < l; i++) {
          if (args[i] === '')
            continue;
          callback(args[i]);
        }
        
        // The standard says we should return the status of the last command of
        // the loop, or 0 if there were no items. Since .each() only runs
        // function callbacks, not shell commands, we'll always return 0
        runExitCommands(cmd[s], 0);
      });
      
      break;
    }
    
  });
}

function Program(cmd) {
  this.cmd = cmd;
  this.stdio = [0,1,2];

  // Bind the attemptSpawning method with this, because the function is meant to
  // be used as a callback
  var that = this;
  this.attemptSpawning = function() {
    if (!that.waitingForErr && !that.waitingForOut) that.spawn();
  };
  
  this.attemptAborting = function() {
    if (that.waitingForErr || that.waitingForOut)
      return;
    
    //console.log('aborting');
    if (that.closeIn) fs.close(that.stdio[0]);
    if (that.closeOut) fs.close(that.stdio[1]);
    if (that.closeErr) fs.close(that.stdio[2]);
  };

  if (cmd.in && cmd.in.program) {
    this.stdio[0] = 'pipe';
    if (cmd.in.close === true) {
      this.closeIn = true;
    }
  }

  plug.call(this, 'out');
  plug.call(this, 'err');

  if (cmd.errToOut === true && ! (typeof cmd.err === 'undefined'))
    throw new Error('internal error: parsed commands mean to redirect error'
      + ' stream to output stream and to something else');

  // this will spawn the process unless we're waiting for a file to open
  this.attemptSpawning();
}

Program.prototype = {
  spawn: function() {
    if (this.cmd.errToOut === true)
      this.stdio[2] = this.stdio[1];
    
    var cmd = this.cmd.cmd;
    if (cmd instanceof Array) {
      var argv = [];
      
      for (var i = 0, l = cmd.length; i < l; i++)
        argv.push(cmd[i]);
        
    } else
      var argv = parser.parse(this.cmd.cmd);
    
    var executable = argv.shift();
    
    var options = {
      stdio: this.stdio,
      env: this.cmd.env.getEnv(),
      cwd: this.cmd.cwd.getPath(),
      closeFds: true,
    };
    this.process = spawn(executable, argv, options);
    
    // pipe streams
    var cmdIn = this.cmd.in;
    if (cmdIn && cmdIn.program) {
      var that = this;
      /* onend handler to end the stdin stream on a process */
      function onpipeend() {
        pipesToEnd--;
        if (pipesToEnd === 0)
          // all streams piped to stdin have ended
          that.process.stdin.end();
      }
      var pipesToEnd = 0;
      if (cmdIn.index === 1) {
        pipesToEnd++;
        // pipe stdout from upstream to this stdin; don't end stdin when stdout
        // ends, because stderr may still be writing data to stdin; use
        // onpipeend to decide when to end stdin
        cmdIn.program.process.stdout.pipe(this.process.stdin, { end: false });
        cmdIn.program.process.stdout.on('end', onpipeend)
      }
      if (cmdIn.index === 2
        // the upstream program writes stderr on stdout, so we need to pipe it
        // to this stdin too
        || cmdIn.program.cmd.errToOut === true) {
        pipesToEnd++;
        cmdIn.program.process.stderr.pipe(this.process.stdin, { end: false });
        cmdIn.program.process.stderr.on('end', onpipeend)
      }
    }
    
    // close fds
    if (this.closeIn && typeof this.stdio[0] === 'number') fs.close(this.stdio[0]);
    if (this.closeOut && typeof this.stdio[1] === 'number') fs.close(this.stdio[1]);
    if (this.closeErr && typeof this.stdio[2] === 'number') fs.close(this.stdio[2]);
    
    // spawn out and err streams
    if (this.cmd.out) runCommand(this.cmd.out);
    if (this.cmd.err) runCommand(this.cmd.err)
    
    listen.call(this);
  }
};

function runCommand(c, status) {
  c.hasRun = true;
  switch(c.type) {
  case CMD_TYPE:
    new Program(c);
    break;
  case FUNC_TYPE:
    var st = c.func.call({status: status}) || 0;
    runExitCommands(c, st);
    break;
  case CACHE_TYPE:
    break;
  case FOR_EACH_TYPE:
    break;
  case ENV_TYPE:
    //console.log(c);
    if (c.nextDir) {
      if (c.nextDir[0] === '/')
        c.cwd.path = c.nextDir;
      else
        c.cwd.path = joinPaths(c.cwd.previousDir.getPath(), c.nextDir);
      //console.log('checking new cwd:', c.cwd);
      c.cwd.check(function(st) {
        //console.log('checked new cwd:'); console.log(c.cwd);
        switch (st) {
        case 0:
          runExitCommands(c, 0);
          
          break;
        case 1:
          console.log('.cd():', c.cwd, ' is not a directory');
          runExitCommands(c, 1);
          
          break;
        case 2:
          console.log('.cd(): no such directory: ', c.cwd.getPath());
          runExitCommands(c, 1);
          
          break;
        default:
          throw new Error('internal error: got st: ' + st);
        }
      });
      
    } else if (c.args) {
      var
        args = c.args,
        arg0 = args[0],
        arg1 = args[1];
        
      if (arg0 === sh.ENV && typeof arg1 === 'object')
        c.env.vars = copyEnv(arg1);
      else {
        var vars = c.env.vars = copyEnv(c.env.getEnv());
          
        if (typeof arg0 === 'string' && arg1 === sh.UNSET) {
          delete vars[arg0];
          
        } else if (typeof arg0 === 'object') {
          var count = 0, arg;
          
          for (var i in arg0) {
            count++;
            arg = arg0[i];
            
            if (arg === sh.UNSET)
              delete vars[i];
            else
              vars[i] = arg.toString();
          }
          
          if (count === 0)
            throw new Error('bad argument: the argument has no (enumerable) '
              + 'properties');
            
        } else if (typeof arg0 === 'string') {
          vars[arg0] = arg1.toString();
          
        } else
          throw new Error('bad argument: .define() got: (' + arg0 + ', ' + arg1
            + ')');
      }
      
      runExitCommands(c, 0);
    } else
      throw new Error('internal error: neither a .cd(), nor a .define()');
    
    break;
  case FORK_TYPE:
    var b = c.branches;
    
    if (b instanceof Array) {
      var l = b.length;
      for (var i = 0 ; i < l ; i++) {
        runCommand(b[i], status);
      }
    } else throw new Error('internal error: an array called branches is meant'
      + ' to be here');
    
    break;
  case TRANSIENT_TYPE:
    throw new Error('internal error: ' + c.type + ' is not meant to be run');
  case FD_TYPE:
  case PATH_TYPE:
    // nothing to do
    break;
  default:
    throw new Error('invalid type ' + c.type + ' for command');
  }
}

function linkCtor() {
  var parent = this.parentState;
  var that = this;
  var prop = this.propertyName;
  //console.log('this link before:');
  //console.log(this);
  if (parent === undefined && prop !== 'cd'
    && prop !== 'define' && prop !== undefined) {
    // This case is for branches of commands passed as arguments:
    // sh('cmd',
    //   sh.out('cmd1')('cmd11'),
    //   sh.or('cmd2')
    // );
    
    this.workingCommand = {
      env: new WorkingEnv(defaultEnv),
      cwd: new WorkingDir(defaultCwd)
    };
    
  } else if (parent && parent.workingCommand.type === TRANSIENT_TYPE) {
    // typically the parent is a .err, .e, .pipe or .out link
    // and in this step, the link is an invocation
    this.workingCommand = parent.workingCommand;
    this.parentState = parent.parentState;
    //console.log('replacing state with the previous one');
    
  } else if (parent && parent.workingCommand.type === FORK_TYPE 
    && parent.workingCommand.hasRun || parent === undefined) {
    // This accounts for the root command or for the fork idiom below.
    //
    // The following is a fork, because sh1 may be called several times
    // var sh1 = sh.cd('/').and;
    // After that command is run, calls to sh1 won't be run unless we schedule
    // them for the next tick manually, as if they were a root.
    // But unlike a root, they shall inherit the environment and the current
    // directory from their parent.
    
    process.nextTick((function() {
      var cb = parseCallback;
      parseCallback = null;
      return function() {
        if (typeof cb === 'function') {
          cb(that.workingCommand);
          return;
        }
        
        // FIXME: check the condition (and, or, then) and the status
        runCommand(that.workingCommand);
      }
    })());
    
    if (parent)
      this.workingCommand = {
        env: parent.workingCommand.env,
        cwd: parent.workingCommand.cwd
      };
    
    else {
      // we're at the root
      this.workingCommand = {
        // To ease debugging, the sh.EMPTY_ENV may be set so the environment
        // doesn't clutter the console
        env: sh.EMPTY_ENV ? new WorkingEnv({}) : defaultEnv,
        cwd: defaultCwd
      };
      
      this.cacheCommands = [];
    }
    
  } else if (parent && parent.workingCommand && parent.workingCommand.hasRun) {
    throw new Error('bad syntax: cannot continue this command after it has '
      + 'run');
  } else if (parent) {
  
    this.workingCommand = {
      env: parent.workingCommand.env,
      cwd: parent.workingCommand.cwd
    };
  }
  //console.log('this link:');
  //console.log(this);

}



function throwIfNoParent() {
  if (!this.parentState)
      throw new Error('bad syntax: you can\'t call ' + this.propertyName
        + ' without an upstream command');
}

function canStream() {
  if (this.type === CMD_TYPE) return true;
  return false;
}

function addExit() {
  var parent = this;;
  while (parent = parent.parentState) {
    var exit = parent.workingCommand.exit;
    
    if (exit) {
      exit.push(this.workingCommand);
      //console.log('adding exit for:');
      //console.log(parent.workingCommand);
      return;
      
    } else if (parent.workingCommand.branches)
      throw new Error('bad syntax: it seems there lacks a command after ".'
        + parent.propertyName + ' that ".' + this.propertyName + '" can listen');
        
  }
  
  throw new Error('internal error: could not find a command whose exit event '
    + 'can be listened to');
}

function throwIfParentCantStream() {
  if (! canStream.call(this.parentState.workingCommand))
    throw new Error('bad syntax: trying to call ' + this.propertyName
      + ' on something that does not stream an output');
}

function getCacheCommands() {
  var parent = this;
  while (parent = parent.parentState) {
    if (parent.cacheCommands)
      return parent.cacheCommands;
  }
  throw new Error('internal error: could not get the list of cache commands');
}

function plugWithParentStream(s) {
    var parent = this.parentState;

    throwIfParentCantStream.call(this);
    
    if (parent.workingCommand[s]) {
      throw new Error('bad syntax: the parent command\'s ' + s + 'put stream '
        + 'is already plugged');
    }
    
    parent.workingCommand[s] = this.workingCommand;
}

function getRoot(link) {
  var parent = link(STATE_ACCESSOR_TOKEN);
  var i = 100;
  while (parent.parentState && i--) {
    parent = parent.parentState;
  }
  return parent;
}

function mainGet() {
  var
    parent = this.parentState,
    command = this.workingCommand;
  
  switch (this.propertyName) {
  case 'out':
    
    if (parent === undefined)
      // this is a branch meant to be an argument, the parent is supposed to
      // plug to this command when processing arguments
      command.stream = OUT;
    else if (parent.workingCommand.out !== command) {
      var ancestor = parent;
      while(true) {
      
        var ancestorCommand = ancestor.workingCommand;
        
        if (canStream.call(ancestorCommand)
          && (ancestorCommand.out === null
          || !ancestor.parentState && !ancestorCommand.out)) {
          
          ancestorCommand.out = command;
          break
        }
      
        ancestor = ancestor.parentState;
        
        if (!ancestor)
          // we went up to the root without finding an available output stream
          throw new Error('bad syntax: there is no command whose output stream'
            + ' can be plugged with');
      }
    }
    
    command.type = TRANSIENT_TYPE;
    
    break;
  case 'err':
    //console.log('getting err');
    //console.log(this);
    
    if (parent === undefined) {
      // this is a branch meant to be an argument, the parent is supposed to
      // plug to this command when processing arguments
      command.stream = ERR;
    } else {
      var ancestor = parent;
      while(true) {
      
        var ancestorCommand = ancestor.workingCommand;
        
        if (canStream.call(ancestorCommand)
          && (ancestorCommand.err === null
          || !ancestor.parentState && !ancestorCommand.err)) {
          
          ancestorCommand.err = command;
          break
        }
      
        ancestor = ancestor.parentState;
        
        if (!ancestor)
          // we went up to the root without finding an available error stream
          throw new Error('bad syntax: there is no command whose error stream'
            + ' can be plugged with');
      }
    }
    
    command.type = TRANSIENT_TYPE;
    
    break;
  case 'and':
    
    command.condition = AND;
    command.branches = [];
    command.type = FORK_TYPE;
    if (parent)
      addExit.call(this);
    
    break;
  case 'or':
    
    command.condition = OR;
    command.branches = [];
    command.type = FORK_TYPE;
    if (parent)
      addExit.call(this);
    
    break;
  case 'then':
    
    command.condition = THEN;
    command.branches = [];
    command.type = FORK_TYPE;
    if (parent)
      addExit.call(this);
    
    break;
  case 'cache':
    // plug the command with the direct parent
    // if it hasn't been plugged already
    if (command.type !== TRANSIENT_TYPE)
      plugWithParentStream.call(this, 'out');
    
    var cacheCommands = getCacheCommands.call(this);
    
    command.argPosition = cacheCommands.length;
    cacheCommands.push(command);
    command.type = CACHE_TYPE;
    
    break;
  }
}

function EnvCommand(arg0, arg1) {
  var
    prop = this.propertyName,
    command = this.workingCommand,
    parent = this.parentState;
    
  if (parent) {
    var parentCommand = parent.workingCommand;
    if (parentCommand.type === FORK_TYPE) {
      // "and", "or", "then" is the parent
      
      // if the parent has already run, the linkCtor has schedule the
      // command for the next tick
      if (! parentCommand.hasRun)
        parentCommand.branches.push(this.workingCommand);
    } else
      throw new Error('bad syntax: "' + prop + '" can only be called at the '
        + 'very beginning of the chain or after "and", "or" or "then"');
  }

  command.type = ENV_TYPE;
  command.exit = [];
  
  if (prop === 'cd')
    if (typeof arg0 === 'string') {
      command.cwd = new WorkingDir(command.cwd);
      command.nextDir = arg0;
      
    } else
      throw new Error('bad syntax: cd takes a string as its first argument');
  
  else if (prop === 'define') {
    command.env = new WorkingEnv(command.env);
    command.args = arguments;
  }
}

function FileCommand(arg0, arg1) {
  var
    prop = this.propertyName,
    command = this.workingCommand,
    parent = this.parentState;

  if (parent === undefined) {
    if (! command.stream)
      command.stream = OUT;

  } else if (command.type !== TRANSIENT_TYPE)
    // plug the command with the direct parent
    // if it hasn't been plugged already
    plugWithParentStream.call(this, 'out');

  if (typeof arg0 === 'string') {
    command.type = PATH_TYPE;
    command.path = arg0;
    
    if (typeof arg1 === 'function')
      command.onerror = arg1;
    else if (typeof arg1 !== 'undefined')
      throw new Error('bad syntax: 2nd argument must be a function, it\'s a:'
        + typeof arg1);
    
  } else if (typeof arg0 === 'number') {
    command.type = FD_TYPE;
    command.fd = arg0;
  } else
    throw new Error('bad syntax');
    
  if (prop === 'append')
    command.append = true;
}

// () and() e() err() or() out() pipe() then()
function GenericCommand(arg0, arg1, arg2, arg3) {
  //console.log('Begin GenericCommand()');
  var
    prop = this.propertyName,
    command = this.workingCommand,
    parent = this.parentState,
    proto = sh.__proto__;

  if (parent) {
    var 
      parentCommand = parent.workingCommand;
    if (parentCommand.type === FORK_TYPE) {
      // "and", "or", "then" is the parent
      
      // if the parent has already run, the linkCtor has schedule the
      // command for the next tick
      if (! parentCommand.hasRun) {
        parentCommand.branches.push(this.workingCommand);
        //console.log('adding a branch for:');
        //console.log(parentCommand);
      }
      
    } else {
      //console.log(parent);
      // plug the command with the direct parent
      // if it hasn't been plugged already
      if (command.type !== TRANSIENT_TYPE)
        plugWithParentStream.call(this, 'out');
    }

  } else {
    // We're at the root. We may be a branch argument so set the stream to OUT
    // if it's not ERR. If we not a branch argument, their is no reason yet why
    // this is going to be a problem to have a stream property.
    if (! command.stream)
      command.stream = OUT;
  }

  if (typeof arg0 === 'string' || arg0 instanceof Array) {
    command.cmd = arg0;
    command.type = CMD_TYPE;
    command.exit = [];
    
    if (arg1 === sh.OO) {
      command.errToOut = true;
      //console.log('err to out');
    } else if (typeof arg1 === 'object') {
      throw new Error('todo'); // TODO: var and maybe command substitution
    }
    
    if (arg1 !== sh.OO && arg2 === sh.OO) {
      command.errToOut = true;
    }
    
    // closureNumber takes note of which typeof === 'function' is true
    // so we know which argument to call
    var closureNumber = -1;
    if ((typeof arg1 === 'function' && arg1.__proto__ !== proto
      && (closureNumber = 1))
      || (typeof arg2 === 'function' && arg2.__proto__ !== proto
      && (closureNumber = 2))
      || (typeof arg3 === 'function' && arg3.__proto__ !== proto
      && (closureNumber = 3))) {
      
      if (this.parentState) {
        var hiddenParent = this.parentState;
        delete this.parentState;
      }
      
      var cc = this.cacheCommands = [];
      
      //command.out = null;
      //command.err = null;
      
      arguments[closureNumber].call(this.api);
      
      if (cc !== this.cacheCommands)
        throw new Error('internal error: the closure messed up the '
          + 'cacheCommands');
      else if (cc.length > 0)
        throw new Error('bad syntax: .cache was gotten without subsequent call '
          + 'to .result()');
      
      if (hiddenParent)
        this.parentState = hiddenParent;
      
      //if (command.out === null)
      //  delete command.out;
      //if (command.err === null)
      //  delete command.err;
    }
    
  } else if (typeof arg0 === 'function') {
    command.func = function() {
      var originEnv = defaultEnv, originCwd = defaultCwd;
      defaultEnv = command.env;
      defaultCwd = command.cwd;
      arg0.apply(this, arguments);
      defaultEnv = originEnv;
      defaultCwd = originCwd;
    };
    command.type = FUNC_TYPE;
    command.exit = [];
  } else
    throw new Error('todo');

  
  for (var i = 0, l = arguments.length; i < l; i++) {
    var argi = arguments[i];
    
    if (typeof argi !== 'function' || argi.__proto__ !== proto)
      continue;
    
    var root = getRoot(argi).workingCommand;
    
    // Put our working directory at the root of this branch so children will
    // us ours
    root.cwd.previousDir = command.cwd;
    root.env.previousEnv = command.env;
    
    switch(root.type) {
    case FORK_TYPE:
      command.exit.push(root);
      break;
    case PATH_TYPE:
    case FD_TYPE:
    case CACHE_TYPE:
    case CMD_TYPE:
      if (root.stream === OUT)
        command.out = root;
      else if (root.stream === ERR)
        command.err = root;
      else
        throw new Error('internal error: stream property is: ' + root.stream);

      break;
    default:
      throw new Error('bad syntax');
    }
  }
  
  //console.log('GenericCommand:');
  //console.log(this);


}

function EachCommand(arg0) {
  var
    prop = this.propertyName,
    command = this.workingCommand,
    parent = this.parentState,
    parentCommand = parent.workingCommand;
  
  throwIfNoParent.call(this);

  // plug the command with the direct parent
  // if it hasn't been plugged already
  if (command.type !== TRANSIENT_TYPE)
    plugWithParentStream.call(this, 'out');
  
  if (typeof arg0 === 'function') {
    command.type = FOR_EACH_TYPE;
    command.func = function() {
      var originEnv = defaultEnv, originCwd = defaultCwd;
      defaultEnv = command.env;
      defaultCwd = command.cwd;
      arg0.apply(this, arguments);
      defaultEnv = originEnv;
      defaultCwd = originCwd;
    };
    command.exit = [];
  } else
    throw new Error('bad syntax: each only takes a function as its arguments; '
      + typeof arg0 + ' given');
}

function ResultCommand(arg0) {
  var
    command = this.workingCommand,
    parent = this.parentState;
  
  if (parent === undefined) {
    if (! command.stream)
      command.stream = OUT;

  } else if (command.type !== TRANSIENT_TYPE)
    // plug the command with the direct parent
    // if it hasn't been plugged already
    plugWithParentStream.call(this, 'out');
  
  var cacheCommands = getCacheCommands.call(this);
  
  command.argPosition = cacheCommands.length;
  cacheCommands.push(command);
  command.type = CACHE_TYPE;
  // unlike .cache, .result exits so it makes sense to behave like a command
  command.exit = [];
  
  if (typeof arg0 === 'function') {
    var callback = {
      func: function() {
        var originEnv = defaultEnv, originCwd = defaultCwd;
        defaultEnv = command.env;
        defaultCwd = command.cwd;
        arg0.apply(this, arguments);
        defaultEnv = originEnv;
        defaultCwd = originCwd;
        runExitCommands(command, 0);
      },
      cacheSize: 0,
      args: [],
      argsReady: [],
      exit: command.exit
    };
    
    var
      args = callback.args, 
      argsReady = callback.argsReady, 
      l = cacheCommands.length;
    
    for (var i = 0; i < l; i++) {
      args.push([]);
      argsReady.push(false);
      cacheCommands.pop().callback = callback;
    }
    
  } else
    throw new Error('bad syntax: result only takes a function as its arguments; '
      + typeof arg0 + ' given');
}

STATE_ACCESSOR_TOKEN = ['private token to access the state of a link'];

var def = {
  invoke: GenericCommand,
  
  
  properties: {
    and: {
      get: mainGet,
      invoke: GenericCommand,
    },
    append: {
      invoke: FileCommand,
    },
    cache: {
      get: mainGet,
    },
    cd: {
      invoke: EnvCommand,
    },
    define: {
      invoke: EnvCommand,
    },
    each: {
      invoke: EachCommand,
    },
    err: {
      get: mainGet,
      invoke: GenericCommand,
    },
    file: {
      invoke: FileCommand,
    },
    or: {
      get: mainGet,
      invoke: GenericCommand,
    },
    out: {
      get: mainGet,
      invoke: GenericCommand,
    },
    result: {
      invoke: ResultCommand,
    },
    then: {
      get: mainGet,
      invoke: GenericCommand,
    },
  },
  linkCtor: linkCtor,
  STATE_ACCESSOR_TOKEN: STATE_ACCESSOR_TOKEN
};

var sh = linkjs.makeLib(def);
module.exports = sh;

sh.UNSET = ['unset environment variable'];
sh.ENV = ['define complete environment'];
sh.OO = ['redirect stdout and stderr to stdOut Only'];


var
  parseCallback = null,
  parseCommand = function(callback) {
    parseCallback = callback;
    return sh;
  };

sh._internal = {
  runCommand: runCommand,
  parseCommand: parseCommand,
  parser: parser
};

})();
