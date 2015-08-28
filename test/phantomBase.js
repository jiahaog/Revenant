/**
 * Created by JiaHao on 18/8/15.
 */


var async = require('async');
var chai = require('chai');
var assert = chai.assert;

var phantomBase = require('./../lib/phantomBase');
var PhantomHigh = require('./../lib/PhantomHigh');

const testUrls = ['http://apple.com', 'https://www.facebook.com/', 'http://skewedlines.github.io/ajax-test-page/'];
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
    });
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

    it('Browser is returned in functions', function (done) {
        var browser = new PhantomHigh();
        var url = testUrls[0];
        browser.openPage(url).takeSnapshot(function (error, result) {
            assert.include(result, '</html>', 'Snapshot results contain closing </html> tag');
            browser.done();
            done(error);
        });
    });

    it('Callback triggers an error if a page is not open', function (done) {
        var browser = new PhantomHigh();

        browser.takeSnapshot(function (error) {
            assert.ok(error, 'Error should say that a page is not open');
            done();
        })
    });

    it('Can wait for an element to appear and can get the innerHTML of the element', function (done) {
        var browser = new PhantomHigh();
        var url = testUrls[2];

        const SELECTOR = '#setTimeoutContent';
        browser
            .openPage(url)
            .waitForElement(SELECTOR)
            .getInnerHTML(SELECTOR, function (error, result) {
                assert.equal(result, 'BUBBLES', 'Awaited element innerHTML should be "BUBBLES"');
                browser.done();
                done(error);
            });
    });

    it('Can fill a form and query a form for its value', function (done) {
        var browser = new PhantomHigh();
        var url = testUrls[2];

        const USERNAME_SELECTOR = '#form-username';
        const PASSWORD_SELECTOR = '#form-password';

        const USERNAME = 'user123';

        browser
            .openPage(url)
            .fillForm(USERNAME_SELECTOR, USERNAME)
            .getSelectorValue(USERNAME_SELECTOR, function (error, result) {
                assert.equal(result, USERNAME, 'Username should be equal to filled value');
                browser.done();
                done(error);
            })
    })

});