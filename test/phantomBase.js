/**
 * Created by JiaHao on 18/8/15.
 */


var async = require('async');
var chai = require('chai');
var assert = chai.assert;

var phantomBase = require('./../lib/phantomBase');


const testUrls = ['http://apple.com', 'https://www.facebook.com/'];
const INVALID_URL = 'http://insdasjdlkas.com/';

describe('Testing base PhantomJS functions', function () {
    this.timeout(50000);
    it('Can open pages', function (done) {

        async.each(testUrls, function (testUrl, callback) {
            phantomBase.openPage(testUrl, function (error, page, ph) {
                ph.exit();
                callback(error);
            });
        }, function (error) {
            assert.notOk(error, 'string');
            done(error);
        });
    });

    it('Can fail to open pages gracefully', function (done) {

        phantomBase.openPage(INVALID_URL, function (error, page, ph) {
            ph.exit();
            assert.ok(error, 'string');
            done();
        });
    })
});