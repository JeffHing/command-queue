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
var extend = require('extend');

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
 *        .parallel(
 *            'script 1',
 *            'script 2',
 *            'script 3',
 *        )
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
 *        .run();
 */
function ShellCommand() {
    this[MODEL] = new ShellCommandModel();
}

var proto = ShellCommand.prototype;

/*
 * Adds the directory to the ShellCommand's PATH variable.
 *
 * @param {string|array}
 * @return {object} The current ShellCommand instance.
 */
proto.path = function(dir) {
    if (Array.isArray(dir)) {
        for (var i = 0; i < dir.length; i++) {
            this.path(dir[i]);
        }
    } else {
        var m = this[MODEL];
        m.env.PATH = dir + ';' + m.env.PATH;
    }
    return this;
};

/*
 * Specifies the commands should be run synchronously.
 *
 * @param [...(string|object)]
 * @return {object} The current ShellCommand instance.
 */
proto.sync = function() {
    var m = this[MODEL];
    m.queueIt(m.runSync, arguments);
    return this;
};

/*
 * Specifies the commands should be run asynchronously.
 *
 * @param [...(string|object)]
 * @return {object} The current ShellCommand instance.
 */
proto.async = function() {
    var m = this[MODEL];
    m.queueIt(m.runAsync, arguments);
    return this;
};

/*
 * Specifies the commands should be run using parallelshell.
 *
 * @param [...(string|object)]
 * @return {object} The current ShellCommand instance.
 */
proto.parallel = function() {
    var m = this[MODEL];
    var args = ['parallelshell'];
    for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    m.queueIt(m.runSync, args);
    return this;
};

/*
 * Runs the commands on the queue.
 *
 * @returns {object} A promise which is resolved when the commands complete.
 */
proto.run = function() {
    var m = this[MODEL];
    var def = deferred();

    runNext(0);

    return def.promise();

    function runNext(index) {
        if (index < m.queue.length) {
            var runType = m.queue[index];
            runType.func.call(m, runType.cmds)(
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

//-------------------------------------
// Shell Command's private model
//-------------------------------------

/*
 * @constructor
 */
function ShellCommandModel() {
    // Queue of execution sets.
    this.queue = [];

    // Shell environment.
    this.env = extend({}, process.env);

    // Windows or Unix.
    if (process.platform === 'win32') {
        this.shellCmd = 'cmd';
        this.shellFlag = '/c';
    } else {
        this.shellCmd = 'sh';
        this.shellFlag = '-c';
    }
}

var modelProto = ShellCommandModel.prototype;

/*
 * Queues a set of commands.
 *
 * @param {function} func The ShellCommandModel function to run the commands.
 * @param {array} funcArgs The commands to pass to the function.
 */
modelProto.queueIt = function(func, cmds) {
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

    return def.promise();

    function runNext(index) {
        if (index < cmds.length) {
            self.runShell(cmds[index])(
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
 * Executes the command within the context of a shell.
 *
 * @param {array|object} cmd
 *    If the argument has a .run() method, it is called instead. It
 *    is assumed that the .run() method will return a promise which
 *    is resolved when the execution completes.
 * @return {object} A promise which is resolved when the command completes.
 */
modelProto.runShell = function(cmd) {
    if (cmd.run) {
        return cmd.run();
    }

    var args = [this.shellFlag],
        def = deferred();

    // Add user command to args.
    args = args.concat(cmd);

    /// Run command.
    var spawn = childProcess.spawn(this.shellCmd, args, {
        cwd: process.cwd,
        env: this.env,
        stdio: ['pipe', process.stdout, process.stderr]
    });

    spawn.on('close', function(code) {
        if (code === 0) {
            def.resolve();
        } else {
            def.reject();
        }
    });

    return def.promise();
};
