/**
 * Created by JiaHao on 18/8/15.
 */

var phantomBase = require('./../lib/phantomBase');

const testUrls = ['http://techcrunch.com/', 'https://www.facebook.com/'];


describe('Base PhantomJS functions', function () {
    this.timeout(30000);
    it('Can open a page', function (done) {
        phantomBase.openPage(testUrls[1], function (error, page, ph) {
            ph.exit();
            done(error);
        })
    })


});