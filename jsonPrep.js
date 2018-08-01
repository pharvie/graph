var database = require('./database')


var graphHeight = 600;
var graphWidth = 1140;
var leavesMinorAxis= graphHeight*.35;
var leavesMajorAxis = graphWidth *.35;
var rootsMinorAxis = graphHeight *.475;
var rootsMajorAxis = graphWidth * .475;
var rootRadius = 20;
var maxLeafRadius = 15;
var minLeafRadius = 3;
var children = {}
var brokenLinks = {}
var workingLinks = {}
var mixedLinks = {}
var clickedRadius = maxLeafRadius + 50;
var centerSpace = (clickedRadius + maxLeafRadius * 1.125);



var prepareStreams = function(streams) {
	for (var i = 0, iLen = streams.length; i < iLen; i++)	{
		var doc1 = streams[i]
		while (true) {
			doc1.cx = Math.floor(Math.random()*graphWidth);
			doc1.cy = Math.floor(Math.random()*graphHeight);
			dist = distance(doc1.cx, graphWidth/2, doc1.cy, graphHeight/2)
			if (dist < centerSpace) {
				continue
			}
			if (inEllipse(doc1.cx, graphWidth/2, leavesMajorAxis + maxLeafRadius, doc1.cy, graphHeight/2, leavesMinorAxis + maxLeafRadius) <= 1) {
				break;
			}
		}
		streams[i] = doc1
	}
	return streams
}

var prepareHosts = function(hosts) {
	for (var i = 0, iLen = hosts.length; i < iLen; i++) {
		var doc1 = hosts[i]
		while (true) {
			doc1.cx = Math.floor(Math.random()*graphWidth)
			doc1.cy = Math.floor(Math.random()*graphHeight)
			var validPlacement = true
			for (var j = 0, jLen = hosts.length; j < i; j++) {
				doc2 = hosts[j]
				dist = distance(doc1.cx, doc2.cx, doc1.cy, doc2.cy)
				if (dist < rootRadius*3) {
					validPlacement = false
					break
				}
			}
			if (validPlacement === false) {
				continue
			}
			rootEllipse = inEllipse(doc1.cx, graphWidth/2, rootsMajorAxis - rootRadius, doc1.cy, graphHeight/2, rootsMinorAxis - rootRadius)
			if (rootEllipse < 1 && rootEllipse > .975) {
				break;
			}
		}
		hosts[i] = doc1
	}
	
	return hosts
}

var inEllipse = function(x, h, rx, y, k, ry) {
	return Math.pow(x-h, 2)/Math.pow(rx, 2) + Math.pow(y-k, 2)/ Math.pow(ry, 2)
}


var distance = function(x1, x2, y1, y2) {
	xDiff = Math.abs(x1 - x2)
	yDiff = Math.abs(y1 - y2)
	dist = Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2))
	return dist;
}

module.exports = {
	prepareStreams: prepareStreams,
	prepareHosts: prepareHosts
}
