/**
 * Created by JiaHao on 10/11/15.
 */

var async = require('async');
var checks = require('./checks');

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
 * @param {array} selectorAndOptions Index 0 - {string} selector CSS Selector
 *                                    Index 1 - {int} options
 *                                             0 – callback immediately
 *                                             1 – expect ajax, callback when the dom changes
 *                                             2 – expect page navigation, callback when the url changes and document is ready
 * @param {pageCallback} callback
 */
function clickElement(page, ph, selectorAndOptions, callback) {

    var selector = selectorAndOptions[0];
    var options = selectorAndOptions[1];

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
                checks.ajaxCallback(page, ph, oldUrl, options, callback);
            }, selector);
        }
    ], function (error, page, ph) {
        callback(error, page, ph);
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
            var element = document.querySelector(selector);
            element.checked = state;

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
            checks.pageHasChanged(page, oldUrl, function (error) {
                callback(error);
            });
        }
    ], function (error) {
        callback(error, page, ph);
    });
}

module.exports = {
    changeDropdownIndex: changeDropdownIndex,
    clickElement: clickElement,
    setCheckboxState: setCheckboxState,
    fillForm: fillForm,
    submitForm: submitForm
};
