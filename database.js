'use strict';

var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var server = require('./server');
var assert = require('assert');
var fs = require('fs');
 
var findDocuments = function(db, callback) {
// Get the documents collection
	var collection = db.collection('2018-7-24:0');
	// Find some documents
	collection.find({}).toArray(function(err, docs) {
		assert.equal(err, null);
		console.log("Found the following records");
		callback(docs);
	});
}

var writeJSONToFile = function(string) {
	fs.writeFile('streams.json', string, function(err) {
		assert.equal(err, null);

	});
}
 
var queryDatabase = function() {
	console.log('Querying database')
	MongoClient.connect('mongodb://172.25.12.109:27017', { useNewUrlParser: true}, function(err, client) {
		assert.equal(err, null);
		var db = client.db("streams")
		findDocuments(db, function(docs) {
			writeJSONToFile(JSON.stringify(docs))
			client.close()
		});
	});
}

module.exports = {
	queryDatabase: queryDatabase
}
