(function() {

var fs = require('fs');
var spawn = require('child_process').spawn;
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
  
  MAX_CACHE_SIZE = 2 * 1 << 20;
  
  THEN = 'THEN',
  AND = 'AND',
  OR = 'OR',
  
  forEachDelimiter = new RegExp('\\s+(?!$)', 'g'),
  endOfStream = new RegExp('\\s*$');

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
 *  descriptors that process will spawned with. For instance open Unix pipes
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
  if (c[s] === null) {
    // here, it likely is the case that the user got .pipe on a command
    // without redirecting both standard streams, so we just ignore it
  } else if (typeof c[s] === 'object') {
  
    switch(c[s].type) {
    case CMD_TYPE:
      var fds = process.binding('net').pipe();
      
      this.customFds[index] = fds[1];
      this['close'+S] = true;
      
      c[s].in = {
        close: true,
        fd: fds[0]
      };
      
      break;
    case FD_TYPE:
      this.customFds[index] = c[s].fd;
      if (c[s].close === true) this['close'+S] = true;
      
      break;
    case PATH_TYPE:
      if (c[s].append === true)
        var flags = 'a';
      
      else var flags = 'w'
      
      var waitingForStream = 'waitingFor'+S;
      
      fs.open(c[s].path, flags, process.umask, function(err, fd) {
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
        that.customFds[index] = fd;
        that[waitingForStream] = false;
        that.attemptSpawning();
      });
      this[waitingForStream] = true;
      
      break;
    case CACHE_TYPE:
    case FOR_EACH_TYPE:
      this.customFds[index] = -1;
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
    
  if (exit && exit.length) {
    for (var i in exit) {
    
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
      var method = sdtout[methodName];
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
      
      p.on('exit', function() {
        var
          bufs = callback.args[stream.argPosition],
          arg = '';
          
        for (var j in bufs) {
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
        var args = input.split(forEachDelimiter);
        while (args.hasOwnProperty(1)) {
          callback(args.shift());
        }
        input = args[0];
      });
      
      p.on('exit', function() {
        var repl = input.replace(endOfStream, '');
        if (input.length === 0) {
          // the process did not output anything, by convention, the exit
          // status is 1
          runExitCommands(cmd[s], 1);
          return;
        }
        callback(repl);
        // Regular situtation, therefore, the exit status is set to 0
        runExitCommands(cmd[s], 0);
      });
      
      break;
    }
    
  });
}

function Program(cmd) {
  this.cmd = cmd;
  this.customFds = [0,1,2];

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
    if (that.closeIn) fs.close(that.customFds[0]);
    if (that.closeOut) fs.close(that.customFds[1]);
    if (that.closeErr) fs.close(that.customFds[2]);
  };

  if (cmd.in && cmd.in.fd) {
    this.customFds[0] = cmd.in.fd;
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
      this.customFds[2] = this.customFds[1];
    
    var cmd = this.cmd.cmd;
    if (cmd instanceof Array) {
      var argv = [];
      
      for (var i in cmd)
        argv.push(cmd[i]);
        
    } else
      var argv = parser.parse(this.cmd.cmd);
    
    var executable = argv.shift();
    var options = {
      customFds: this.customFds,
      env: this.cmd.env,
      cwd: process.cwd(),
      closeFds: true,
    };
    //console.log(executable, argv);
    //console.log(options);
    this.process = spawn(executable, argv, options);
    
    // close fds
    if (this.closeIn) fs.close(this.customFds[0]);
    if (this.closeOut) fs.close(this.customFds[1]);
    if (this.closeErr) fs.close(this.customFds[2]);
    
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
    // FIXME: check cwd is valid, and provide an exit status accordingly
    runExitCommands(c, 0);
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
  //console.log('this link before:');
  //console.log(this);
  if (parent && parent.workingCommand.type === TRANSIENT_TYPE) {
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
        env: sh.EMPTY_ENV ? {} : process.env,
        cwd: process.cwd()
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

function mainGet() {
  var
    parent = this.parentState,
    command = this.workingCommand;
  
  switch (this.propertyName) {
  case 'pipe':
  
    throwIfNoParent.call(this);
    throwIfParentCantStream.call(this);
    
    var parentCommand = parent.workingCommand
    if (parentCommand.out || parentCommand.err)
      throw new Error('bad syntax: the upstream command is already plugged');

    // By default, plug this command to the parent's output.
    // If err is actually the next link, this must be reversed.
    parentCommand.out = command;
    parentCommand.err = null;
    
    command.type = TRANSIENT_TYPE;
    
    break;
  case 'out':
  
    throwIfNoParent.call(this);
    
    if (parent.workingCommand.out === command) {
      // we're all set
    } else {
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
    throwIfNoParent.call(this);
    
    if (parent.workingCommand.out === command) {
      // pipe has plugged this command to the parent's output,
      // we need to reverse it
      parent.workingCommand.out = null;
      parent.workingCommand.err = command;
      
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
  case 'e':
  
    throwIfNoParent.call(this);
    throwIfParentCantStream.call(this);
    
    if (parent.workingCommand.err) {
      throw new Error('bad syntax: the parent command\'s error stream '
        + 'is already plugged');
    }
    
    parent.workingCommand.err = command;
    
    command.type = TRANSIENT_TYPE;
    
    break;
  case 'and':
    
    command.condition = AND;
    command.branches = [];
    command.type = FORK_TYPE;
    addExit.call(this);
    
    break;
  case 'or':
    
    command.condition = OR;
    command.branches = [];
    command.type = FORK_TYPE;
    addExit.call(this);
    
    break;
  case 'then':
    
    command.condition = THEN;
    command.branches = [];
    command.type = FORK_TYPE;
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
    if (typeof arg0 === 'string')
      command.cwd = arg0;
    else
      throw new Error('bad syntax: cd takes a string as its first argument');
  
  else if (prop === 'define') {
    
    if (arg0 === sh.ENV && typeof arg1 === 'object')
      command.env = copyEnv(arg1);
    else {
      var newEnv = copyEnv(command.env);
        
      if (typeof arg0 === 'string' && arg1 === sh.UNSET) {
        delete newEnv[arg0];
        
      } else if (typeof arg0 === 'object') {
        var count = 0, arg;
        
        for (var i in arg0) {
          count++;
          arg = arg0[i];
          
          if (arg === sh.UNSET)
            delete newEnv[i];
          else
            newEnv[i] = arg.toString();
        }
        
        if (count === 0)
          throw new Error('bad argument: the argument has no (enumerable) '
            + 'properties');
          
      } else if (typeof arg0 === 'string') {
        newEnv[arg0] = arg1.toString();
        
      } else 
        throw new Error('bad argument: .define() got: (' + arg0 + ', ' + arg1
          + ')');
      command.env = newEnv;
    }
  }
}

function FileCommand(arg0, arg1) {
  var
    prop = this.propertyName,
    command = this.workingCommand;
  
  throwIfNoParent.call(this);

  // plug the command with the direct parent
  // if it hasn't been plugged already
  if (command.type !== TRANSIENT_TYPE)
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
    parent = this.parentState;
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
    // we're at the root
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
    if ((typeof arg1 === 'function' && (closureNumber = 1))
      || (typeof arg2 === 'function' && (closureNumber = 2))
      || (typeof arg3 === 'function' && (closureNumber = 3))) {
      if (this.parentState) {
        var hiddenParent = this.parentState;
        delete this.parentState;
      }
      
      var cc = this.cacheCommands = [];
      
      //command.out = null;
      //command.err = null;
      
      arguments[closureNumber](this.api);
      
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
    command.func = arg0;
    command.type = FUNC_TYPE;
    command.exit = [];
  } else
    throw new Error('todo');

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
    command.func = arg0;
    command.exit = [];
  } else
    throw new Error('bad syntax: each only takes a function as its arguments; '
      + typeof arg0 + ' given');
}

function ResultCommand(arg0) {
  var
    command = this.workingCommand;
  
  throwIfNoParent.call(this);

  // plug the command with the direct parent
  // if it hasn't been plugged already
  if (command.type !== TRANSIENT_TYPE)
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
        arg0.apply(this, arguments);
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
    e: {
      get: mainGet,
      invoke: GenericCommand,
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
    pipe: {
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
};

var sh = linkjs.makeLib(def);
exports.sh = sh;

sh.UNSET = ['unset environment variable'];
sh.ENV = ['define complete environment'];
sh.OO = ['redirect stdout and stderr to stdOut Only'];


var
  parseCallback = null,
  parseCommand = function(callback) {
    parseCallback = callback;
    return sh;
  };

exports._internal = {
  runCommand: runCommand,
  parseCommand: parseCommand,
  parser: parser
};

})();
