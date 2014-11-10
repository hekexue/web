## Spider

[![NPM version](https://badge.fury.io/js/spider-engine.svg)](http://badge.fury.io/js/spider-engine)

Web crawling and scraping engine powered by NodeJS.

### How to use

To create a new spider, you can do:

```js
var Spider = require('spider-engine');
var spider = new Spider(scraper || options);

spider.query(params);
```

The spider is an `EventEmitter`, so you can get the scraped results as they come in, by doing:

```js
spider.on('data', function (data) {
	results = data.items;
	// ...do something with the results
});

spider.on('finish', function(data) {
	console.log('Spider finished with code '+data.code+'. ' + data.message);
});
```

### API

#### Spider(scraper:Function)

Creates a new basic spider with the provided scraper.

```js
// example:

var Spider = require('spider-engine');

var spider = new Spider( function($) {

	// Get all the links in the page
	var links = [];
	$('a').each( function(i, elem) {
		links.push( $(elem).attr('href') );
	});

	return {
		items: links,
	};
});

spider.query('http://en.wikipedia.org/wiki/Web_scraping');

spider.on('data', function(results) {
	console.log(results); // -> returned data from the scraper;
});
```

#### Spider(options:Object)

Creates a new spider engine with the provided parameters.

The following options are supported:

- `urlTemplate ( Function(queryParams) )` The function used to build the query. If no function is provided, the query will be used as is, and the spider won't automatically jumpt to the next page. You can use underscore's _.template function to generate your query templates.
- `scraper ( Function($) )` The function that will be used to process the response's HTML. This function must returns an object containing:
  - `items (Array)` The items to be scraped. You can build your items freely, this is what the spider will emit when scraping the site.
  - `more (Boolean)` If the `more` flag is set, the spider will request the next target. The next target is the same target with the `start` parameter increased by `windowSize`.
- `proxy (String) (optional)` - The proxy address to use. If no proxy is provided, the local IP will be used instead.
- `defaults (Object) (optional)` Default values when building the URL.
- `headers (String) (optional)` The headers to be sent as part of the spider's requests.
- `maxRetries (Number) (default: 100)` If our IP is blocked, re-try to scrape the results this amount of times.


#### Spider::query(`queryParams`:`Object`)

```js
spider.query('Scraping in nodejs');
```

The `queryParams` can be a string, or an object with the following properties:
- `query (String)` The query string to use. If a urlTemplate is provided, this string will be available in the construction of the url, under the variable name `query`. If no urlTemplate is provided, this string will be used as is. In other words, if you do not provide a urlTemplate, make sure to put the whole URL here.
- `windowSize (Number) (default: 100)` The window size to use.
- `start (Number) (default: 0)` The starting value. If a urlTemplate is provided and the scraper function returns the "more" flag, this number will be increased by `windowSize`, and the spider will move to the next target (Which is a queryString built with the urlTemplate function provided)


#### Spider::kill()

Stops the spider. This will also trigger the `finish` event.

```js
spider.kill();
```

### Events

Spider inherits from `EventEmitter`, so the following events can be emitted from a spider:

- `start` - The spider has started.
- `move` - The spider started a HTTP request
- `data` - The spider scraped and returned results
- `ipBlocked` - Our IP gets rejected from the server (Useful for logging, or to handle IP changes)
- `finish` - The spider has finished.


## Tests

`make test`

Cheers.
