/**
 * Created by JiaHao on 19/8/15.
 */

var async = require('async');
var Promise = global.Promise || require('bluebird');

var navigation = require('./navigation');
var actions = require('./actions');
var checks = require('./checks');
var getData = require('./getData');

/**
 * A headless browser based on PhantomJS
 *
 * @param {Object} [options]
 * @constructor
 */
function Revenant(options) {
    this.options = options;
    this.initQueue();
}

Revenant.prototype = {
    constructor: Revenant,

    initQueue: function () {
        var self = this;
        const QUEUE_CONCURRENCY = 1;

        self.taskQueue = async.queue(function(parameters, callback) {

            var task = parameters.task;
            var arguments = parameters.argument;

            if (task === navigation.openPage) {
                task(
                    arguments,
                    function (error, page, ph) {
                        self.phantom = ph;
                        self.page = page;

                        page.get('url', function (url) {
                            self.__url = url;

                            if (error) {
                                callback(error);
                                return;
                            }

                            callback();

                        });

                    },
                    self.options
                );
            } else {
                if (!self.page) {
                    callback('Page is not open');
                    return;
                }
                var taskArguments = [self.page, self.phantom, arguments, function (error, page, ph, result) {
                    page.get('url', function (url) {
                        self.__url = url;
                        callback(error, result);
                    });
                }];

                // removes any null elements from the list
                taskArguments = taskArguments.filter(function (element) {
                    return !!element;
                });
                task.apply(this, taskArguments);
            }
        }, QUEUE_CONCURRENCY);
    },

    getUrl: function (callback) {
        var self = this;

        return promiseOrCallback(callback, function (resolve) {
            // if page is available (meaning that the page has been opened or .done() has not been called),
            // get the current url
            if (self.page) {
                self.page.get('url', function (url) {
                    self.__url = url;
                    resolve(url);
                });
            } else {
                // just get the cached url at the end of every method call
                resolve(self.__url);
            }
        });
    },

    /**
     * Private helper function to push a task
     * @param task
     * @param argument
     * @param callback
     * @returns {Promise}
     * @private
     */
    __pushTask: function (task, argument, callback) {
        var self = this;
        var queueArgument = {
            task: task,
            argument: argument
        };

        return promiseOrCallback(callback, function (resolve, reject) {
            self.taskQueue.push(queueArgument, function (error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    },

    // navigation

    openPage: function (url, callback) {
        return this.__pushTask(navigation.openPage, url, callback);
    },

    navigateToUrl: function (url, callback) {
        return this.__pushTask(navigation.navigateToUrl, url, callback);
    },

    // checks

    waitForElement: function (selector, callback) {
        return this.__pushTask(checks.elementExists, selector, callback);
    },

    waitForDomString: function (stringQuery, callback) {
        return this.__pushTask(checks.waitForString, stringQuery, callback);
    },

    // get data

    getInnerHTML: function (selector, callback) {
        return this.__pushTask(getData.getInnerHtmlFromElement, selector, callback);
    },

    takeSnapshot: function(callback) {
        return this.__pushTask(getData.takeSnapshot, null, callback);
    },

    getSelectorValue: function (selector, callback) {
        return this.__pushTask(getData.getSelectorValue, selector, callback);
    },

    getSelectorAttribute: function (selector, attributeKey, callback) {
        return this.__pushTask(getData.getSelectorAttribute, [selector, attributeKey], callback);
    },

    // actions

    changeDropdownIndex: function (selector, value, callback) {
        return this.__pushTask(actions.changeDropdownIndex, [selector, value], callback);
    },

    /**
     * Clicks an element
     * @param {string} selector
     * @param {int} options 0 – callback immediately
     *                      1 – expect ajax, callback when the dom changes
     *                      2 – expect page navigation, callback when the url changes and document is ready
     * @param callback
     */
    clickElement: function (selector, options, callback) {
        return this.__pushTask(actions.clickElement, [selector, options], callback);
    },

    /**
     * Sets the state of a checkbox
     * @param {string} selector
     * @param {boolean} state
     * @param callback
     * @returns {Promise}
     */
    setCheckboxState: function (selector, state, callback) {
        return this.__pushTask(actions.setCheckboxState, [selector, state], callback);
    },

    fillForm: function (selector, value, callback) {
        return this.__pushTask(actions.fillForm, [selector, value], callback);
    },

    submitForm: function (callback) {
        return this.__pushTask(actions.submitForm, null, callback);
    },

    /**
     * Kills the phantom process. Does nothing if it has not been started initially
     */
    done: function () {
        // Guard to prevent duplicate call of .exit();
        if (this.phantom) {
            this.phantom.exit();
            this.page = null;
            this.phantom = null;
        }
    }
};

/**
 * Build a promise, with an optional node-style callback attached
 */
function promiseOrCallback (callback, executor) {
    var promise = new Promise(executor);

    // no callback: do not attach
    if (typeof callback !== 'function') {
        return promise;
    }

    return promise.then(function (value) {
        setImmediate(function () {
            callback(null, value);
        });
        return value;
    }, function (error) {
        setImmediate(function () {
            callback(error);
        });
        throw error;
    });
}

module.exports = Revenant;
