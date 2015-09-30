# Revenant

[![CI Build Status](https://travis-ci.org/skewedlines/Revenant.svg)](https://travis-ci.org/skewedlines/Revenant)

A headless browser powered by PhantomJS functions in Node.js. Based on the [PhantomJS-Node](https://github.com/sgentle/phantomjs-node) bridge. 

This library aims to abstract many of the simple functions one would use while testing or scraping a web page. Instead of running `page.evaluate(...)` and entering the javascript functions for a task, these tasks are abstracted for the user. 

For example, a robust syntax to click an element on a page that has to be executed in the browser javascript environment is: 

```javascript
 var button = document.querySelector(SELECTOR);
 var ev = document.createEvent("MouseEvent");
 ev.initMouseEvent(
     "click",
     true /* bubble */, true /* cancelable */,
     window, null,
     0, 0, 0, 0, /* coordinates */
     false, false, false, false, /* modifier keys */
     0 /*left*/, null
 );
 button.dispatchEvent(ev);
```

With Revenant, the equivalent would be:  

```javascript
revenant.clickElement(SELECTOR, 0, callback);
```
When to execute the callback can also be configured, if we desire to wait for some ajax element to appear. See the API documentation below for more details.

## Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api)
	- Initialisation
	- `openPage`
	- `getUrl`
	- `navigateToUrl`
	- `takeSnapshot`
	- `waitForElement`
	- `getInnerHTML`
	- `changeDropdownIndex`
	- `clickElement`
	- `fillForm`
	- `submitForm`
	- `done`
- [Test](#test)



## Installation

Make sure [PhantomJS](http://phantomjs.org/) is installed in your `PATH`, and run

```bash
$ npm install --save revenant
```

## Usage

Example code to open a browser, wait for an element to appear on the page, and then logs its innerHTML to the console.

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

All API functions return a promise, and if desired, they can be used to chain callbacks. Alternatively, the conventional node callback can be provided as the last argument in these functions.

## API


### Initialisation

`Revenant` is the main object to simulate a browser. Initialise an instance with `new`, and call `done()` to kill the PhantomJS process when the task is completed.

**Example**

```javascript
var browser = new Revenant();

browser
	.openPage(URL)
	
	.then(//... do things )
	
	.then(function (result) {
		browser.done();
	})
	.fail(function (error) {
		browser.done();
	});
```

### openPage(url, [callback])

Opens a url within PhantomJS. Always call this function first to initialise the browser and open a page, before continuing with other tasks.

**Arguments**

- `url` – `string` Url to open
- `callback(error)` – *Optional* `function` Callback called when the page has been opened

### getUrl([callback])

Gets the current url of the browser.

**Arguments**

- `callback(error, url)` – *Optional* `function` Callback called when the url has been retrieved

### navigateToUrl(url, [callback])

Navigates the current page to another url.

**Arguments**

- `callback(error)` – *Optional* `function` Callback called when a new page is loaded and the DOM is ready

### takeSnapshot([callback])

Takes a snapshot of the DOM into a string.

**Arguments**

- `callback(error, dom)` – *Optional* `function` Callback called when a new page is loaded and the DOM is ready. `dom` will be a snapshot of the entire document as a `string`

### waitForElement(selector, [callback])

Polls the page and waits for a particular CSS selector to appear. 

**Arguments**

- `selector` – `string` CSS selector to choose the element to wait for
- `callback(error)` – *Optional* `function` Callback called when that css selector is now present on the page

### waitForDomString(stringQuery, [callback])

Like `waitForElement()`, except that it waits for a particular string to appear in the DOM before executing the callback.

**Arguments**

- `stringQuery` – `string` To query the DOM for
- `callback(error)` – *Optional* `function` Callback called when the `stringQuery` is found contained in the DOM.

### getInnerHTML(selector, [callback])

Polls the page and waits for a particular CSS selector to appear, and then gets the innerHTML of that element .

**Arguments**

- `selector` – `string` CSS selector to choose the element to wait for
- `callback(error, innerHtml)` – *Optional* `function` Callback called when that css selector is now present on the page

### changeDropdownIndex(selector, value, [callback])

Changes the selected index of a dropdown element.

**Arguments**

- `selector` – `string` CSS selector to choose the dropdown element
- `value` – `integer` index of the dropdown to switch to
- `callback(error)` – *Optional* `function` Callback called when the dropdown index has been changed

### clickElement(selector, options, [callback])

Clicks a element on the page

**Arguments**

- `selector` – `string` CSS selector to choose the element to click
- `options` – `integer` Options to affect when to execute the callback.
	- `0` – Execute callback immediately after clicking
	- `1` – Expect an ajax change in the page, only execute callback when the DOM has changed by a certain threshold
	- `2` – Expect page navigation, so execute the callback only when the url changes and the new document is ready
- `callback(error)` – *Optional* `function` Callback called when the criteria set in `options` has been met

### setCheckboxState(selector, state, [callback])

Sets the state of a checkbox. Also fires an event to simulate a mouse click of the checkbox.

**Arguments**

- `selector` – `string` CSS selector to choose the checkbox element
- `state` – `boolean` Value to indicate if the checkbox should be checked
- `callback(error)` – *Optional* `function` Callback called when the dropdown index has been changed

### fillForm(selector, value, [callback])

Fills a form on the page.

**Arguments**

- `selector` – `string` CSS selector to choose the form element
- `value` – `string` Value to fill the form 
- `callback(error)` – *Optional* `function` Callback called when the form has been filled

### submitForm([callback])

Submits the form on the page.

**Arguments**

- `callback(error)` – *Optional* `function` Callback called when the form has been submitted, the page has reached a new url, and the document is ready


## Test

```bash
$ npm test
```