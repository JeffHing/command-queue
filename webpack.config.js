/*
 * Copyright 2015. Author: Jeffrey Hing. All Rights Reserved.
 *
 * MIT License
 *
 * Webpack configuration for develepment.
 */
'use strict';

//-------------------------------------
// Module dependencies and variables.
//-------------------------------------

// Indicates whether the config is for watching.
var isWatch = false;

//-------------------------------------
// Module exports
//-------------------------------------

if (process.argv[2] === '--watch') {
    isWatch = true;
}

module.exports = {

    entry: './src/CommandQueue.js',

    eslint: {
        failOnError: !isWatch
    },

    externals: {
        'child_process': 'child_process'
    },

    module: {
        loaders: [{
            // Lint javascript.
            test: /\.js$/,
            loader: 'eslint-loader',
            exclude: /node_modules/
        }]
    },

    output: {
        filename: 'build/bundle.js'
    }
};
