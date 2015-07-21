/*
 * Copyright 2015. Author: Jeffrey Hing. All Rights Reserved.
 *
 * MIT License
 *
 * Unit tests for ShellCommand.
 */
'use strict';

//----------------------------------
// Module dependencies and variables
//----------------------------------

var ShellCommand = require('./ShellCommand');
var deferred = require('deferred');
var path = require('path');

//
// Commands for testing actual shell processes.
//
var nodeCmd = 'node ' +
    path.join(__dirname, 'testbin', 'testCmd.js');

var nodeCmdFail = 'node ' +
    path.join(__dirname, 'testbin', 'testCmd.js') + ' 2';

//
// Command for testing basic logic.
//
function Cmd(delay, output, outputQueue) {
    this._delay = delay;
    this._output = output;
    this._outputQueue = outputQueue;
}
Cmd.prototype.run = function() {
    var self = this;
    var def = deferred();

    setTimeout(function() {
        self._outputQueue.push(self._output);
        def.resolve();
    }, self._delay);

    return def.promise;
};

//----------------------------------
// Unit Tests
//----------------------------------

describe('ShellCommmand', function() {

    //----------------------------------
    // Path tests
    //----------------------------------
    describe('adding directories to path', function() {

        it('should find commands', function(done) {
            new ShellCommand()
                .path([
                    path.join(process.cwd(), 'src', 'testbin'),
                    path.join(process.cwd(), 'src', 'testbin', 'more')
                ])
                .sync('testCmd')
                .sync('testMoreCmd')
                .run()
                .then(
                    function() {
                        done();
                    }
                );
        });
    });

    //----------------------------------
    // Sync tests
    //----------------------------------
    describe('sync exit status', function() {

        it('should be success', function(done) {
            new ShellCommand()
                .sync(nodeCmd)
                .run()
                .then(
                    function() {
                        done();
                    },
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    }
                );
        });

        it('should be failure', function(done) {
            new ShellCommand()
                .sync(nodeCmdFail)
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        done();
                    }
                );
        });

        it('should be failure if at least one fails', function(done) {
            new ShellCommand()
                .sync(
                    nodeCmd,
                    nodeCmdFail,
                    nodeCmd
                )
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        done();
                    }
                );
        });
    });

    describe('sync execution order', function() {

        it('should be executed in order', function(done) {
            var outputQueue = [];

            new ShellCommand()
                .sync(
                    new Cmd(400, 'A', outputQueue),
                    new Cmd(1, 'B', outputQueue),
                    new Cmd(1, 'C', outputQueue)
                )
                .run()
                .then(
                    function() {
                        expect(outputQueue[0]).toBe('A');
                        expect(outputQueue[1]).toBe('B');
                        expect(outputQueue[2]).toBe('C');
                        done();
                    }
                );
        });
    });

    //----------------------------------
    // Async tests
    //----------------------------------
    describe('async exit status', function() {

        it('should be success', function(done) {
            new ShellCommand()
                .async(nodeCmd)
                .run()
                .then(
                    function() {
                        done();
                    },
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    }
                );
        });

        it('should be failure', function(done) {
            new ShellCommand()
                .async(nodeCmdFail)
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        done();
                    }
                );
        });

        it('should be failure if at least one fails', function(done) {
            new ShellCommand()
                .async(
                    nodeCmd,
                    nodeCmdFail,
                    nodeCmd
                )
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        done();
                    }
                );
        });
    });

    describe('async execution order', function() {

        it('should be executed in order of completion', function(done) {
            var outputQueue = [];

            new ShellCommand()
                .async(
                    new Cmd(200, 'A', outputQueue),
                    new Cmd(400, 'B', outputQueue),
                    new Cmd(1, 'C', outputQueue)
                )
                .run()
                .then(
                    function() {
                        expect(outputQueue[0]).toBe('C');
                        expect(outputQueue[1]).toBe('A');
                        expect(outputQueue[2]).toBe('B');
                        done();
                    }
                );
        });
    });

    //----------------------------------
    // Parallel tests
    //----------------------------------
    describe('parallel exit status', function() {

        it('should be success', function(done) {
            new ShellCommand()
                .parallel(nodeCmd)
                .run()
                .then(
                    function() {
                        done();
                    },
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    }
                );
        });

        it('should be failure', function(done) {
            new ShellCommand()
                .parallel(nodeCmdFail)
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        done();
                    }
                );
        });

        it('should be failure if at least one fails', function(done) {
            new ShellCommand()
                .parallel(
                    nodeCmd,
                    nodeCmdFail,
                    nodeCmd
                )
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        done();
                    }
                );
        });
    });

    describe('parallel execution order', function() {

        it('should be executed in order', function(done) {
            var outputQueue = [];

            new ShellCommand()
                .parallel(
                    new Cmd(200, 'A', outputQueue),
                    new Cmd(400, 'B', outputQueue),
                    new Cmd(1, 'C', outputQueue)
                )
                .run()
                .then(
                    function() {
                        expect(outputQueue[0]).toBe('A');
                        expect(outputQueue[1]).toBe('B');
                        expect(outputQueue[2]).toBe('C');
                        done();
                    }
                );
        });
    });

    //----------------------------------
    // Combining Sync, Async, and Parallel tests
    //----------------------------------

    describe('async and sync execution order', function() {

        it('should be executed in the correct order', function(done) {
            var outputQueue = [];

            new ShellCommand()
                .async(
                    new Cmd(200, 'A', outputQueue),
                    new Cmd(400, 'B', outputQueue),
                    new Cmd(1, 'C', outputQueue)
                )
                .sync(
                    new Cmd(400, 'D', outputQueue),
                    new Cmd(1, 'E', outputQueue),
                    new Cmd(1, 'F', outputQueue)
                )
                .parallel(
                    new Cmd(200, 'G', outputQueue),
                    new Cmd(400, 'H', outputQueue),
                    new Cmd(1, 'I', outputQueue)
                )
                .async(
                    new Cmd(200, 'J', outputQueue),
                    new Cmd(400, 'K', outputQueue),
                    new Cmd(1, 'L', outputQueue)
                )
                .run()
                .then(
                    function() {
                        expect(outputQueue[0]).toBe('C');
                        expect(outputQueue[1]).toBe('A');
                        expect(outputQueue[2]).toBe('B');
                        expect(outputQueue[3]).toBe('D');
                        expect(outputQueue[4]).toBe('E');
                        expect(outputQueue[5]).toBe('F');
                        expect(outputQueue[6]).toBe('G');
                        expect(outputQueue[7]).toBe('H');
                        expect(outputQueue[8]).toBe('I');
                        expect(outputQueue[9]).toBe('L');
                        expect(outputQueue[10]).toBe('J');
                        expect(outputQueue[11]).toBe('K');
                        done();
                    }
                );
        });
    });

    describe('sync within async execution order', function() {

        it('should be executed in the correct order', function(done) {
            var outputQueue = [];

            var syncCmds = new ShellCommand()
                .sync(
                    new Cmd(200, 'C1', outputQueue),
                    new Cmd(1, 'C2', outputQueue),
                    new Cmd(1, 'C3', outputQueue)
                );

            new ShellCommand()
                .async(
                    new Cmd(1, 'A', outputQueue),
                    syncCmds,
                    new Cmd(400, 'B', outputQueue)
                )
                .run()
                .then(
                    function() {
                        expect(outputQueue[0]).toBe('A');
                        expect(outputQueue[1]).toBe('C1');
                        expect(outputQueue[2]).toBe('C2');
                        expect(outputQueue[3]).toBe('C3');
                        expect(outputQueue[4]).toBe('B');
                        done();
                    }
                );
        });
    });

    describe('async within sync execution order', function() {

        it('should be executed in the correct order', function(done) {
            var outputQueue = [];

            var asyncCmds = new ShellCommand()
                .async(
                    new Cmd(200, 'C1', outputQueue),
                    new Cmd(400, 'C2', outputQueue),
                    new Cmd(1, 'C3', outputQueue)
                );

            new ShellCommand()
                .sync(
                    new Cmd(1, 'A', outputQueue),
                    asyncCmds,
                    new Cmd(1, 'B', outputQueue)
                )
                .run()
                .then(
                    function() {
                        expect(outputQueue[0]).toBe('A');
                        expect(outputQueue[1]).toBe('C3');
                        expect(outputQueue[2]).toBe('C1');
                        expect(outputQueue[3]).toBe('C2');
                        expect(outputQueue[4]).toBe('B');
                        done();
                    }
                );
        });
    });
});
