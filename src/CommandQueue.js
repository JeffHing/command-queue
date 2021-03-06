/*
 * Copyright 2015. Author: Jeffrey Hing. All Rights Reserved.
 *
 * MIT License
 *
 * Executes groups of commands synchronously or asynchronously.
 */
'use strict';

//-------------------------------------
// Module dependencies and variables
//-------------------------------------

var spawn = require('child_process').spawn;
var deferred = require('deferred');

// Private model name.
var MODEL = '_commandQueue';

//-------------------------------------
// Module exports
//-------------------------------------

module.exports = CommandQueue;

//-------------------------------------
// Command Queue
//-------------------------------------

/*
 * CommandQueue provides a programmatic API for executing groups of
 * commands synchronously or asynchronously.
 *
 * @constructor
 *
 * @example
 *    var nested = new CommandQueue().sync('script 4', 'script 5');
 *
 *    new CommandQueue()
 *        .sync(
 *            'script 1',
 *            'script 2',
 *            'script 3',
 *        )
 *        .async(
 *            'script A',
 *            'script B',
 *            nested,
 *            'script C',
 *        )
 *        .parallel(
 *            'script 1',
 *            'script 2',
 *            'script 3',
 *        )
 *        .run();
 */
function CommandQueue() {
    this[MODEL] = new CommandQueueModel(this);
    if (process.platform === 'win32') {
        this.win32();
    } else {
        this.posix();
    }
}

var proto = CommandQueue.prototype;

/*
 * Specifies that a BASH shell should be used for executing commands.
 */
proto.posix = function() {
    var m = this[MODEL];
    m.shell = 'sh';
    m.shellFlag = '-c';
    return this;
};

/*
 * Specifies that a Windows command shell should be used for executing
 * commands.
 */
proto.win32 = function() {
    var m = this[MODEL];
    m.shell = 'cmd';
    m.shellFlag = '/c';
    return this;
};

/*
 * Specifies that the commands should be run synchronously.
 *
 * @param [...(string|CommandQueue)]
 * @return {object} The current CommandQueue instance.
 */
proto.sync = function() {
    var m = this[MODEL];
    m.batch(m.runSync, arguments);
    return this;
};

/*
 * Specifies that the commands should be run asynchronously.
 *
 * @param [...(string|CommandQueue]
 * @return {object} The current CommandQueue instance.
 */
proto.async = function() {
    var m = this[MODEL];
    m.batch(m.runAsync, arguments);
    return this;
};

/*
 * Specifies that the commands should be run in parallel.
 *
 * @param [...(string|CommandQueue)]
 * @return {object} The current CommandQueue instance.
 */
proto.parallel = function() {
    var m = this[MODEL];
    m.batch(m.runParallel, arguments);
    return this;
};

/*
 * Runs the commands on the queue.
 *
 * @returns {object} A promise which is resolved when the commands complete.
 */
proto.run = function() {
    var m = this[MODEL];

    m.runDeferred = deferred();
    m.children = [];

    runNext(0);

    return m.runDeferred.promise;

    function runNext(index) {
        if (index < m.queue.length) {
            var batch = m.queue[index];
            batch.func.call(m, batch.cmds).then(
                function() {
                    runNext(index + 1);
                },
                function() {
                    m.runDeferred.reject();
                }
            );
        } else {
            m.runDeferred.resolve();
        }
    }
};

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
proto.runCommand = function(cmd, shell, shellFlag) {
    var args = [shellFlag, cmd];

    var childProcess = spawn(shell, args, {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['pipe', process.stdout, process.stderr]
    });

    return childProcess;
};

/*
 * Terminates all commands using SIGTERM.
 */
proto.close = function() {
    var m = this[MODEL];
    m.close();
    m.runDeferred.reject();
};

//-------------------------------------
// CommandQueue's private model
//-------------------------------------

/*
 * @constructor
 */
function CommandQueueModel(commandQueueInstance) {

    this.commandQueueInstance = commandQueueInstance;

    // Queue of batched commands.
    this.queue = [];

    // Children processes.
    this.children = [];

    // The deferred command returned by the run() method.
    this.runDeferred = null;
}

var modelProto = CommandQueueModel.prototype;

/*
 * Batches a set of commands.
 *
 * @param {function} func The CommandQueueModel function to run the commands.
 * @param {array} funcArgs The commands to pass to the function.
 */
modelProto.batch = function(func, cmds) {
    this.queue.push({
        func: func,
        cmds: cmds
    });
};

/*
 * Runs the commands synchronously.
 *
 * @param {array} cmds The array of commands to run.
 * @return {object} A promise which is resolved when the command completes.
 */
modelProto.runSync = function(cmds) {
    var self = this;
    var def = deferred();

    runNext(0);

    return def.promise;

    function runNext(index) {
        if (index < cmds.length) {
            self.runCommand(cmds[index], 'sync').then(
                function() {
                    runNext(index + 1);
                },
                function() {
                    def.reject();
                }
            );
        } else {
            def.resolve();
        }
    }
};

/*
 * Runs the commands asynchronously.
 *
 * @param {array} cmds The array of commands to run.
 * @return {object} A promise which is resolved when the commands complete.
 */
modelProto.runAsync = function(cmds) {
    var promises = [];
    for (var i = 0; i < cmds.length; i++) {
        promises.push(this.runCommand(cmds[i], 'async'));
    }
    return deferred.apply({}, promises);
};

/*
 * Runs the commands in parallel.
 *
 * @param {array} cmds The array of commands to run.
 * @return {object} A promise which is resolved when the commands complete.
 */
modelProto.runParallel = function(cmds) {
    var self = this;

    var promises = [];
    for (var i = 0; i < cmds.length; i++) {
        promises.push(this.runCommand(cmds[i], 'parallel'));
    }
    var def = deferred();
    deferred.apply({}, promises).then(
        function() {
            def.resolve();
        },
        function() {
            self.close();
            def.reject();
        });
    return def.promise;
};

/*
 * Runs the command.
 *
 * @param {string|CommandQueue} cmd
 * @param {'sync'|'async'|'parallel'} runType
 * @return {object} A promise which is resolved when the command completes.
 */
modelProto.runCommand = function(cmd, runType) {
    var self = this;

    //
    // Run a CommandQueue instance.
    //
    if (isCommandQueue(cmd)) {
        self.children.push(cmd);
        return cmd.run();
    }

    //
    // Run a command.
    //
    var childProcess = this.commandQueueInstance.runCommand(
        cmd, self.shell, self.shellFlag, runType);

    var child = {
        process: childProcess,
        closed: false,
        killed: false
    };

    var def = deferred();

    childProcess.on('close', function(code) {
        child.closed = true;
        if (code === 0) {
            def.resolve();
        } else {
            def.reject();
        }
    });

    self.children.push(child);

    return def.promise;
};

/*
 * Closes all children processes using SIGTERM.
 */
modelProto.close = function() {
    for (var i = 0; i < this.children.length; i++) {
        var child = this.children[i];
        if (isCommandQueue(child)) {
            child[MODEL].close();
        } else if (!child.closed && !child.killed) {
            child.killed = true;
            child.process.kill('SIGTERM');
        }
    }
};

/*
 * Used for testing only. This should be called
 * with a delay to allow for children to be killed.
 */
modelProto.areAllClosed = function() {
    for (var i = 0; i < this.children.length; i++) {
        var child = this.children[i];
        if (!isCommandQueue(child)) {
            if (!child.closed) {
                return false;
            }
        }
    }
    return true;
};

//-------------------------------------
// Utility functions
//-------------------------------------

function isCommandQueue(child) {
    return child instanceof CommandQueue;
}
