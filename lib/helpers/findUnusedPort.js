/**
 * A module to get an open port randomly
 *
 * This is better than portscanner https://github.com/baalexander/node-portscanner
 * in that ports are generated randomly instead of sequentially
 *
 * Created by JiaHao on 21/7/15.
 */


var Chance = require('chance');
var chance = new Chance();
var async = require('async');
var net = require('net');

/**
 * @callback isPortOpenCallback
 * @param openPort the port that is open, or null if the port is in use
 */

/**
 * Helper to check if a port is open
 * @param port
 * @param {isPortOpenCallback} callback
 */
function isPortOpen(port, callback) {

    var server = net.createServer();
    server.listen(port, function (err) {
        server.once('close', function () {
            callback(port);
        });
        server.close();
    });
    server.on('error', function (err) {
        callback(null);
    });
}


/**
 * @callback getOpenPortCallback
 * @param openPort an open port
 */

/**
 * Gets an open port
 * @param {getOpenPortCallback} callback
 */
function findUnusedPort(callback) {

    // todo define min and max by function arguments

    //var a = Math.floor(Math.random() * 30000) + 4000;
    var randomPort = chance.integer({
        min: 30000,
        max: 60000
    });

    isPortOpen(randomPort, function (openPort) {
        if (!openPort) {
            //console.log('NOT OPEN : ' + port);
            findUnusedPort(callback);
        } else {
            callback(openPort);
        }
    });
}

module.exports = findUnusedPort;

if (require.main === module) {

    // test

    var count = 0;

    async.forever(function (next) {

        findUnusedPort(function (port) {
            isPortOpen(port, function (isportopen) {

                if (!isportopen) {
                    console.log(port);
                }
                count++;

                if (count > 10000) {
                    next('slalala');
                } else {
                    next();
                }
            })
        });


    }, function (error) {
        console.log('DONE')
    });

    findUnusedPort(function (openPort) {
        console.log('OPEN PORT: ' + openPort);
    })
}