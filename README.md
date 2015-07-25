<!-- Copyright 2015. Author: Jeffrey Hing. All Rights Reserved. MIT License -->  

# CommandQueue

CommandQueue provides a programmatic API for executing groups of
commands synchronously or asynchronously. It was originally created to
provide an alternative to using the "scripts" object in package.json for 
executing commands. By using CommandQueue, you can easily execute 
commands from a JavaScript file instead, which is better suited for 
managing complex build steps.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
    - [Synchronous Execution](#synchronous-execution)
    - [Asynchronous Execution](#asynchronous-execution)
    - [Parallel Execution](#parallel-execution)
    - [Batched Execution](#batched-execution)
    - [Nested Execution](#nested-execution)
    - [Run](#run)
    - [Close](#close)
    - [Posix or Win32](#posix-or-win32)
    - [Run Command Customization](#run-command-customization)

## Features

* Flexible combinations of synchronous and asynchronous command execution.
* Full customization of the function used to execute each command.

## Installation

To install the package:

    npm install command-queue
    
To require the package:    

```javascript
var CommandQueue = require("command-queue");
```    
## Usage

### Synchronous Execution

To specify the commands to run synchronously, use the `.sync()` method:

```javascript
// Update your PATH if necessary.
process.env.PATH += './node_modules/.bin';

new CommandQueue()
    .sync(
        'rimraf dist/'
        `mkdir dist/'
    )
    .run();
```

### Asynchronous Execution

To specify the commands to run asynchronously, use the `.async()` method:

```javascript
new CommandQueue()
    .async(
        'karma start'
        `webpack-dev-server --hot'
    )
    .run();
```

### Parallel Execution

Parallel execution runs the commands asynchronously, but if one fails,
the remaining commands are terminated using SIGINT.

To specify the commands to run in parallel, use the `.parallel()` method:

```javascript
new CommandQueue()
    .parallel(
        'karma start'
        `webpack-dev-server --hot'
    )
    .run();
```

**Note:** This functionality is inpsired by [Parallel Shell](https://www.npmjs.com/package/parallelshell).

### Batched Execution

CommandQueue batches the execution of commands by waiting for the current set 
of commands to complete before executing the next set of commands.

In this example, CommandQueue waits for the A commands to complete
before executing the B commands, and waits for the B commands to complete
before executing the C commands.

```javascript
new CommandQueue()
    .async(
        'command A1',
        'command A2',
        'command A3'
    )
    .parallel(
        'command B1',
        'command B2',
        'command B3'
    )
    .sync(
        'command C1',
        'command C2',
        'command C3'
    )
    .run();
```

### Nested Execution

CommandQueue itself can be used as a command:

```javascript
new CommandQueue()
    .sync(
        'command B1',
        new CommandQueue().parallel(
            'command B2a' 
            'command B2b' 
            'command B2c' 
        ),
        'command B3'
    )
    .run();
```

### Run

To start command execution, use the `.run()` method. The `.run()` method 
returns a [deferred](https://www.npmjs.com/package/deferred) promise which
is resolved when the commands have completed, or a command has terminated with 
an error.

```javascript
new CommandQueue()
    .sync('command 1')
    .run()
    .then(
        function() {
            console.log('done');
        },
        function() {
            console.log('a command failed');
        }
    );
```    

### Close

To terminate any remaining commands, use the `.close()` method. It will send
a SIGINT to those commands.

var queue = new CommandQueue();

```javascript
queue
    .async(
        'command 1',
        'command 2',
        'command 3'
    )
    .run()
    .then(    
        function() {
            console.log('success');
        },
        function() {
            console.log('failure');
            
            // Close any remaining commands.
            queue.close();
        }
    );
```

### Posix or Win32

By default CommandQueue will detect the current platform and use the appropriate
shell for executing the commands. However, you can force CommandQueue to use
a specific platform's shell by using either the `.posix()` method, or 
the `.win32()` method.

```javascript
new CommandQueue()
    .posix()
    .sync(...)    
    .run();    
```

```javascript
new CommandQueue()
    .win32()
    .sync(...)    
    .run();    
```

### Run Command Customization

To customize how a command is run, replace or overide the
`CommandQueue.prototype.runCommand()` method.

Here is the default method:

```javascript
/*
 * Runs a command. This function is intended to be user replaceable
 * to allow customization of the child creation process.
 *
 * @param {string|object} cmd The user provided command to run.
 * @param {string} shell The shell commmand
 * @param {string} shellFlag The shell flag
 * @param {'sync'|'async'|'parallel'} runType
 * @returns {object} The child process.
 */
CommandQueue.prototype.runCommand = function(cmd, shell, shellFlag, runType) {
    var args = [shellFlag, cmd];

    var childProcess = spawn(shell, args, {
        cwd: process.cwd,
        env: process.env,
        stdio: ['pipe', process.stdout, process.stderr]
    });

    return childProcess;
};
```

To customize how a command is run per instance, override the
existing runCommand() method:

```javascript
var queue = new CommandQueue();
queue.runCommand = function(cmd, shell, shellFlag, runType) {
    ...
};
```

By replacing the `runCommand()` method, you can also change what types of 
user arguments are supported by the `.async()`, `sync()`, 
and `.parallel()` methods.

The following example shows how you can change the `runCommand()` to
accept a `cmd` as an object with various properties instead of a string:

```javascript
var queue = new CommandQueue();

queue.runCommand = function(cmd, shell, shellFlag, runType) {
    console.log(runType + ':' + cmd.message);
    
    var args = [shellFlag, cmd.nodeCmd];
    
    var childProcess =  spawn(shell, args, ...);
    
    ...
};

queue
    .sync({
        message: 'hello',
        nodeCmd: 'node foobar.js'
    })
    .run();

```