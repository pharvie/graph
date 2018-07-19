var MongoClient = require('mongodb').MongoClient, format = require('util').format;
	

function queryDatabase() {
	MongoClient.connect('mongodb://172.25.12.109:27017', { useNewUrlParser: true}, function(err, client) {
		if (err) {
			throw err;
		} else {
			var db = client.db("2018-7-19:0")
			db.collection('streams').find({}).toArray(function(err, results) {
				if (err) throw err;
				client.close()
				var fs = require("fs");
				fs.writeFile("streams.json", JSON.stringify(results), function(err) {
					if (err) throw err;
				})
			})
		}
	});
}
			
function writeToServer(results) {
	var server = http.createServer(function(req, res) {
		console.log('Request was made to: ' + req.url)
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(results))
	});
}
