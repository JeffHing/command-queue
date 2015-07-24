/*
 * Copyright 2015. Author: Jeffrey Hing. All Rights Reserved.
 *
 * MIT License
 *
 * Webpack configuration for develepment.
 */
'use strict';

//-------------------------------------
// Module exports
//-------------------------------------

module.exports = {

    entry: './src/CommandQueue.js',

    eslint: {
        failOnError: false
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
