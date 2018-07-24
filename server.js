var http = require('http');
var fs = require('fs');

var startServer = function(responseContent) {
	var server = http.createServer(function(req, res) {
		console.log(req.url)
		handleUrl(req, res)
	});
	server.listen(3000, '127.0.0.1')
	console.log('Listening on port 3000')
}

var handleUrl = function(req, res) {
	if (req.url === '/') {
		res.writeHead(200, {'Content-Type': 'text/html'});
		console.log('Getting index')
		var myReadStream = fs.createReadStream(__dirname + '/index.html', 'utf-8');
	} else if (req.url === '/streams.json') {
		res.writeHead(200, {'Content-Type': 'application/json'});
		var myReadStream = fs.createReadStream(__dirname + '/streams.json', 'utf-8');
	} else if (req.url === '/d3.min.js') {
		res.writeHead(200, {'Content-Type': 'text/javascript'})
		var myReadStream = fs.createReadStream(__dirname + '/d3.min.js', 'utf-8');
	} else {
		console.log(404)
		res.writeHead(404, {'Content-Type': 'text/html'})
		var myReadStream = fs.createReadStream(__dirname + '/404.html', 'utf-8');
	}
	myReadStream.pipe(res);
}

module.exports = {
	startServer: startServer
}
