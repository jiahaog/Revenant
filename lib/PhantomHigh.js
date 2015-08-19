/**
 * Created by JiaHao on 19/8/15.
 */

var async = require('async');

var phantomBase = require('./phantomBase');



function PhantomHigh() {
    this.initQueue();
}


PhantomHigh.prototype = {
    constructor: PhantomHigh,

    initQueue: function () {
        var self = this;
        const QUEUE_CONCURRENCY = 1;

        self.taskQueue = async.queue(function(parameters, callback) {
            var task = parameters.task;
            var arguments = parameters.argument;

            if (!self.page) {
                task(arguments, function (error, page, ph) {
                    self.phantom = ph;
                    self.page = page;
                    callback(error);
                });
            } else {

                var taskArguments = [self.page, self.phantom, arguments, function (error, page, ph, result) {
                    callback(error, result);
                }];

                taskArguments = taskArguments.filter(function (element) {
                    return !!element;
                });

                task.apply(this, taskArguments);

            }

        }, QUEUE_CONCURRENCY);
    },

    __pushTask: function (task, argument, callback) {
        var self = this;
        var queueArgument = {
            task: task,
            argument: argument
        };

        self.taskQueue.push(queueArgument, callback);

    },

    openPage: function (url, callback) {
        this.__pushTask(phantomBase.openPage, url, callback);
    },

    takeSnapshot: function(callback) {
        this.__pushTask(phantomBase.takeSnapshot, null, callback);
    },

    done: function () {
        this.phantom.exit();
    }


};

module.exports = PhantomHigh;