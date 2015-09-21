/**
 * Base functions components to operate on top of node phantom js
 *
 * Use async.waterfall() to chain them the functions together to make life easier
 *
 * Created by JiaHao on 21/5/15.
 */

var phantom = require('phantom');
var async = require('async');
var sift = require('sift-string');
var findUnusedPort = require('./helpers/findUnusedPort');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36';
const POLL_INTERVAL = 250;
const WAIT_TIMEOUT = 20000;

// String difference threshold while checking if two DOM is similiar
const DOM_DIFFERENCE_THRESHOLD = 5;
/**
 * Standard Node.js callback
 * @callback nodeCallback
 * @param error
 * @param [result]
 */

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
            }, {
                // not sure if this will affect anything
                // https://github.com/sgentle/phantomjs-node/blob/master/README.markdown#use-it-in-windows
                dnodeOpts: {
                    weak: false
                }
            });
        };

        var phantomParams = flags.concat([portOptions, doAfterCreate]);

        phantom.create.apply(this, phantomParams);
    });
}

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
            waitTimeOver = elapsed > WAIT_TIMEOUT;
            return waitTimeOver || documentReady;
        },

        function (callback) {
            // polls the page at an interval
            setTimeout(function () {
                elapsed += POLL_INTERVAL;

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
            }, POLL_INTERVAL);
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
 * String distance to check if two DOM strings are different
 * @param oldDom
 * @param newDom
 * @returns {boolean}
 */
function domIsDifferent(oldDom, newDom) {
    var distance = sift(oldDom, newDom);
    return distance > DOM_DIFFERENCE_THRESHOLD;
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
            takeSnapshot(page, ph, function (error, page, ph, dom) {
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
                    waitTimeOver = elapsed > WAIT_TIMEOUT;
                    return waitTimeOver || domHasChanged;
                },

                function (callback) {
                    // polls the page at an interval
                    setTimeout(function () {
                        elapsed += POLL_INTERVAL;

                        takeSnapshot(page, ph, function (error, page, ph, newDom) {
                            if (error) {
                                callback(error);
                                return;
                            }

                            domHasChanged = domIsDifferent(originalDom, newDom);
                            callback();
                        });

                    }, POLL_INTERVAL);
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
 * Navigates to another url using the same page
 * @param page
 * @param ph
 * @param {string} url
 * @param {pageCallback} callback
 */
function navigateToUrl(page, ph, url, callback) {

    var oldUrl;

    async.waterfall([
        function (callback) {
            page.get('url', function (url) {
                oldUrl = url;
                callback();
            });
        },

        function (callback) {
            page.evaluate(function (url) {
                try {
                    window.location.href = url;
                } catch (exception) {
                    return exception;
                }
            }, function (error) {
                // do this because if there is no error, the error is still something so we can't simply do callback(error);
                if (error) {
                    callback(error);
                    return;
                }

                callback();
            }, url);
        },

        function (callback) {
            pageHasChanged(page, oldUrl, function (error) {
                callback(error);
            });
        }
    ], function (error) {
        callback(error, page, ph);
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
            timeout = elapsed > WAIT_TIMEOUT;
            return currentDom.indexOf(str) > -1 || timeout;
        },

        function (callback) {
            setTimeout(function () {
                takeSnapshot(page, ph, function (error, page, ph, dom) {
                    if (error) {
                        callback(error);
                        return;
                    }

                    currentDom = dom;
                    elapsed += POLL_INTERVAL;
                    callback();
                })

            }, POLL_INTERVAL);
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
 * Change the dropdown index of a dropdown box
 * @param page
 * @param ph
 * @param {array} selectorAndIndex index 0 - selector
 *                                 index 1 - value
 * @param {pageCallback} callback
 */
function changeDropdownIndex(page, ph, selectorAndIndex, callback) {
    page.evaluate(function (selectorAndIndex) {
        try {
            var selector = selectorAndIndex[0];
            var index = selectorAndIndex[1];

            var element = document.querySelector(selector);
            element.selectedIndex = index;

            // event is needed because listeners to the change do not react to
            // programmatic changes
            var event = document.createEvent('Event');
            event.initEvent('change', true, false);
            element.dispatchEvent(event);

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
    }, selectorAndIndex);
}

/**
 * Clicks a css selector on the page
 * @param page
 * @param ph
 * @param {array} selectorAndExpectAjaxChange Index 0 - {string} selector CSS Selector
 *                                            Index 1 - {boolean} expectAjaxChange if true, callback will check if the dom has changed (like ajax button),
                                                        else callback will check if the url is different
 * @param {pageCallback} callback
 */
function clickElement(page, ph, selectorAndExpectAjaxChange, callback) {

    var selector = selectorAndExpectAjaxChange[0];
    var expectAjaxChange = selectorAndExpectAjaxChange[1];

    function clickSelector(selector) {
        try {
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
        } catch (error) {
            return error
        }
    }

    var oldUrl;

    async.waterfall([
        function (callback) {
            page.get('url', function (url) {
                oldUrl = url;
                callback();
            });
        },
        function (callback) {
            page.evaluate(clickSelector, function (error) {

                // do this because if there is no error, the error is still something so we can't simply do callback(error, page, ph);
                if (error) {
                    callback(error, page, ph);
                    return;
                }

                // callback for page change

                if (expectAjaxChange) {
                    // checks if the dom has changed
                    pageDomHasChanged(page, ph, function (error, page, ph) {
                        callback(error, page, ph);
                    });
                } else {
                    // checks if the url has changed
                    pageHasChanged(page, oldUrl, function (error) {
                        callback(error, page, ph);
                    });
                }
            }, selector);
        }
    ], function (error, page, ph) {
        callback(error, page, ph);
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
 * Sets the state of a checkbox
 * @param page
 * @param ph
 * @param {Array} selectorAndState index 0 - {string} selector
 *                                 index 1 - {boolean} state
 * @param {pageCallback} callback
 */
function setCheckboxState(page, ph, selectorAndState, callback) {

    page.evaluate(function (selectorAndState) {
        try {
            var selector = selectorAndState[0];
            var state = selectorAndState[1];
            document.querySelector(selector).checked = state;
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
    }, selectorAndState);
}

/**
 * Fills a form on the page
 * @param page
 * @param ph
 * @param {Array} selectorAndValue index 0 - {string} selector
 *                                 index 1 - {string} value
 * @param {pageCallback} callback
 */
function fillForm(page, ph, selectorAndValue, callback) {

    page.evaluate(function (selectorAndValue) {
        try {
            var selector = selectorAndValue[0];
            var value = selectorAndValue[1];
            document.querySelector(selector).value = value;
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
 * Submits a form on the page
 * @param page
 * @param ph
 * @param {pageCallback} callback
 */
function submitForm(page, ph, callback) {
    var oldUrl;
    async.waterfall([
        function (callback) {
            page.get('url', function (url) {
                oldUrl = url;
                callback();
            });
        },
        function (callback) {
            page.evaluate(function () {
                try {
                    document.forms[0].submit();
                    return null;
                } catch (error) {
                    return error;
                }
            }, function (error) {
                // do this because if there is no error, the error is still something so we can't simply do callback(error, page, ph);
                if (error) {
                    callback(error);
                    return;
                }
                callback()
            });
        }, function (callback) {
            pageHasChanged(page, oldUrl, function (error) {
               callback(error);
            });
        }
    ], function (error) {
        callback(error, page, ph);
    });
}

module.exports = {
    openPage: openPage,
    navigateToUrl: navigateToUrl,
    elementExists: elementExists,
    waitForString: waitForString,
    getInnerHtmlFromElement: getInnerHtmlFromElement,
    takeSnapshot: takeSnapshot,
    changeDropdownIndex: changeDropdownIndex,
    clickElement: clickElement,
    setCheckboxState: setCheckboxState,
    fillForm: fillForm,
    getSelectorValue: getSelectorValue,
    submitForm: submitForm
};

