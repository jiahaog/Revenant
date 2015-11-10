/**
 * Created by JiaHao on 5/10/15.
 */

var os = require('os');
var sift = require('sift-string');

function platformIsWindows() {
    var platform = os.platform();
    return platform.indexOf('win') > -1;
}

// String difference threshold while checking if two DOM is similiar
const DOM_DIFFERENCE_THRESHOLD = 5;

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
 * Transforms an array of cookies objects into a request header
 * @param cookies {array}
 * @returns {string}
 */
function cookieToHeader(cookies) {
    const SEPARATOR = '; ';
    return cookies.reduce(function (previous, current) {
        return previous + current.name + '=' + current.value + SEPARATOR;
    }, '');
}

module.exports = {
    platformIsWindows: platformIsWindows,
    domIsDifferent: domIsDifferent,
    cookieToHeader: cookieToHeader
};
