var server = require('./server');
var database = require('./database')

database.queryDatabase()
server.startServer()