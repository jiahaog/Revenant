/**
 * Created by JiaHao on 10/11/15.
 */

var chai = require('chai');
var assert = chai.assert;

var constants = require('./constants');
var Revenant = require('./../lib/Revenant');

describe('Basic Revenant Object Test', function () {
    this.timeout(constants.TIMEOUT);

    describe('Object Configuration', function () {
        it('Can pass flags into the PhantomJS process', function (done) {
            // We use a URL which will return an ssl handshake error, and we try to pass a flag that ignores that
            var SSL_HANDSHAKE_ERROR_URL = 'https://myportal.sutd.edu.sg/';

            var browser = new Revenant({
                flags: ['--ignore-ssl-errors=yes']
            });

            browser
                .openPage(SSL_HANDSHAKE_ERROR_URL)
                .then(function () {
                    return browser.takeSnapshot();
                })
                .then(function (result) {
                    assert.ok(result, 'A proper result should be returned, as the ssl error handshake error should have been ignored');
                    browser.done();
                    done();
                }).catch(function (error) {
                browser.done();
                done(error);
            });
        });
    });

    describe('Asynchronous Operation', function () {

        describe('Error triggers if a page is not open', function () {
            it('Node style callback', function (done) {
                var browser = new Revenant();
                browser.takeSnapshot(function (error) {
                    browser.done();
                    assert.ok(error, 'Error should say that a page is not open');
                    done();
                });
            });

            it('Promise', function (done) {
                var browser = new Revenant();
                browser
                    .takeSnapshot()
                    .then(function (result) {
                        done('Error: Result callback should not be called, it is invalid');
                    }).catch(function (error) {
                    browser.done();
                    assert.ok(error, 'Error should say that a page is not open');
                    done();
                });
            });
        });

        it('Promise Should propagate errors', function (done) {
            var browser = new Revenant();
            // provide an invalid url, error should be sent in the callback at .openPage();
            var url = null;
            browser
                .openPage(url)
                .then(function () {
                    return browser.takeSnapshot();
                })
                .then(function (result) {
                    browser.done();
                    done('Error callback should have been triggered, not this.');
                }).catch(function (error) {
                browser.done();
                assert.ok(error, 'Error should say that an invalid url is provided');
                done();
            }).catch(function (error) {
                // this will be reached if an exception is thrown in the callback for .catch()
                // as there are issues when throwing synchronous errors in the final callback
                done(error);
            });
        });
    });
});
