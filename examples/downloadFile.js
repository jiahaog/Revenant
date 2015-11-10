/**
 * Created by JiaHao on 10/11/15.
 */

var fs = require('fs');
var Revenant = require('./../lib/Revenant');

function loginAndDownload(userId, password, downloadLocation) {
    var browser = new Revenant();

    const URL = 'http://edimension.sutd.edu.sg/mod/resource/view.php?id=45539';
    const DOWNLOAD_LINK = 'http://edimension.sutd.edu.sg/pluginfile.php/55668/mod_resource/content/1/assignment2.pdf';

    browser
        .openPage(URL)
        .then(function () {
            return browser.fillForm('#username', userId);
        })
        .then(function () {
            return browser.fillForm('#password', password);
        })
        .then(function () {
            return browser.submitForm();
        })
        .then(function () {
            return browser.downloadFromUrl(DOWNLOAD_LINK);
        })
        .then(function (downloadedBytes) {
            fs.writeFileSync(downloadLocation + '/assignment2.pdf', downloadedBytes);
            browser.done();
            console.log('Done, assignment2.pdf is saved to: ' + downloadLocation + '/assignment2.pdf');
        })
        .catch(function (error) {
            browser.done();
            console.error(error);
        });
}

if (require.main === module) {
    const USER_ID = 'username';
    const USER_PASSWORD = 'password';
    loginAndDownload(USER_ID, USER_PASSWORD, __dirname);
}
