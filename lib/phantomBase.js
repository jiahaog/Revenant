/**
 * Base functions components to operate on top of node phantom js
 *
 * Use async.waterfall() to chain them the functions together to make life easier
 *
 * Created by JiaHao on 21/5/15.
 */

var phantom = require('phantom');
var fs = require('fs');
var findUnusedPort = require('./helpers/findUnusedPort');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36';
const POLL_INTERVAL = 1000;
const WAIT_TIMEOUT = 20000;
const CLICK_WAIT_TIME = 5000;

/**
 * @callback pageCallback callback function
 * @param err error
 * @param page
 * @param ph we hold a reference to the phantom instance so that the last callback in a chain can call ph.exit()
 */

/**
 * Persistently opens a page until the number of max retries have been reached
 * @param {string} url
 * @param {pageCallback} callback what to do on the page. The status of the page open will be passed in
 * @param {int} [retries]
 */
var openPage = function (url, callback, retries) {

    // set up default values
    const MAX_RETRIES = 5;
    const maxAttempts = retries || MAX_RETRIES;
    var counter = 0;

    if (!url) {
        console.error("Enter a valid url!");
        return;
    }

    if (!callback) {
        callback = function (error, page, ph) {
            if (error) {
                console.log("Page opened with error: " + error);
            } else {
                console.log("Page opened successfully, but no open page function defined.");
            }
            ph.exit();
        }
    }

    // finds an unused port so that if we queue up multiple phantom instances sequentially with async
    // the exception EADDRINUSE will not be triggered because phantom runs on a seperate process (I think)
    findUnusedPort(function (port) {

        // creates new Phantom instance
        phantom.create({port: port}, function(ph) {

            // create a new page
            ph.createPage(function (page) {

                // sets a user agent
                // somehow this causes the stdout for the browser to be printed to the console, so we temporarily disable
                // setting of the user agent.
                //page.set('settings.userAgent', USER_AGENT);


                // SOMEHOW commenting this out stops the random phantomjs assertion error
                // set up the log to print errors
                //page.set('onResourceError', function(resourceError) {
                //    page.set('errorReason', resourceError);
                //});

                // IIFE to keep trying to open the page recursively up to the limit
                (function recursivelyOpenPage() {

                    console.log("PHANTOM: " + url + " | attempt " + counter);

                    // opens a page
                    page.open(url, function (status) {

                        // increments the recursion counter
                        counter += 1;

                        if (status === "fail") {
                            page.get('errorReason', function (errorReason) {
                                console.error('Failed to open ' + url);
                                console.error(errorReason);

                                if (counter < maxAttempts) {
                                    console.error("Retrying...");
                                    recursivelyOpenPage();
                                } else {
                                    // execute the callback if it fails to open with undefined page
                                    callback(errorReason, undefined, ph);
                                }
                            });
                        } else {
                            // success, execute callback
                            callback(undefined, page, ph);
                        }
                    });
                })();

            })
        })
    });


};

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
var elementExists = function (page, ph, selector, callback) {

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
};

var clickElement = function (page, ph, selector, callback) {

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
};

/**
 * Evaluates gets the innerHTML of a certain selected element on a apge
 * @param page
 * @param ph
 * @param selector
 * @param callback
 */
var getInnerHtmlFromElement = function (page, ph, selector, callback) {

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

};

/**
 * @callback takeSnapshotOnCompletion
 * @param {string} error
 * @param page
 * @param ph
 * @param {string} document HTML string of the document
 */

/**
 * Takes a static snapshot of the page
 * @param page
 * @param ph
 * @param {takeSnapshotOnCompletion} callback
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
 * Writes the document to the file, and contains its own callback to automatically exit
 * @param page
 * @param ph
 * @param document
 * @param {takeSnapshotOnCompletion} callback
 */
function writeToFile(page, ph, document, callback) {

    const PATH = '../out/last_snapshot.html';

    if (!callback) {
        callback = function (error, page, ph) {

            if (error) {
                console.error('WriteToFile error' + error);
            } else {
                console.log("Snapshot written to file at path: " + PATH);
            }

            ph.exit();

        }
    }

    // parse document to get title


    fs.writeFile(PATH, document, function (error) {
        callback(error, page, ph, document);
    });
}

module.exports = {
    openPage: openPage,
    elementExists: elementExists,
    getInnerHtmlFromElement: getInnerHtmlFromElement,
    takeSnapshot: takeSnapshot,
    writeToFile: writeToFile,
    clickElement: clickElement
};

if (require.main === module) {
    const url = 'http://techcrunch.com';
    openPage(url, function (error, page, ph) {
        console.log('Page open!');
        ph.exit();
    })
}
