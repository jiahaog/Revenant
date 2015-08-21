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

            if (task === phantomBase.openPage) {
                task(arguments, function (error, page, ph) {
                    self.phantom = ph;
                    self.page = page;
                    callback(error);
                });
            } else {

                if (!self.page) {
                    callback('Page is not open');
                    return;
                }

                var taskArguments = [self.page, self.phantom, arguments, function (error, page, ph, result) {
                    callback(error, result);
                }];

                // removes any null elements from the list
                taskArguments = taskArguments.filter(function (element) {
                    return !!element;
                });

                task.apply(this, taskArguments);

            }

        }, QUEUE_CONCURRENCY);
    },

    /**
     * Private helper function to push a task
     * @param task
     * @param argument
     * @param callback
     * @private
     */
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
        return this;
    },

    takeSnapshot: function(callback) {
        this.__pushTask(phantomBase.takeSnapshot, null, callback);
        return this;
    },

    done: function () {
        this.phantom.exit();
        this.page = undefined;
        this.phantom = undefined;
    }

};

module.exports = PhantomHigh;