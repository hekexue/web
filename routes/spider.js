var express = require('express');
var router = express.Router();

var Spider = require('spider-engine');
var fs = require('fs');
var mkdirp = require('mkdirp');
var request = require('request');
var imageSrcCache = {};

function FsWriter() {
  this.dir = __dirname + "/../files"
  this.writeFile = function(filePath, fileName, data, callback) {
      var me = this;
      mkdirp(this.dir + filePath, function(err) {
        fs.writeFile(me.dir + filePath + fileName, data, callback);
      });
    }
    //fs.writeFile(filename, data, [options], callback)
}


function requestImg(url, filePath) {
  if (url && filePath) {
    request
      .get(url)
      .on('response', function(response) {
        var body = [];
        var fileWriteStream = fs.createWriteStream(filePath);
        response.on('data', function(chunk) {
          if (response.statusCode == 200) {
            // body.push(chunk);
            console.log("wreteFile:" + filePath);
            fileWriteStream.write(chunk);
          }
        });

        response.on("end", function() {
          fileWriteStream.end();
        })
        response.on("error", function(err) {
          if (err) {
            console.log(err);
          }
        })
      })
  }
}



router.get('/', function(req, res) {
  console.log('spider requested');
  res.render("spider", {
    title: "spider"
  });
})

router.get('/do', function(req, res) {
  var query = req.query;
  var url = query.url || "http://www.google.com/design/spec/material-design/introduction.html";
  var httpExpreg = /^((\w+):\/\/)?((\w+):?(\w+)?@)?([^\/\?:]+):?(\d+)?(\/?[^\?#]+)?\??([^#]+)?#?(\w*)/g;
  var fileNameExp = /\/(\w+[-_]*)+\.\w+$/g;
  var links = [];
  var srcs = [];
  if (url) {
    var spider = new Spider(function($) {
      $('img').each(function(i, elem) {
        var src = $(elem).attr('src');
        srcs.push(src);
      })
      for (var i = 0, len = srcs.length; i < len; i++) {
        var src = srcs[i];
        src = src.indexOf("//") === 0 ? "http:" + src : "http://www.google.com" + src;
        var fileName = src.substring(src.lastIndexOf("/"));
        var filePath = "";
        if (fileName) {
          filePath = __dirname + "/../files/images" + fileName;
          if (!imageSrcCache[filePath]) {
            imageSrcCache[filePath] = true;
            requestImg(src, filePath);
          }
        }
      }
      ++spider.deepth;
      // Get all the links in the page
      if (spider.deepth > 1) {
        return {
          items: []
        };
      }
      $('a').each(function(i, elem) {
        var link = $(elem).attr('href');
        link = "http://www.google.com" + link;
        // if (httpExpreg.test(link) === true) {
        links.push(link);
        // }
      });
      for (var i = 0, len = links.length; i < len; i++) {
        var link = links[i];
        spider.query(link);
      }
      return {
        items: links
      }
    });

    spider.query(url);
    spider.deepth = 0;
    spider.page = 0;
    spider.on('data', function(results, body, currentQuery) {
      var url = currentQuery.url;
      var exp = /\/(\w+[-]*)+\.html$/g;
      console.log(url);
      // if (httpExpreg.test(url)) {
      var fileName = exp.exec(url);
      console.log(fileName);
      if (fileName) {
        fileName = fileName[0];
        var filePath = url.replace("http://www.google.com", "").replace(fileName, "");

        var writer = new FsWriter();
        writer.writeFile(filePath, fileName, body, function(err) {
          if (err) {
            console.log(err);
          }
        });
      }

      console.log(results); // -> returned data from the scraper;  
      // }

    });
  }


  res.send('ok');
})


module.exports = router;