/**
 * Created by JiaHao on 1/9/15.
 */

var Revenant = require('revenant');

// example AJAX test page
const URL = 'http://skewedlines.github.io/ajax-test-page/';

// selector for AJAX content
const SELECTOR = '#setTimeoutContent';

// create a browser
var browser = new Revenant();

browser
    .openPage(URL)
    .then(function () {
        return browser.waitForElement(SELECTOR);
    })
    .then(function () {
        return browser.getInnerHTML(SELECTOR);
    })
    .then(function (result) {
        console.log(result); // 'BUBBLES'

        // kills the PhantomJS process
        browser.done();

    }).fail(function (error) {
        browser.done();
    });
