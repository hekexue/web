var should = require('chai').should(),
	expect = require('chai').expect,
	_ = require('lodash'),
	q = require('q');

var Spider = require('../index');

var dummy = {
	
	basicScraper: function($) {

		// Get all the links in the page
		var links = [];
		$('a').each( function(i, elem) {
			links.push( $(elem).attr('href') );
		});

		return {
			items: links,
		};
	},

	googleEngine: {
		urlTemplate: _.template('http://www.google.com/search?hl=en&q=<%= query.replace( new RegExp(" ", "g"), "+") %>&start=<%= start %>&sa=N&num=<%= windowSize %>&ie=UTF-8&oe=UTF-8'),
		initial: {
			start: 0,
			windowSize: 100,
		},
		scraper: function($) {
			var spider = this;

			var $breadcrumb = $('td.b a span'),
				$results = $('li.g');

			var data = {
				items: []
			};

			// Check if there is a `next` page
			data.more = $breadcrumb.last().text() === 'Next';

			// Get the results from this page
			$results.each( function(i, elem) {
				var $link = $(elem).find('h3.r a');

				var item = { 
					title: $link.first().text(), 
					href: $link.attr('href'),
				};

				data.items.push(item);
			});

			return data;
		},
	},
};

describe('Spider', function() {
	this.timeout(30000); // 30 seconds

	// Basic usage
	describe('basic scraper', function() {
		var spider;

		it('should build a spider', function() {
			spider = new Spider( dummy.basicScraper );

			spider.should.exist;

			spider.should.have.property('status');
			spider.status.should.equal('starting');

			spider.should.have.property('scraper');
			spider.scraper.should.be.a('function');
		});

		it('should perform a simple scrape', function(done) {
			spider.query('https://www.google.com/search?q=how+to+scrape+the+web&oq=how+to+scrape+the+web');

			spider.on('data', function(data) {
				data.should.exist;

				data.should.be.an('object');
				data.items.should.be.an('array');
				data.items.should.have.length.above(1);

				spider.kill();
				done();
			});

			spider.on('error', done);
		});
	});
	
	// Advanced usage
	describe('scraping engine', function() {
		var spider;

		it('should build a spider engine', function() {
			spider = new Spider( dummy.googleEngine );

			spider.should.exist;

			spider.should.have.property('status');
			spider.status.should.equal('starting');

			spider.should.have.property('scraper');
			spider.scraper.should.be.a('function');

			spider.should.have.property('urlTemplate');
			spider.urlTemplate.should.be.a('function');
		});

		// If an engine is provided, the spider will keep on jumping to the next page,
		// scraping all the results until there are no items left in the breadcrumb,
		// or the spider is killed.
		it('should return the results for at least two pages', function(done) {
			spider.query('how to scrape the web');
			
			var pages = 0;

			spider.on('data', function(data) {
				data.should.exist;

				data.should.be.an('object');
				data.items.should.be.an('array');
				data.items.should.have.length.above(1);

				pages++;

				if ( pages == 2 ) {
					spider.kill();
					done();
				}
			});

			spider.on('error', done);
		});
	});
});