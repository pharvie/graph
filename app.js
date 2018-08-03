/*********************************************------------*********************************************************************
Trying to add a configuration file to this document? Look no further than this.
The date of the collection from the database accessed can be changed in this file at line 10
**********************************************------------*********************************************************************/


var database = require('./database')
var dateObj = new Date();
var lookback = 0 // change the value of this number to change how many days the program looks back to find the collection of streams

dateObj.setDate(dateObj.getDate()-lookback)
var yesterday = dateObj.getFullYear() + "-" + (dateObj.getMonth() + 1) + "-" + dateObj.getDate()
database.queryDatabase('streams', yesterday)
database.queryDatabase('hosts', 'hosts')
database.queryDatabase('titles', 'titles')