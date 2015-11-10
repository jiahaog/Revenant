/**
 * Created by JiaHao on 10/11/15.
 */

var async = require('async');
var request = require('request');
var helpers = require('./helpers/helpers');

/**
 * Gets the current url of the page
 * @param page
 * @param ph
 * @param {pageResultCallback} callback
 */
function getCurrentUrl(page, ph, callback) {
    page.get('url', function (url) {
        callback(null, page, ph, url);
    });
}

/**
 * Takes a static snapshot of the page
 * @param page
 * @param ph
 * @param {pageResultCallback} callback
 */
function takeSnapshot(page, ph, callback) {
    page.evaluate(function () {
        return document.documentElement.outerHTML;
    }, function (document) {
        if (document) {
            callback(null, page, ph, document);
        } else {
            callback('Nothing retrieved', page, ph, null);
        }
    });
}

/**
 * Evaluates gets the innerHTML of a certain selected element on a apge
 * @param page
 * @param ph
 * @param selector
 * @param {pageResultCallback} callback
 */
function getInnerHtmlFromElement(page, ph, selector, callback) {
    function getInnerHtml(selector) {
        return document.querySelector(selector).innerHTML;
    }

    page.evaluate(getInnerHtml, function (result) {
        if (result) {
            callback(null, page, ph, result);
        } else {
            var errorString = 'Error finding innerHTML';
            callback(errorString, page, ph, null);
        }
    }, selector);
}

/**
 * @param page
 * @param ph
 * @param {Array} selectorAndAttribute index 0 - {string} selector
 *                                 index 1 - {string} desired attribute
 * @param {pageResultCallback} callback
 */
function getSelectorAttribute(page, ph, selectorAndAttribute, callback) {
    page.evaluate(function (selectorAndAttribute) {
        try {
            var selector = selectorAndAttribute[0];
            var desiredAttribute = selectorAndAttribute[1];
            return [null, document.querySelector(selector).getAttribute(desiredAttribute)];
        } catch (error) {
            return [error];
        }
    }, function (result) {
        var error = result[0];
        if (error) {
            callback(error, page, ph);
            return;
        }

        var attribute = result[1];
        callback(null, page, ph, attribute);

    }, selectorAndAttribute);
}

/**
 * Gets the .value of a selector
 * @param page
 * @param ph
 * @param selector
 * @param {pageResultCallback} callback
 */
function getSelectorValue(page, ph, selector, callback) {
    page.evaluate(function (selector) {
        try {
            return [null, document.querySelector(selector).value];
        } catch (error) {
            return [error];
        }
    }, function (result) {
        var error = result[0];
        var selectorValue = result[1];
        if (error) {
            callback(error, page, ph);
            return;
        }
        callback(null, page, ph, selectorValue);
    }, selector);
}

/**
 * Downloads a file from a url
 * @param page
 * @param ph
 * @param {string} url
 * @param {pageResultCallback} callback
 */
function downloadFromUrl(page, ph, url, callback) {
    async.waterfall([
        function (callback) {
            page.getCookies(function (cookie) {
                callback(null, page, ph, cookie);
            });
        },
        function (page, ph, cookies, callback) {
            var cookieString = helpers.cookieToHeader(cookies);
            var headers = { Cookie: cookieString };
            request.get({
                url: url,
                headers: headers,
                encoding: null
            }, function (error, response, downloadedBytes) {
                callback(error, page, ph, downloadedBytes);
            });
        }
    ], callback);
}

/**
 * Clicks an element on the page and downloads the file behind the element
 * @param page
 * @param ph
 * @param {string} selector
 * @param {pageResultCallback} callback
 */
function downloadFromClick(page, ph, selector, callback) {
    const HREF_KEY = 'href';
    async.waterfall([
        function (callback) {
            getSelectorAttribute(page, ph, [selector, HREF_KEY], callback);
        },
        function (page, ph, relativeHref, callback) {
            getCurrentUrl(page, ph, function (error, page, ph, currentUrl) {
                if (error) {
                    callback(error, page, ph);
                    return;
                }
                callback(null, page, ph, currentUrl + relativeHref);
            });
        },
        function (page, ph, url, callback) {
            downloadFromUrl(page, ph, url, callback);
        }
    ], callback);
}

module.exports = {
    getCurrentUrl: getCurrentUrl,
    takeSnapshot: takeSnapshot,
    getInnerHtmlFromElement: getInnerHtmlFromElement,
    getSelectorValue: getSelectorValue,
    getSelectorAttribute: getSelectorAttribute,
    downloadFromUrl: downloadFromUrl,
    downloadFromClick: downloadFromClick
};
