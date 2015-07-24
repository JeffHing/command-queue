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
    - [Asynchronous Execution](#Asynchronous-execution)
    - [Parallel Execution](#Parallel-execution)
    - [Batched Execution](#Batched-execution)
    - [Nested Execution](#Nested-execution)
    - [Run](#run)
    - [Run Command Customization](#run-command-customization)

## Features

* Flexible combinations of synchronous and asynchronous execution.
* Fully customize how a command is executed.

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
    .async(
        'command B1',
        'command B2',
        'command B3'
    )
    .async(
        'command C1',
        'command C2',
        'command C3'
    )
    .run();
```

### Nested Execution

CommandQueue can accept itself as a command.

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

The `.run()` method returns a 
[deferred](https://www.npmjs.com/package/deferred) promise which is resolved
when all the commands have completed. 

```javascript
new CommandQueue()
    .sync('command 1')
    .run()
    .then(
        function() {
            console.log('done');
        },
        function() {
            console.log('failed');
        }
    );
```    

### Run Command Customization

How a command is run, is fully customizable by replacing or overriding
the `CommandQueue.prototype.runCommand()` method with your own method.

Here is the default method:

```javascript
/*
 * Runs a command. This function is intended to be replaceable to customize
 * the child creation process.
 *
 * @param {string|object} cmd The user provided command to run.
 * @param {'sync'|'async'|'parallel'} runType
 * @returns {object} The child process.
 */
CommandQueue.prototype.runCommand = function(cmd, runType) {
    var args = parse(cmd);
    var filename = args.shift();

    var childProcess = spawn(filename, args, {
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
queue.runCommand = function(cmd, runType) {
    ...
};
```

By replacing the `runCommand()` method, you can also change what types of 
user arguments are supported by the `.async()`, `sync()`, 
and `.parallel()` methods.

For example:

```javascript
var queue = new CommandQueue();

queue.runCommand = function(cmd, runType) {
    console.log('runType: ' + cmd.message);
    var childProcess =  exec(cmd.nodeCmd, ...);
    return childProcess;
};

queue
    .sync({
        message: 'hello',
        nodeCmd: 'node foobar.js'
    })
    .run();

```
