/**
 * Created by JiaHao on 10/11/15.
 */

var async = require('async');
var chai = require('chai');
var assert = chai.assert;
var url = require('url');
var validUrl = require('valid-url');

var Revenant = require('./../lib/Revenant');
var constants = require('./constants');

describe('Browser Navigation', function () {
    this.timeout(constants.TIMEOUT);
    it('Can open pages (Node style callback)', function (done) {
        async.each(constants.TEST_URLS, function (testUrl, callback) {
            var browser = new Revenant();
            browser.openPage(testUrl, function (error) {
                browser.done();
                if (error) {
                    callback(error);
                    return;
                }
                browser.getUrl(function (error, url) {
                    assert.isTrue(!!validUrl.isWebUri(url), 'Current url of the page is saved to the object');
                    callback(error);
                });
            });
        }, function (error) {
            assert.notOk(error, 'No error should be received when opening a valid page.');
            done(error);
        });
    });

    it('Can navigate to another page', function (done) {
        var browser = new Revenant();
        var oldUrl = constants.TEST_URLS[0];
        browser
            .openPage(oldUrl)
            .then(function () {
                return browser.navigateToUrl(constants.TEST_URLS[1]);
            })
            .then(function () {
                browser.getUrl(function (error, newUrl) {

                    // just check if the domain is different because we might have been redirected
                    var isUrlDifferent = url.parse(newUrl).hostname !==  url.parse(oldUrl).hostname;
                    assert.isTrue(isUrlDifferent, 'Navigated url is different from the first url');
                    done();
                });
            })
            .catch(function (error) {
            browser.done();
            done(error);
        });
    });
});
