/**********************************************-----------*********************************************************************
Trying to add a configuration file to this document? Look no further than this.
The IP address of the database is located on line 31, change that to change the location of the database
**********************************************------------*********************************************************************/

'use strict';
var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var server = require('./server');
var assert = require('assert');
var JSONPrepper = require('./jsonPrep')
var fs = require('fs');

 
var findDocuments = function(db, collectionName, callback) {
	var collection = db.collection(collectionName);
	collection.find({}).toArray(function(err, docs) {
		assert.equal(err, null);
		callback(docs);
	});
}

var writeJSONToFile = function(string, filename) {
	fs.writeFile(filename, string, function(err) {
		assert.equal(err, null);

	});
}
 
var queryDatabase = function(dbName, collectionName) {
	MongoClient.connect('mongodb://18.207.154.217:27017', { useNewUrlParser: true}, function(err, client) { // change the IP address on this line to change the location of the database
		assert.equal(err, null);
		var db = client.db(dbName)
		findDocuments(db, collectionName, function(docs) {
			if (collectionName === "hosts") {
				docs = JSONPrepper.prepareHosts(docs)
				writeJSONToFile(JSON.stringify(docs), dbName + '.json')
			} else if (collectionName === "titles") {
				writeJSONToFile(JSON.stringify(docs), dbName + '.json')
			} else {
				docs = JSONPrepper.prepareStreams(docs)
				writeJSONToFile(JSON.stringify(docs), dbName + '.json')
			}
		});
	});
}

module.exports = {
	queryDatabase: queryDatabase,
	writeJSONToFile: writeJSONToFile
}
