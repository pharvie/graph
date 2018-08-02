var http = require('http');
var fs = require('fs');

var startServer = function(responseContent) {
	var server = http.createServer(function(req, res) {
		console.log(req.url)
		handleUrl(req, res)
	});
	server.listen('54.89.39.38')
}

var handleUrl = function(req, res) {
	if (req.url === '/graph') {
		res.writeHead(200, {'Content-Type': 'text/html'});
		var myReadStream = fs.createReadStream(__dirname + '/index.html', 'utf-8');
	} else if (req.url === '/streams.json') {
		res.writeHead(200, {'Content-Type': 'application/json'});
		var myReadStream = fs.createReadStream(__dirname + '/streams.json', 'utf-8');
	} else if (req.url === '/hosts.json') {
		res.writeHead(200, {'Content-Type': 'application/json'});
		var myReadStream = fs.createReadStream(__dirname + '/hosts.json', 'utf-8');
	} else if (req.url === '/titles.json') {
		res.writeHead(200, {'Content-Type': 'application/json'});
		var myReadStream = fs.createReadStream(__dirname + '/titles.json', 'utf-8');
	}else if (req.url === '/d3.min.js') {
		res.writeHead(200, {'Content-Type': 'text/javascript'})
		var myReadStream = fs.createReadStream(__dirname + '/d3.min.js', 'utf-8');
	} else if (req.url === '/graph.js') {
		res.writeHead(200, {'Content-Type': 'text/javascript'})
		var myReadStream = fs.createReadStream(__dirname + '/graph.js', 'utf-8');
	} else if (req.url === '/style.css') {
		res.writeHead(200, {'Content-Type': 'text/css'})
		var myReadStream = fs.createReadStream(__dirname + '/style.css', 'utf-8');
	} 
	
	else {
		console.log(404)
		res.writeHead(404, {'Content-Type': 'text/html'})
		var myReadStream = fs.createReadStream(__dirname + '/404.html', 'utf-8');
	}
	myReadStream.pipe(res);
}

module.exports = {
	startServer: startServer
}
