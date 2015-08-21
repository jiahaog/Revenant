# Phantom High



[![CI Build Status](https://travis-ci.org/skewedlines/PhantomHigh.svg)](https://travis-ci.org/skewedlines/PhantomHigh)

High level PhantomJS functions in Node.js. Based on the [PhantomJS-Node](https://github.com/sgentle/phantomjs-node) bridge.


## Installation
Make sure PhantomJS is installed in your `PATH` and run

TODO - NOT PUBLISHED YET
```bash
$ npm install --save phantom-high
```

## Usage

Example code to open a browser, wait for a `setTimeout()` DOM selector to appear on the page, and then logs it to the console.

```javascript
// create a browser
var browser = new PhantomHigh();

// example AJAX test page
const URL = 'http://skewedlines.github.io/ajax-test-page/';

// selector for AJAX content
const SELECTOR = '#setTimeoutContent';

browser
    .openPage(url)
    .waitForElement(SELECTOR)
    .getInnerHTML(SELECTOR, function (error, result) {

        if (error) {
            console.error(error);
            return;
        }

        console.log(result); // 'BUBBLES'

        // kills the phantomJS process
        browser.done();

    });
```
## API

Todo

## Test

```bash
$ npm test
```