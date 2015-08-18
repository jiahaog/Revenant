/**
 * Created by JiaHao on 18/8/15.
 */


var async = require('async');
var phantomBase = require('./../lib/phantomBase');


const testUrls = ['http://techcrunch.com/', 'https://www.facebook.com/'];


describe('Testing base PhantomJS functions', function () {
    this.timeout(50000);
    it('Can open a page', function (done) {

        async.each(testUrls, function (testUrl, callback) {
            phantomBase.openPage(testUrl, function (error, page, ph) {
                ph.exit();
                callback(error);
            });
        }, function (error) {
           done(error);
        });

    })


});