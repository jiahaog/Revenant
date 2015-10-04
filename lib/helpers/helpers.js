/**
 * Created by JiaHao on 5/10/15.
 */

var os = require('os');

function platformIsWindows() {
    var platform = os.platform();
    return platform.indexOf('win') > -1;
}

module.exports = {
    platformIsWindows: platformIsWindows
};