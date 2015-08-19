/**
 * Created by JiaHao on 18/8/15.
 */


var async = require('async');
var chai = require('chai');
var assert = chai.assert;

var phantomBase = require('./../lib/phantomBase');
var PhantomHigh = require('./../lib/PhantomHigh');


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
            assert.notOk(error, 'No error should be received when opening pages');
            done(error);
        });
    });

    it('Can fail to open pages gracefully', function (done) {

        phantomBase.openPage(INVALID_URL, function (error, page, ph) {
            ph.exit();
            assert.ok(error, 'An error should be received when opening pages');
            done();
        });
    })
});

describe('Testing PhantomHigh Object', function () {
    this.timeout(50000);

    it('Can open pages', function (done) {
        async.each(testUrls, function (testUrl, callback) {

            var browser = new PhantomHigh();
            browser.openPage(testUrl, function (error) {
                browser.done();
                callback(error);
            });

        }, function (error) {
            assert.notOk(error, 'No error should be received when opening a valid page.');
            done(error);
        })
    });
    
    it('Can do tasks sequentially and get a snapshot', function (done) {
        var browser = new PhantomHigh();
        var url = testUrls[0];
        browser.openPage(url);
        browser.takeSnapshot(function (error, result) {
            assert.include(result, '</html>', 'Snapshot results contain closing </html> tag');
            browser.done();
            done(error);
        });
    });

            assert.include(result, '</html>', 'Snapshot results contain closing </html> tag');
            done(error);

        })
    })

});