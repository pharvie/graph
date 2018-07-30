'use strict';

var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var server = require('./server');
var assert = require('assert');
var fs = require('fs');
 
var findDocuments = function(db, collectionName, callback) {
	var collection = db.collection(collectionName);
	collection.find({}).toArray(function(err, docs) {
		assert.equal(err, null);
		console.log("Found the following records");
		callback(docs);
	});
}

var writeJSONToFile = function(string, filename) {
	fs.writeFile(filename, string, function(err) {
		assert.equal(err, null);

	});
}
 
var queryDatabase = function(dbName, collectionName) {
	MongoClient.connect('mongodb://172.25.12.109:27017', { useNewUrlParser: true}, function(err, client) {
		assert.equal(err, null);
		var db = client.db(dbName)
		findDocuments(db, collectionName, function(docs) {
			writeJSONToFile(JSON.stringify(docs), dbName + '.json')
		});
	});
}

module.exports = {
	queryDatabase: queryDatabase
}
