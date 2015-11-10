/**
 * Created by JiaHao on 10/11/15.
 */

var chai = require('chai');
var assert = chai.assert;
var request = require('request');

var constants = require('./constants');
var Revenant = require('./../lib/Revenant');

describe('Browser Data Transfer', function () {
    this.timeout(constants.TIMEOUT);
    it('Can get a snapshot', function (done) {
        var browser = new Revenant();
        var url = constants.TEST_URLS[0];
        browser
            .openPage(url)
            .then(function () {
                return browser.takeSnapshot();
            })
            .then(function (result) {
                assert.include(result, '</html>', 'Snapshot results contain closing </html> tag');
                browser.done();
                done();
            }).catch(function (error) {
            browser.done();
            done(error);
        });
    });

    it('Can wait for an element to appear and can get the innerHTML of the element', function (done) {
        var browser = new Revenant();
        var url = constants.AJAX_TEST_PAGE;

        const SELECTOR = '#setTimeoutContent';
        browser
            .openPage(url)
            .then(function () {
                return browser.waitForElement(SELECTOR);
            })
            .then(function () {
                return browser.getInnerHTML(SELECTOR);
            })
            .then(function (result) {
                assert.isTrue(result.indexOf('BUBBLES') > -1, 'Awaited element innerHTML should contain "BUBBLES"');
                browser.done();
                done();
            }).catch(function (error) {
            browser.done();
            done(error);
        });
    });

    it('Can wait for an element to appear by quering the DOM for a string', function (done) {
        var browser = new Revenant();
        var url = constants.AJAX_TEST_PAGE;

        const stringQuery = 'BUBBLES HI';
        browser
            .openPage(url)
            .then(function () {
                return browser.waitForDomString(stringQuery);
            })
            .then(function () {
                return browser.takeSnapshot();
            })
            .then(function (dom) {
                assert.isTrue(dom.indexOf(stringQuery) > -1, 'DOM should contain "BUBBLES HI"');
                browser.done();
                done();
            }).catch(function (error) {
            browser.done();
            done(error);
        });
    });

    it('Can get attributes from a html element', function (done) {
        var browser = new Revenant();
        const SELECTOR = '#attribute-test-div';
        const ATTRIBUTE_KEY = 'data-test-value';
        const EXPECTED_VALUE = "bread";

        browser
            .openPage(constants.AJAX_TEST_PAGE)
            .then(function () {
                return browser.getSelectorAttribute(SELECTOR, ATTRIBUTE_KEY);
            })
            .then(function (value) {
                assert.equal(value, EXPECTED_VALUE, 'Retrieved attribute value should be equal to expected value');
                browser.done();
                done();
            })
            .catch(function (error) {
                browser.done();
                done(error);
            });
    });

    describe('File Download', function () {
        it('Can download files from URL', function (done) {
            var browser = new Revenant();
            const FILE_URL = 'http://jiahaog.github.io/ajax-test-page/public/exampleFile.pdf';
            browser
                .openPage(constants.AJAX_TEST_PAGE)
                .then(function () {
                    return browser.downloadFromUrl(FILE_URL);
                })
                .then(function (downloaded) {
                    request(
                        {url: FILE_URL, encoding: null},
                        function (error, response, correctFile) {
                            if (error) {
                                browser.done();
                                done(error);
                                return
                            }
                            assert.equal(downloaded.toString(), correctFile.toString(), 'The downloaded file should be equal to the correct file');
                            browser.done();
                            done();
                        }
                    );
                })
                .catch(function (error) {
                    browser.done();
                    done(error);
                });
        });

        it('Can download files from clicking an element', function (done) {
            var browser = new Revenant();
            const SELECTOR = '#download-link';
            const CORRECT_FILE_URL = 'http://jiahaog.github.io/ajax-test-page/public/exampleFile.pdf';
            browser
                .openPage(constants.AJAX_TEST_PAGE)
                .then(function () {
                    return browser.downloadFromClick(SELECTOR);
                })
                .then(function (downloaded) {
                    request(
                        {url: CORRECT_FILE_URL, encoding: null},
                        function (error, response, correctFile) {
                            if (error) {
                                browser.done();
                                done(error);
                                return
                            }
                            assert.equal(downloaded.toString(), correctFile.toString(), 'The downloaded file should be equal to the correct file');
                            browser.done();
                            done();
                        }
                    );
                })
                .catch(function (error) {
                    browser.done();
                    done(error);
                });
        });
    });
});
