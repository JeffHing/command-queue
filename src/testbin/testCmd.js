/*
 * Copyright 2015. Author: Jeffrey Hing. All Rights Reserved.
 *
 * MIT License
 *
 * Testing exit codes of commands.
 */
'use strict';

var exitCode = 0;

if (process.argv.length >= 2) {
    exitCode = process.argv[2];
}

process.exit(exitCode);
