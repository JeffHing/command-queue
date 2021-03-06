<!-- Copyright 2015. Author: Jeffrey Hing. All Rights Reserved. MIT License -->  

# CommandQueue

CommandQueue provides a flexible API for executing groups of
commands synchronously or asynchronously. It was originally created to
provide an alternative to using the
[scripts](https://docs.npmjs.com/misc/scripts)
field in package.json for
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
    - [Nested Execution](#nested-execution)
    - [Batched Execution](#batched-execution)
    - [Run](#run)
    - [Close](#close)
    - [Posix or Win32](#posix-or-win32)
    - [Run Command Customization](#run-command-customization)

## Features

* Supports different combinations of synchronous and asynchronous
command execution.
* Allows full customization of [child_process](https://nodejs.org/api/child_process.html#child_process_asynchronous_process_creation) parameters for executing a command.

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
// Update the PATH if necessary.
process.env.PATH += ':./node_modules/.bin';

new CommandQueue()
    .sync(
        'rimraf dist/',
        'mkdir dist/'
    )
    .run();
```

### Asynchronous Execution

To specify the commands to run asynchronously, use the `.async()` method:

```javascript
new CommandQueue()
    .async(
        'karma start',
        'webpack-dev-server --hot'
    )
    .run();
```

### Parallel Execution

To specify the commands to run in parallel, use the `.parallel()` method:

```javascript
new CommandQueue()
    .parallel(
        'karma start',
        'webpack-dev-server --hot'
    )
    .run();
```

Parallel execution runs the commands asynchronously, but if one fails,
the remaining commands are terminated using SIGTERM.

**Note:** This functionality is inspired by [Parallel Shell](https://www.npmjs.com/package/parallelshell).

### Nested Execution

CommandQueue itself can be used as a command:

```javascript
new CommandQueue()
    .sync(
        'command B1',
        new CommandQueue().async(
            'command B2a',
            'command B2b',
            'command B2c' 
        ),
        'command B3'
    )
    .run();
```

### Batched Execution

Each call to an `.async()`, `.sync()`, or `.parallel()` method creates a
new batch of commands. CommandQueue waits for the current batch of commands
to complete before executing the next batch of commands.

In the following example, CommandQueue waits for the A commands to complete
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

### Run

To start command execution, use the `.run()` method. The `.run()` method 
returns a [deferred](https://www.npmjs.com/package/deferred) promise which
is resolved when the commands have completed or a command has terminated with 
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

To terminate currently running commands, use the `.close()` method. It will send
a SIGTERM to those commands.


```javascript
var queue = new CommandQueue();

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

To customize how a command is run, replace or override the
`CommandQueue.prototype.runCommand()` method.

Here is the default method:

```javascript
/*
 * Runs a command. This function is intended to be user replaceable
 * to allow customization of the child creation process.
 *
 * @param {string} cmd The user provided command to run.
 * @param {string} shell The shell commmand.
 * @param {string} shellFlag The shell flag.
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

By customizing the `runCommand()` method, you can also change the types of 
user arguments that can be passed into the `.async()`, `.sync()`, 
and `.parallel()` methods.

The following example shows how the `runCommand()` method is changed to
accept a command that is an object rather than a string,
and how the `.sync()` method can now be passed such an object.

```javascript
var queue = new CommandQueue();

queue.runCommand = function(cmd, shell, shellFlag, runType) {
    console.log(runType + ':' + cmd.message);
    
    var args = [shellFlag, cmd.nodeCmd];
    
    var childProcess =  spawn(shell, args, ...);
    
    ...
};

queue.sync({
    message: 'hello',
    nodeCmd: 'node foobar.js'
});

queue.run();
```
