/**
 * Base functions components to operate on top of node phantom js
 *
 * Use async.waterfall() to chain them the functions together to make life easier
 *
 * Created by JiaHao on 21/5/15.
 */

var phantom = require('phantom');
var async = require('async');
var findUnusedPort = require('./helpers/findUnusedPort');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36';
const POLL_INTERVAL = 1000;
const WAIT_TIMEOUT = 20000;
const CLICK_WAIT_TIME = 5000;

/**
 * Standard callback for functions
 *
 * @callback pageCallback callback function
 * @param err error
 * @param page
 * @param ph PhantomJS process reference
 */

/**
 * Callback that holds a result
 *
 * @callback pageResultCallback
 * @param {string} error
 * @param page
 * @param ph
 * @param result
 */

/**
 * Persistently opens a page until the number of max retries have been reached
 * @param {string} url
 * @param {pageCallback} callback what to do on the page. The status of the page open will be passed in
 * @param {Object} [options] Options to configure how the page will be opened
 * @param {Array} [options.flags] Flags which will be passed to the PhantomJS process
 * @param {int} [options.retries] Number of times PhantomJS will try to open a page
 */
function openPage(url, callback, options) {

    // set up default values
    const MAX_RETRIES = 5;

    if (options) {
        var maxAttempts = options['retries'] || MAX_RETRIES;
        var flags = options['flags'];
    } else {
        maxAttempts = MAX_RETRIES;
        flags = [];
    }

    // finds an unused port so that if we queue up multiple phantom instances sequentially with async
    // the exception EADDRINUSE will not be triggered because phantom runs on a separate process (I think)
    findUnusedPort(function (port) {

        // creates new Phantom instance

        var portOptions = {
            onStdout: function (data) {
                // uncomment this to print the phantom stdout to the console
                //return console.log('PHANTOM STDOUT: ' + data);
            },
            port: port
        };

        var doAfterCreate = function(ph) {
            // create a new page
            ph.createPage(function (page) {

                // sets a user agent
                // somehow this causes the stdout for the browser to be printed to the console, so we temporarily disable
                // setting of the user agent.
                page.set('settings.userAgent', USER_AGENT);

                // SOMEHOW commenting this out stops the random phantomjs assertion error
                // set up the log to print errors
                //page.set('onResourceError', function (resourceError) {
                //    page.set('errorReason', resourceError);
                //});

                async.retry(
                    maxAttempts,
                    function (callback) {

                        page.open(url, function (status) {
                            if (status === "fail") {
                                page.get('errorReason', function (errorReason) {

                                    if (errorReason) {
                                        var errorReasonString = JSON.stringify(errorReason);
                                    } else {
                                        errorReasonString = '';
                                    }

                                    callback('Failed to open: ' + url + ' REASON: ' + errorReasonString, [undefined, ph]);
                                });
                            } else {
                                // success

                                // check if url is valid here, so that the phantom process and page is returned
                                if (!url) {
                                    callback('Url is not valid', [page, ph]);
                                    return;
                                }

                                // success, execute callback
                                callback(null, [page, ph]);
                            }
                        });
                    },
                    function (error, results) {
                        callback(error, results[0], results[1]);
                    }
                )
            });
        };

        var phantomParams = flags.concat([portOptions, doAfterCreate]);

        phantom.create.apply(this, phantomParams);
    });
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

        //if (query) {
        //    return true;
        //} else {
        //    return false;
        //}
    }

    if (!callback) {

        callback = function (error, page, ph) {
            if (error) {
                console.error(error);
            } else {
                console.log('Resource at page found successfully');
            }

            ph.exit();

        }
    }

    var start = new Date().getTime();

    page.get('url', function (url) {
        //console.log('polling for selector: "' + selector + '" at: ' + url);

        var interval = setInterval(function checkForElement() {

            // Check if timeout first
            if ( (new Date().getTime() - start < WAIT_TIMEOUT)) {

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

        }, POLL_INTERVAL);
    });
}

function clickElement(page, ph, selector, callback) {

    function clickSelector(selector) {

        var button = document.querySelector(selector);
        var ev = document.createEvent("MouseEvent");
        ev.initMouseEvent(
            "click",
            true /* bubble */, true /* cancelable */,
            window, null,
            0, 0, 0, 0, /* coordinates */
            false, false, false, false, /* modifier keys */
            0 /*left*/, null
        );
        button.dispatchEvent(ev);
    }

    page.evaluate(clickSelector, function () {

        // wait a while for the click to change the DOM. Not entirely sure how to elegantly wait for the content to
        // change
        setTimeout(function () {
            callback(null, page, ph);
        }, CLICK_WAIT_TIME);
    }, selector);
    //page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js', function () {
    //})
}

/**
 * Evaluates gets the innerHTML of a certain selected element on a apge
 * @param page
 * @param ph
 * @param selector
 * @param {pageResultCallback} callback
 */
function getInnerHtmlFromElement(page, ph, selector, callback) {

    if (!callback) {
        callback = function (error, page, ph, result) {
            if (!error) {
                console.log('InnerHTML at id: ' + selector + 'is: ' + result);

            } else {
                console.error(error);
            }
            ph.exit();
        }
    }

    function getInnerHtml(selector) {
        return document.querySelector(selector).innerHTML;
    }

    page.evaluate(getInnerHtml, function (result) {
        if (result) {
            callback(undefined, page, ph, result);
        } else {
            var errorString = 'Error finding innerHTML';
            callback(errorString, page, ph, undefined);
        }
    }, selector);
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

            callback(undefined, page, ph, document);

            //page.render(page.title + '.png');
            //ph.exit();

        } else {
            callback('Nothing retrieved', page, ph, undefined);
        }

    });
}

/**
 *
 * @param page
 * @param ph
 * @param {Array} selectorAndValue index 0 - selector
 *                                 index 1 - value
 * @param {pageCallback} callback
 */
function fillForm(page, ph, selectorAndValue, callback) {

    page.evaluate(function (selectorAndValue) {
        try {
            var id = selectorAndValue[0];
            var value = selectorAndValue[1];
            document.querySelector(id).value = value;
            return null;
        } catch (error) {
            return error;
        }
    }, function (error) {

        // do this because if there is no error, the error is still something so we can't simply do callback(error, page, ph);
        if (error) {
            callback(error, page, ph);
            return;
        }

        callback(null, page, ph);
    }, selectorAndValue);
}

/**
 *
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
 *
 * @param page
 * @param ph
 * @param {pageCallback} callback
 */
function submitForm(page, ph, callback) {
    // todo make this trigger callback only when page changes - see window.onhashchange
    page.evaluate(function () {
        try {
            document.forms[0].submit();
            return null;
        } catch (error) {
            return error;
        }
    }, function (error) {
        if (error) {
            callback(error, page, ph);
            return;
        }

        callback(null, page, ph);
    });
}

module.exports = {
    openPage: openPage,
    elementExists: elementExists,
    getInnerHtmlFromElement: getInnerHtmlFromElement,
    takeSnapshot: takeSnapshot,
    clickElement: clickElement,
    fillForm: fillForm,
    getSelectorValue: getSelectorValue,
    submitForm: submitForm
};

