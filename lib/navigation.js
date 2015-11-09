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
var helpers = require('./helpers/helpers');
var checks = require('./checks');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36';

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
 * @param error
 * @param page
 * @param ph
 * @param [result]
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

        var phantomOptions = {
            onStdout: function (data) {
                // uncomment this to print the phantom stdout to the console
                //return console.log('PHANTOM STDOUT: ' + data);
            },
            port: port
        };


        if (helpers.platformIsWindows()) {
            phantomOptions['dnodeOpts'] = {
                weak: false
            }
        }

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

        var phantomParams = flags.concat([phantomOptions, doAfterCreate]);

        phantom.create.apply(this, phantomParams);
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
            checks.pageHasChanged(page, oldUrl, function (error) {
                callback(error);
            });
        }
    ], function (error) {
        callback(error, page, ph);
    });
}

module.exports = {
    openPage: openPage,
    navigateToUrl: navigateToUrl
};

