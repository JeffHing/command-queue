/*
 * Copyright 2015. Author: Jeffrey Hing. All Rights Reserved.
 *
 * MIT License
 *
 * Run shell commands.
 */
'use strict';

//-------------------------------------
// Module dependencies and variables
//-------------------------------------

var childProcess = require('child_process');
var deferred = require('deferred');

// Private model name.
var MODEL = '_shellCommand';

//-------------------------------------
// Module exports
//-------------------------------------

module.exports = ShellCommand;

//-------------------------------------
// Shell Command
//-------------------------------------

/*
 * ShellCommand provides a programmatic API for executing groups of shell
 * commands synchronously or asynchronously.
 *
 * @constructor
 *
 * @example
 *    var nested = new ShellCommand().sync('script 4', 'script 5');
 *
 *    new ShellCommand()
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
function ShellCommand() {
    this[MODEL] = new ShellCommandModel();
}

var proto = ShellCommand.prototype;

/*
 * Specifies that the commands should be run synchronously.
 *
 * @param [...(string|object)]
 * @return {object} The current ShellCommand instance.
 */
proto.sync = function() {
    var m = this[MODEL];
    m.batchIt(m.runSync, arguments);
    return this;
};

/*
 * Specifies that the commands should be run asynchronously.
 *
 * @param [...(string|object)]
 * @return {object} The current ShellCommand instance.
 */
proto.async = function() {
    var m = this[MODEL];
    m.batchIt(m.runAsync, arguments);
    return this;
};

/*
 * Specifies that the commands should be run in parallel.
 *
 * @param [...(string|object)]
 * @return {object} The current ShellCommand instance.
 */
proto.parallel = function() {
    var m = this[MODEL];
    m.batchIt(m.runParallel, arguments);
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
    m.spawned = [];

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
 * Terminates all commands using SIGINT.
 */
proto.close = function() {
    var m = this[MODEL];
    m.close();
    m.runDeferred.reject();
};

//-------------------------------------
// Shell Command's private model
//-------------------------------------

/*
 * @constructor
 */
function ShellCommandModel() {
    // Queue of batched commands.
    this.queue = [];

    // Queue of spawned commands.
    this.spawned = [];

    // The deferred command returned by the run() method.
    this.runDeferred = null;
}

var modelProto = ShellCommandModel.prototype;

/*
 * Batches a set of commands.
 *
 * @param {function} func The ShellCommandModel function to run the commands.
 * @param {array} funcArgs The commands to pass to the function.
 */
modelProto.batchIt = function(func, cmds) {
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
            self.runShell(cmds[index]).then(
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
        promises.push(this.runShell(cmds[i]));
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
        promises.push(this.runShell(cmds[i], true));
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
 * Executes the command using a shell.
 *
 * @param {array|object} cmd
 *    If the argument has a .run() method, it is called instead. It
 *    is assumed that the .run() method will return a promise which
 *    is resolved when the execution completes.
 * @return {object} A promise which is resolved when the command completes.
 */
modelProto.runShell = function(cmd) {
    var self = this;

    //
    // Run a ShellCommand instance.
    //
    if (isShellCommand(cmd)) {
        self.spawned.push(cmd);
        return cmd.run();
    }

    //
    // Run a shell command.
    //
    var def = deferred();

    var child = childProcess.exec(cmd, {
        cwd: process.cwd,
        env: process.env,
        stdio: ['pipe', process.stdout, process.stderr]
    });

    child.on('close', function(code) {
        if (code === 0) {
            def.resolve();
        } else {
            def.reject();
        }
    });

    self.spawned.push(child);

    return def.promise;
};

/*
 * Closes all spawned processes using SIGINT.
 */
modelProto.close = function() {
    for (var i = 0; i < this.spawned.length; i++) {
        var child = this.spawned[i];
        if (isShellCommand(child)) {
            child[MODEL].close();
        } else if (child.exitCode === null) {
            child.removeAllListeners('close');
            child.kill('SIGINT');
        }
    }
};

//-------------------------------------
// Utility functions
//-------------------------------------

function isShellCommand(cmd) {
    return cmd instanceof ShellCommand;
}
