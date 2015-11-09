/**
 * Created by JiaHao on 10/11/15.
 */

var async = require('async');
var constants = require('./constants');
var getData = require('./getData');
var helpers = require('./helpers/helpers');

/**
 * Helper function to check if a page has changed
 * Use case: Navigating to another url
 * @param page
 * @param {string} oldUrl
 * @param {nodeCallback} callback
 */
function pageHasChanged(page, oldUrl, callback) {
    var elapsed = 0;

    var newUrl;
    var urlHasChanged = false;
    var documentReady = false;
    var waitTimeOver = false;

    async.until(
        function () {
            waitTimeOver = elapsed > constants.WAIT_TIMEOUT;
            return waitTimeOver || documentReady;
        },

        function (callback) {
            // polls the page at an interval
            setTimeout(function () {
                elapsed += constants.POLL_INTERVAL;

                async.waterfall([
                    function (callback) {
                        // checks the url
                        page.get('url', function (url) {
                            newUrl = url;
                            urlHasChanged = newUrl !== oldUrl;

                            callback();
                        })
                    },
                    function (callback) {
                        if (!urlHasChanged) {
                            callback();
                            return;
                        }

                        // checks the document.readyState
                        page.evaluate(function () {
                            return (document.readyState === 'interactive') || (document.readyState === 'complete');
                        }, function (domReady) {
                            documentReady = domReady;
                            callback();
                        });
                    }
                ], function (error) {
                    // no error is triggered
                    callback();
                });
            }, constants.POLL_INTERVAL);
        },

        function (error) {
            if (waitTimeOver) {
                // todo Go back to previous url?
                callback('Timeout while navigating to ' + url);
                return;
            }

            callback();
        }
    );
}

/**
 * Helper function to check if the DOM has changed
 * Use case: Ajax function changing content of page
 * @param page
 * @param ph
 * @param {pageCallback} callback
 */
function pageDomHasChanged(page, ph, callback) {
    var elapsed = 0;
    var waitTimeOver = false;
    var domHasChanged = false;
    var originalDom = '';

    async.waterfall([
        // save the initial dom
        function (callback) {
            getData.takeSnapshot(page, ph, function (error, page, ph, dom) {
                if (error) {
                    callback (error);
                    return;
                }

                originalDom = dom;
                callback();
            });
        },

        // poll the page for changes in the dom or until timeout
        function (callback) {
            async.until(
                // conditions for stopping the poll
                function () {
                    waitTimeOver = elapsed > constants.WAIT_TIMEOUT;
                    return waitTimeOver || domHasChanged;
                },
                function (callback) {
                    // polls the page at an interval
                    setTimeout(function () {
                        elapsed += constants.POLL_INTERVAL;
                        getData.takeSnapshot(page, ph, function (error, page, ph, newDom) {
                            if (error) {
                                callback(error);
                                return;
                            }
                            domHasChanged = helpers.domIsDifferent(originalDom, newDom);
                            callback();
                        });
                    }, constants.POLL_INTERVAL);
                },

                function (error) {
                    if (waitTimeOver) {
                        callback('Timeout while waiting for dom to change');
                        return;
                    }
                    callback(error);
                }
            );
        }
    ], function (error) {
        callback(error, page, ph);
    });
}

/**
 * Waits for a callback based on the options
 * @param page
 * @param ph
 * @param oldUrl
 * @param options
 * @param {pageCallback} callback
 */
function ajaxCallback(page, ph, oldUrl, options, callback) {
    // callback for page change
    switch(options) {
        case 1:
            // expect ajax
            pageDomHasChanged(page, ph, function (error, page, ph) {
                callback(error, page, ph);
            });
            break;
        case 2:
            // expect navigation
            pageHasChanged(page, oldUrl, function (error) {
                callback(error, page, ph);
            });
            break;
        default:
            // callback immediately
            callback(null, page, ph);
            break;
    }
}

/**
 * Polls the DOM and wait until a certain string is present
 * @param page
 * @param ph
 * @param str
 * @param {pageCallback} callback
 */
function waitForString(page, ph, str, callback) {
    var elapsed = 0;
    var currentDom = '';
    var timeout = false;

    async.until(
        function () {
            timeout = elapsed > constants.WAIT_TIMEOUT;
            return currentDom.indexOf(str) > -1 || timeout;
        },

        function (callback) {
            setTimeout(function () {
                getData.takeSnapshot(page, ph, function (error, page, ph, dom) {
                    if (error) {
                        callback(error);
                        return;
                    }
                    currentDom = dom;
                    elapsed += constants.POLL_INTERVAL;
                    callback();
                })
            }, constants.POLL_INTERVAL);
        },

        function (error) {
            if (error) {
                callback(error, page, ph);
                return;
            }
            if (timeout) {
                callback('Timeout while waiting for string', page, ph);
                return;
            }
            callback(null, page, ph);
        }
    );
}

/**
 *
 * Method that waits for an element to appear on the screen
 *
 * @param page the page to search for the html selector
 *                     path
 * @param selector
 * @param {pageCallback} callback
 * @param ph
 */
function elementExists(page, ph, selector, callback) {
    // check if the element referenced by the selector exists
    function querySelectorOnBrowser(selector) {
        // stupid error catching here to stop the browser from printing null cannot be found to stdout
        var query;
        try {
            // do this to simulate a scroll to the bottom of the page to trigger loading of certain ajax elements
            //todo somehow this still doesnt work
            document.body.scrollTop = 0;
            document.body.scrollTop = 9999999999;
            //window.document.body.scrollTop = document.body.scrollHeight;
            query = document.querySelector(selector).innerHTML;

        } catch (exception) {
            return false;
        }
        return true;
    }

    var start = new Date().getTime();
    page.get('url', function (url) {
        //console.log('polling for selector: "' + selector + '" at: ' + url);
        var interval = setInterval(function checkForElement() {
            // Check if timeout first
            if ( (new Date().getTime() - start < constants.WAIT_TIMEOUT)) {

                // evaluates the function and checks if it is valid
                page.evaluate(querySelectorOnBrowser, function (result) {

                    // if the result is valid, we invoke the callback, clear the interval, and exit phantom
                    if (result) {
                        //console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                        callback(undefined, page, ph);
                        clearInterval(interval);
                    }
                }, selector);
            } else {
                // Timeout
                var errorString = 'Waiting for resource at selector "' +  selector + '", at page: ' + url + ' failed. Reason: TIMEOUT';
                callback(errorString, page, ph);
                clearInterval(interval);
            }
        }, constants.POLL_INTERVAL);
    });
}

module.exports = {
    pageHasChanged: pageHasChanged,
    pageDomHasChanged: pageDomHasChanged,
    ajaxCallback: ajaxCallback,
    waitForString: waitForString,
    elementExists: elementExists
};