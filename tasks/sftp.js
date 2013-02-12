/*
 * grunt-ssh
 * https://github.com/ajones/grunt-ssh
 *
 * Copyright (c) 2013 Andrew Jones
 * Licensed under the MIT license.
 */

module.exports = function (grunt) {
  'use strict';

  grunt.util = grunt.util || grunt.utils;

  grunt.registerMultiTask('sftp', 'Copy files to a (remote) machine running an SSH daemon.', function () {
    var helpers = require('grunt-lib-contrib').init(grunt);
    var utillib = require('./lib/util').init(grunt);
    var fs = require('fs');
    var async = require('async');
    var Connection = require('ssh2');

    var options = helpers.options(this, {
      path: '',
      host: false,
      username: false,
      password: false,
      port: utillib.port,
      minimatch: {}
    });

    // TODO: ditch this when grunt v0.4 is released
    this.files = this.files || helpers.normalizeMultiTaskFiles(this.data, this.target);

    grunt.verbose.writeflags(options, 'Options');

    var files = this.files;
    var srcFiles;
    var srcFile;

    var c = new Connection();
    var done = this.async();

    c.on('connect', function () {
      grunt.verbose.writeln('Connection :: connect');
    });

    c.on('ready', function () {

      files.forEach(function (file) {
        srcFiles = grunt.file.expandFiles(options.minimatch, file.src);

        if (srcFiles.length === 0) {
          c.end();
          grunt.fail.warn('Unable to copy; no valid source files were found.');
        }

        c.sftp(function (err, sftp) {
          if (err) {
            throw err;
          }
          sftp.on('end', function () {
            grunt.verbose.writeln('SFTP :: SFTP session closed');
          });
          sftp.on('close', function () {
            grunt.verbose.writeln('SFTP :: close');
          });

          async.forEach(srcFiles, function (srcFile, callback) {
            var from = fs.createReadStream(srcFile);
            var to = sftp.createWriteStream(options.path + srcFile);

            to.on('close', function () {
              callback();
            });

            from.pipe(to);
          }, function (err) {
            sftp.end();
            c.end();
          });

        });
      });

    });
    c.on('error', function (err) {
      grunt.fail.warn('Connection :: error :: ' + err);
    });
    c.on('end', function () {
      grunt.verbose.writeln('Connection :: end');
    });
    c.on('close', function (had_error) {
      grunt.verbose.writeln('Connection :: close');
      done();
    });
    c.connect({
      host: options.host,
      port: options.port,
      username: options.username,
      password: options.password
    });
  });
};