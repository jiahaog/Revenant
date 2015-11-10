/**
 * Created by JiaHao on 10/11/15.
 */

var chai = require('chai');
var assert = chai.assert;

var constants = require('./constants');
var Revenant = require('./../lib/Revenant');

describe('Browser Actions', function () {
    this.timeout(constants.TIMEOUT);
    it('Can change the selected index of a dropdown box', function (done) {
        var browser = new Revenant();
        var url = constants.AJAX_TEST_PAGE;

        const DROPDOWN_SELECTOR = '#dropdown';
        const CHANGE_TO_INDEX = 3;

        const RESULT_BOX_SELECTOR = '#dropdown-selected-result';
        // expected value after change
        const FINAL_VALUE = 'index3';
        browser
            .openPage(url)
            .then(function () {
                return browser.changeDropdownIndex(DROPDOWN_SELECTOR, CHANGE_TO_INDEX);
            })
            .then(function () {
                return browser.getInnerHTML(RESULT_BOX_SELECTOR);
            })
            .then(function (result) {
                assert.isTrue(result.indexOf(FINAL_VALUE) > -1, 'Awaited result that shows the selected index should be "index3"');
                browser.done();
                done();
            })
            .catch(function (error) {
                browser.done();
                done(error);
            });
    });

    it('Can change the state of a checkbox', function (done) {
        var browser = new Revenant();
        var url = constants.AJAX_TEST_PAGE;

        const CHECKBOX_SELECTOR = '#checkbox';
        const RESULT_BOX_SELECTOR = '#checkbox-state';
        // expected value after change
        const FINAL_VALUE = 'true';
        browser
            .openPage(url)
            .then(function () {
                // default .checked is false, so change it to true
                return browser.setCheckboxState(CHECKBOX_SELECTOR, true);
            })
            .then(function () {
                return browser.getInnerHTML(RESULT_BOX_SELECTOR);
            })
            .then(function (result) {
                assert.isTrue(result.indexOf(FINAL_VALUE) > -1, 'Awaited result that shows the checkbox state should show true');
                browser.done();
                done();
            })
            .catch(function (error) {
                browser.done();
                done(error);
            });
    });

    it('Can fill a form and query a form for its value', function (done) {
        var browser = new Revenant();
        var url = constants.AJAX_TEST_PAGE;

        const USERNAME_SELECTOR = '#form-username';
        const PASSWORD_SELECTOR = '#form-password';

        const USERNAME = 'user123';

        browser
            .openPage(url)
            .then(function () {
                return browser.fillForm(USERNAME_SELECTOR, USERNAME);
            })
            .then(function () {
                return browser.getSelectorValue(USERNAME_SELECTOR);
            }).then(function (result) {
            assert.equal(result, USERNAME, 'Username should be equal to filled value');
            browser.done();
            done();
        }).catch(function (error) {
            done(error);
        });
    });

    it('Can click a hyperlink', function (done) {
        var browser = new Revenant();
        var url = constants.AJAX_TEST_PAGE;
        const HYPERLINK_SELECTOR = '#hyperlink-to-button-test';

        browser
            .openPage(url)
            .then(function () {
                return browser.clickElement(HYPERLINK_SELECTOR, 2);
            })
            .then(function () {
                return browser.getUrl();
            })
            .then(function (finalUrl) {
                assert.equal(finalUrl, constants.AJAX_TEST_PAGE_BUTTON, 'Final url is the test page for button clicks');
                browser.done();
                done();
            })
            .catch(function (error) {
                browser.done();
                done(error);
            });
    });

    it('Can click a button which triggers ajax change in the page', function (done) {
        var browser = new Revenant();
        const BUTTON_SELECTOR = '#ajax-button';
        const RESULT_BOX_SELECTOR = '#ajax-button-result';
        const EXPECTED_RESULT = 'CAKES ARE AWESOME';
        browser
            .openPage(constants.AJAX_TEST_PAGE_BUTTON)
            .then(function () {
                return browser.clickElement(BUTTON_SELECTOR, 1);
            })
            .then(function () {
                return browser.getInnerHTML(RESULT_BOX_SELECTOR);
            })
            .then(function (result) {
                assert.isTrue(result.indexOf(EXPECTED_RESULT) > -1, 'Result box result should be correct');
                browser.done();
                done();
            })
            .catch(function (error) {
                browser.done();
                done(error);
            });
    });
});
