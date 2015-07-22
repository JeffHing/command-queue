<!-- Copyright 2015. Author: Jeffrey Hing. All Rights Reserved. MIT License -->  

# ShellCommand

ShellCommand provides a programmatic API for executing groups of shell commands synchronously or asynchronously. It was orginally created to migrate complex
build steps from the "scripts" object of a package.json file, to a JavaScript
file where execution flow can be more easily managed.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
    - [Path](#path)
    - [Synchronous Execution](#synchronous-execution)
    - [Asynchronous Execution](#Asynchronous-execution)
    - [Parallel Execution](#Parallel-execution)
    - [Batched Execution](#Batched-execution)
    - [Nested Execution](#Nested-execution)

## Features

* Supports any combination of synchronous and asynchronous execution.
* Supports [Parallel Shell](https://www.npmjs.com/package/parallelshell).

## Installation

To install the package:

    npm install shell-command
    
To require the package:    

```javascript
var ShellCommand = require("shell-command");
```    
## Usage

### Path

By default, all commands are executed using the current
[process.env](https://nodejs.org/api/process.html#process_process_env).
To add additional directories for command searching, use the
`.path()` method:

```javascript
new ShellCommand()
    .path(
        './node_modules/.bin',
        './myScripts'
    )
    ...
```
Directories can be specified using chained calls:

```javascript
new ShellCommand()
    .path('./node_modules/.bin')
    .path('./myScripts')
    ...
```

Directories can be specified using arrays:

```javascript
new ShellCommand()
    .path(['./node_modules/.bin', './myScripts])
    ...
```    

### Synchronous Execution

To run commands synchronously, use the `.sync()` method:

```javascript
new ShellCommand()
    .path('./node_modules/.bin')
    .sync(
        'rimraf dist/'
        `mkdir dist/'
    )
    .run();
```

### Asynchronous Execution

To run commands asynchronously, use the `.async()` method:

```javascript
new ShellCommand()
    .path('./node_modules/.bin')
    .async(
        'karma start'
        `webpack-dev-server --hot'
    )
    .run();
```

### Parallel Shell Execution

[Parallel Shell](https://www.npmjs.com/package/parallelshell) 
runs commands asynchronously but treats them as a single 
process in regards to termination. This is particularly useful when you 
need to kill all your commands at once. See Parallel Shell's README for a 
full explanation of its features.

To run commands using Parallel Shell, use the `.parallel()` method:

```javascript
new ShellCommand()
    .path('./node_modules/.bin')
    .parallel(
        'karma start'
        `webpack-dev-server --hot'
    )
    .run();
```

### Batched Execution

ShellCommand batches the execution of commands by waiting for the current set 
of commands to complete before executing the next set of commands.

In this example, ShellCommand waits for the A commands to complete
before executing the B commands, and waits for the B commands to complete
before executing the C commands.

```javascript
new ShellCommand()
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

The `.sync()` and `.async()` methods can be passed a ShellCommand instance
as a command:

```javascript
new ShellCommand()
    .async(
        'command A1',
        new ShellCommand().sync(
            'command A2a' 
            'command A2b' 
            'command A2c' 
        ),
        'command A3'
    )
    .sync(
        'command B1',
        new ShellCommand().parallel(
            'command B2a' 
            'command B2b' 
            'command B2c' 
        ),
        'command B3'
    )
    .run();
```

You can pass in any object as a command as long as the
object has a `.run()` method, and returns a 
[deferred](https://www.npmjs.com/package/deferred) promise.

**Note:** The `.parallel()` method only accepts strings for specifying commands.
