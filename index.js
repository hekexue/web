/*   
/*      ▄████████    ▄███████▄  ▄█  ████████▄     ▄████████    ▄████████ 
/*     ███    ███   ███    ███ ███  ███   ▀███   ███    ███   ███    ███ 
/*     ███    █▀    ███    ███ ███▌ ███    ███   ███    █▀    ███    ███ 
/*     ███          ███    ███ ███▌ ███    ███  ▄███▄▄▄      ▄███▄▄▄▄██▀ 
/*    ▀██████████ ▀█████████▀  ███▌ ███    ███ ▀▀███▀▀▀     ▀▀███▀▀▀▀▀   
/*            ███   ███        ███  ███    ███   ███    █▄  ▀███████████ 
/*      ▄█    ███   ███        ███  ███   ▄███   ███    ███   ███    ███ JS
/*    ▄████████▀   ▄████▀      █▀   ████████▀    ██████████   ███    █▀ 
/*
/*   Web crawler and scraping engine
/*
/**/
( function() {
	'use strict';
	
	var debug = require('debug')('spider'),

		request = require('request').defaults({ jar: true }),
		cheerio = require('cheerio'),
		events = require('events'),
		util = require('util'),
		_ = require('lodash'),
		q = require('q');

	function Spider(options) {
		var spider = this;

		if( _.isFunction(options) )
			options = { scraper: options };

		if ( !_.isObject(options) )
			return console.error('Spider: arguments are missing');
		
		this.status      = 'starting';
		this.counts      = { retries: 0, pages: 0, items: 0 };
		this.maxRetries  = options.maxRetries || 100;

		this.proxy       = options.proxy || null;
		this.request     = options.request || request;
		
		this.scraper     = options.scraper.bind(spider);

		this.headers = _.defaults(options.headers || {}, {
			'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.143 Safari/537.36',
		});

		this.initial    = options.initial || {};

		this.urlTemplate = options.urlTemplate;

		if ( !this.urlTemplate ) {
			this.urlTemplate = function(params) {
				return params.query;
			};

			this.urlTemplate.isStatic = true;
		};

		// Auto-start if target is set
		if ( options.target ) {
			this.query( options.target );
		}

		Object.defineProperty(this, 'target', {
			get: function() {
				return this._target;
			},
			set: function(newTarget) {
				this._target = newTarget;
				spider.emit('target', newTarget);
			},
		});

		this.alive = true;
	};

	// Prototype inheritance - EventEmitter
	//
	util.inherits(Spider, events.EventEmitter);

	// Move the spider to an address
	Spider.prototype.query = function moveSpider(target) {
		var spider = this;

		if ( !spider.alive ) return;

		
		if ( !spider.target && !target )
			return spider.emit('error', 'No target specified.');

		if ( _.isString(target) )
			target = { query: target };

		spider.target = target;
		var query = spider.buildQuery();

		// Do the http request
		debug('Moving '+query.url);
		spider.emit('move', query);

		spider.request(query, function(err, res, body) {
			spider.parseHtml(err, res, body);
		});

		return spider;
	};

	Spider.prototype.buildQuery = function queryBuilder() {
		var query = {};

		if ( this.urlTemplate.isStatic )
			query.url = this.target.query;

		else
			query.url = this.urlTemplate( _.defaults(this.target, this.initial) );

		query.proxy = this.proxy;
		query.headers = this.headers;

		return query;
	};

	// Parse the response of an HTTP request 
	Spider.prototype.parseHtml = function htmlParser(err, res, body) {
		var spider = this,
			target = spider.target,
			counts = spider.counts;

		// On Success
		// Dummy using true
		if (true || !err && 200 >= res.statusCode && res.statusCode < 400) {
			debug('Got OK :)');

			var data = spider.scraper( cheerio.load(body) );

			counts.items += data.items.length;
			data.page    =  ++counts.pages;

			debug('Sending data.');
			spider.emit('data', data);

			if ( data.more && !spider.urlTemplate.isStatic ) {

				target = _.extend(target, {
					start: target.windowSize + (target.windowSize || 0),
					page: target.page + 1,
				});

				spider.moveTimeout = setTimeout( function() {
					spider.moveTimeout = null;
					spider.query(target);
				}, spider.nextPageDelay);

			} else
				spider.kill({ code: 200, message: 'Spider finished. Info: '+util.inspect(counts) });
		}

		// On Error
		else {
			var message = { code: (err ? err.code : null) || res.statusCode || 500, message: ( err ? err.message || err : '') };

			spider.counts.retries++;

			// Our IP probably got blocked.
			//
			if ( spider.counts.retries < spider.maxRetries ) {
				debug('Our IP was blocked. (Retry '+spider.counts.retries+')');
				
				// Pause the spider
				spider.paused = true;
				spider.emit('ipBlocked', target, message, body);
			}

			else {
				spider.kill('Rejected. Max retries reached. Aborting.');
			}
		}
	};

	// Stops the spider
	Spider.prototype.kill = function stopSpider(data) {
		data = data || {};

		_.defaults(data, { 
			message: 'Stopping spider', 
			code: 200 
		});

		clearTimeout(this.moveTimeout);

		debug(data.code+': '+data.message);

		this.alive = false;
		this.emit('finish', data);
	};

	exports = module.exports = Spider;

}());
