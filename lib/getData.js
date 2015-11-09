/**
 * Created by JiaHao on 10/11/15.
 */

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

module.exports = {
    takeSnapshot: takeSnapshot,
    getInnerHtmlFromElement: getInnerHtmlFromElement,
    getSelectorValue: getSelectorValue,
    getSelectorAttribute: getSelectorAttribute,
};
