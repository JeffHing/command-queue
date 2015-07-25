/*
 * Copyright 2015. Author: Jeffrey Hing. All Rights Reserved.
 *
 * MIT License
 *
 * Run build commmands.
 */
'use strict';

//-------------------------------------
// Module dependencies and variables
//-------------------------------------

var CommandQueue = require('./src/CommandQueue');

// Run tests.
var testCmd = 'jasmine-node src/CommandQueue.test.js --color --matchall';

// Run tests and watch for changes.
var testAndWatchCmd = testCmd + ' --autotest --watch src/CommandQueue.js';

// Run webpack for linting.
var webpackCmd = 'webpack --bail';

// Run webpack for linting and watch for changes.
var webpackWatchCmd = 'webpack --watch';

//-------------------------------------
// Run build commands
//-------------------------------------

process.env.PATH += ';node_modules/.bin';

var queue = new CommandQueue();

switch (process.argv[2]) {
    case 'dev':
        queue.async(webpackWatchCmd, testAndWatchCmd).run();
        break;
    case 'test':
        queue.sync(webpackCmd, testCmd).run();
        break;
}
