var server = require('./server');
var database = require('./database')
var dateObj = new Date();

dateObj.setDate(dateObj.getDate()-1)
var yesterday = dateObj.getFullYear() + "-" + (dateObj.getMonth() + 1) + "-" + dateObj.getDate()
database.queryDatabase('streams', yesterday)
database.queryDatabase('hosts', 'hosts')
database.queryDatabase('titles', 'titles')
server.startServer()