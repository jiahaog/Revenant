# Revenant

[![CI Build Status](https://travis-ci.org/skewedlines/Revenant.svg)](https://travis-ci.org/skewedlines/Revenant)

A headless browser powered by PhantomJS functions in Node.js. Based on the [PhantomJS-Node](https://github.com/sgentle/phantomjs-node) bridge.

## Installation

Make sure [PhantomJS](http://phantomjs.org/) is installed in your `PATH`, and run

```bash
$ npm install --save revenant
```

## Usage

Example code to open a browser, wait for a `setTimeout()` DOM selector to appear on the page, and then logs it to the console.

Functions will return a promise, which allows easy chaining of tasks.

```javascript
var Revenant = require('revenant');

// example AJAX test page
const URL = 'http://skewedlines.github.io/ajax-test-page/';

// selector for AJAX content
const SELECTOR = '#setTimeoutContent';

// create a browser
var browser = new Revenant();

browser
    .openPage(URL)
    .then(function () {
        return browser.waitForElement(SELECTOR);
    })
    .then(function () {
        return browser.getInnerHTML(SELECTOR);
    })
    .then(function (result) {
        console.log(result); // 'BUBBLES'

        // kills the PhantomJS process
        browser.done();

    }).fail(function (error) {
        browser.done();
    });
```
## API

*Todo*

The tests `/test/test.js`  are comprehensive and features good example usage of the various functions.

## Test

```bash
$ npm test
```