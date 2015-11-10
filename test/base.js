/**
 * Created by JiaHao on 10/11/15.
 */

var chai = require('chai');
var assert = chai.assert;
var async = require('async');

var constants = require('./constants');
var navigation = require('./../lib/navigation');

describe('Base PhantomJS functions', function () {
    this.timeout(constants.TIMEOUT);
    it('Can open pages', function (done) {
        async.each(constants.TEST_URLS, function (testUrl, callback) {
            navigation.openPage(testUrl, function (error, page, ph) {
                ph.exit();
                callback(error);
            });
        }, function (error) {
            assert.notOk(error, 'No error should be received when opening pages');
            done(error);
        });
    });

    it('Can fail to open pages gracefully', function (done) {

        navigation.openPage(constants.INVALID_URL, function (error, page, ph) {
            ph.exit();
            assert.ok(error, 'An error should be received when opening pages');
            done();
        });
    });
});
