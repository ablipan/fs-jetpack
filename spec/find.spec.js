/* eslint-env jasmine */

"use strict";

describe('find |', function () {

    var fse = require('fs-extra');
    var pathUtil = require('path');
    var helper = require('./support/spec_helper');
    var jetpack = require('..');

    beforeEach(helper.beforeEach);
    afterEach(helper.afterEach);

    it("returns list of absolute paths by default", function (done) {

        var preparations = function () {
            fse.outputFileSync('a/b/file.txt', 'abc');
        };

        var expectations = function (found) {
            var expectedPath = pathUtil.resolve('./a/b/file.txt');
            expect(found).toEqual([expectedPath]);
        };

        preparations();

        // SYNC
        var foundSync = jetpack.find('a', { matching: '*.txt' }); // default
        expectations(foundSync);
        foundSync = jetpack.find('a', { matching: '*.txt' }, 'absolutePath'); // explicit
        expectations(foundSync);

        // ASYNC
        jetpack.findAsync('a', { matching: '*.txt' }) // default
        .then(function (foundAsync) {
            expectations(foundAsync);
            return jetpack.findAsync('a', { matching: '*.txt' }, 'absolutePath'); // explicit
        })
        .then(function (foundAsync) {
            expectations(foundAsync);
            done();
        });
    });

    it("can return list of relative paths", function (done) {

        var preparations = function () {
            fse.outputFileSync('a/b/file.txt', 'abc');
        };

        var expectations = function (found) {
            var normalizedFound = helper.convertToUnixPathSeparators(found);
            expect(normalizedFound).toEqual(['./b/file.txt']);
        };

        preparations();

        // SYNC
        var foundSync = jetpack.find('a', { matching: '*.txt' }, 'relativePath');
        expectations(foundSync);

        // ASYNC
        jetpack.findAsync('a', { matching: '*.txt' }, 'relativePath')
        .then(function (foundAsync) {
            expectations(foundAsync);
            done();
        });
    });

    it("can return list of inspect objects", function (done) {

        var preparations = function () {
            fse.outputFileSync('a/b/c.txt', 'abc');
        };

        var expectations = function (found) {
            expect(found[0].name).toBe('c.txt');
        };

        preparations();

        // SYNC
        var foundSync = jetpack.find('a', { matching: '*.txt' }, 'inspect');
        expectations(foundSync);

        // ASYNC
        jetpack.findAsync('a', { matching: '*.txt' }, 'inspect')
        .then(function (foundAsync) {
            expectations(foundAsync);
            done();
        });
    });

    it("returns empty list if nothing found", function (done) {

        var preparations = function () {
            fse.outputFileSync('a/b/c.md', 'abc');
        };

        var expectations = function (found) {
            expect(found).toEqual([]);
        };

        preparations();

        // SYNC
        var foundSync = jetpack.find('a', { matching: '*.txt' });
        expectations(foundSync);

        // ASYNC
        jetpack.findAsync('a', { matching: '*.txt' })
        .then(function (foundAsync) {
            expectations(foundAsync);
            done();
        });
    });

    it("finds all paths which match globs", function (done) {

        var preparations = function () {
            fse.outputFileSync('a/b/file.txt', '1');
            fse.outputFileSync('a/b/c/file.txt', '2');
            fse.outputFileSync('a/b/c/file.md', '3');
            fse.mkdirsSync('a/x/y/z');
        };

        var expectations = function (found) {
            var normalizedFound = helper.convertToUnixPathSeparators(found);
            normalizedFound.sort();
            expect(normalizedFound).toEqual([
                './b/c/file.txt',
                './b/file.txt',
                './x/y/z',
            ]);
        };

        preparations();

        // SYNC
        var foundSync = jetpack.find('a', { matching: ['*.txt', 'z'] }, 'relativePath');
        expectations(foundSync);

        // ASYNC
        jetpack.findAsync('a', { matching: ['*.txt', 'z'] }, 'relativePath')
        .then(function (foundAsync) {
            expectations(foundAsync);
            done();
        });
    });

    it("deals with glob anchored with ./ (anchored to directory we're finding in)", function (done) {

        var preparations = function () {
            fse.outputFileSync('x/y/a/b/file.txt', '1');
            fse.outputFileSync('x/y/a/b/file.md', '2');
            fse.outputFileSync('x/y/a/b/c/file.txt', '3');
        };

        var expectations = function (found) {
            var normalizedFound = helper.convertToUnixPathSeparators(found);
            expect(normalizedFound).toEqual(['./b/file.txt']);
        };

        preparations();

        // SYNC
        var foundSync = jetpack.find('x/y/a', { matching: './b/*.txt' }, 'relativePath');
        expectations(foundSync);

        // ASYNC
        jetpack.findAsync('x/y/a', { matching: './b/*.txt' }, 'relativePath')
        .then(function (foundAsync) {
            expectations(foundAsync);
            done();
        });
    });

    it("deals with glob anchored to CWD", function (done) {

        var preparations = function () {
            fse.outputFileSync('a/b/file.txt', '1');
            fse.outputFileSync('a/b/file.md', '2');
            fse.outputFileSync('a/b/c/file.txt', '3');
        };

        var expectations = function (found) {
            var normalizedFound = helper.convertToUnixPathSeparators(found);
            expect(normalizedFound).toEqual(['./b/file.txt']);
        };

        preparations();

        // SYNC
        var foundSync = jetpack.find('a', { matching: 'a/b/*.txt' }, 'relativePath');
        expectations(foundSync);

        // ASYNC
        jetpack.findAsync('a', { matching: 'a/b/*.txt' }, 'relativePath')
        .then(function (foundAsync) {
            expectations(foundAsync);
            done();
        });
    });

    it('deals with negation globs', function (done) {

        var preparations = function () {
            helper.clearWorkingDir();
            fse.mkdirsSync('a/b');
            fse.mkdirsSync('a/x');
            fse.mkdirsSync('a/y');
            fse.mkdirsSync('a/z');
        };

        var expectations = function (found) {
            var normalizedFound = helper.convertToUnixPathSeparators(found);
            expect(normalizedFound).toEqual(['./b']);
        };

        // SYNC
        preparations();
        var foundSync = jetpack.find('a', {
            matching: [
                'a/*',
                // Three different pattern types to test:
                '!x',
                '!a/y',
                '!./z',
            ],
        }, 'relativePath');
        expectations(foundSync);

        // ASYNC
        preparations();
        jetpack.findAsync('a', {
            matching: [
                'a/*',
                // Three different pattern types to test:
                '!x',
                '!a/y',
                '!./z',
            ],
        }, 'relativePath')
        .then(function (foundAsync) {
            expectations(foundAsync);
            done();
        });
    });

    it("works even if provided path is a file", function (done) {

        var preparations = function () {
            fse.outputFileSync('file.txt', '1');
        };

        var expectations = function (found) {
            expect(found).toEqual(['.']);
        };

        preparations();

        // SYNC
        var foundSync = jetpack.find('file.txt', { matching: '*.txt' }, 'relativePath');
        expectations(foundSync);

        // ASYNC
        jetpack.findAsync('file.txt', { matching: '*.txt' }, 'relativePath')
        .then(function (foundAsync) {
            expectations(foundAsync);
            done();
        });
    });

    it("throws nice error if path doesn't exist", function (done) {

        var expectations = function (err) {
            expect(err.code).toBe('ENOENT');
            expect(err.message).toMatch(/^Path you want to find stuff in doesn't exist/);
        };

        // SYNC
        try {
            jetpack.find('a', { matching: '*.txt' });
        } catch(err) {
            expectations(err);
        }

        // ASYNC
        jetpack.findAsync('a', { matching: '*.txt' })
        .catch(function (err) {
            expectations(err);
            done();
        });
    });

    it("respects internal CWD of jetpack instance", function (done) {

        var preparations = function () {
            fse.outputFileSync('a/b/c.txt', 'abc');
        };

        var expectations = function (found) {
            expect(found[0].name).toBe('c.txt');
        };

        preparations();

        var jetContext = jetpack.cwd('a');

        // SYNC
        var foundSync = jetContext.find('b', { matching: '*.txt' }, 'inspect');
        expectations(foundSync);

        // ASYNC
        jetContext.findAsync('b', { matching: '*.txt' }, 'inspect')
        .then(function (foundAsync) {
            expectations(foundAsync);
            done();
        });
    });

});
