
var svgHeight = 600;
var svgWidth = 1000;
var infoHeight = 600;
var infoWidth = 400;
var leavesMinorAxis= svgHeight*.4;
var leavesMajorAxis = svgWidth *.4;
var rootsMinorAxis = svgHeight *.5;
var rootsMajorAxis = svgWidth * .5;
var rootRadius = 20;
var maxLeafRadius = 15;
var minLeafRadius = 3;
var children = {}
// transition variables
var selectedLeaf = null
var clickedRadius = maxLeafRadius + 50;
var transitioningLeaves = []
var centerSpace = (clickedRadius + maxLeafRadius * 1.125)
var streams, hosts, edges

jsonPrep.prepareJSON(streams, host, edges)

var graphSVG = d3.select('div#graph-container')
	.append('svg')
	.attr("id", "graph-svg")
	.attr("width", svgWidth)
	.attr("height", svgHeight)
	.style('background-color', 'white')

	
var edgesGroup = graphSVG
	.append('g')
	.attr('id', 'edges')

var selectedEdgesGroup = graphSVG
	.append("g")
	.attr("id", "selected-edges")

var leavesGroup = graphSVG
	.append('g')
	.attr('id', 'leaves')
	
var rootsGroup = graphSVG	
	.append('g')
	.attr('id', 'roots')


streamsXHR = new XMLHttpRequest();
streamsXHR.onreadystatechange = function() {
	if (streamsXHR.readyState === 4) {
		streams = JSON.parse(streamsXHR.responseText);
		hostsXHR = new XMLHttpRequest();
		hostsXHR.onreadystatechange = function() {
			if (hostsXHR.readyState === 4) {
				hosts = JSON.parse(hostsXHR.responseText);
				createButtons()
				prepareStreams()
				prepareHosts()
				createCircles(rootsGroup, hosts)
				createCircles(leavesGroup, streams)
				setTimeout(function(){createEdges()}, 0)
			}
		}
		hostsXHR.open('GET', 'http://127.0.0.1:3000/hosts.json');
		hostsXHR.send();
	}
}
streamsXHR.open('GET', 'http://127.0.0.1:3000/streams.json',);
streamsXHR.send();
*/

var createButtons = function() {
	buttonData = [
		{"text": "Hide broken links"},
		{"text": "Clear all hosts"}]
	d3.select("div#buttons")	
		.selectAll("buttons")
		.data(buttonData)
		.enter()
		.append("button")
		.text(function(d){return d.text});
}


var prepareStreams = function() {
	var maxImportance = Number.NEGATIVE_INFINITY
	var minImportance = Number.POSITIVE_INFINITY
	for (var i = 0, iLen = streams.length; i < iLen; i++)	{
		var workingLink = false
		var brokenLink = false
		var doc = streams[i]
		doc.importance = 0
		doc.edges = []
		for (var j = 0, jLen = doc.network_locations.length; j < jLen; j++) {
			var netloc = doc.network_locations[j]
			doc.importance += 1
			if (netloc.working_link === true) {
				workingLink = true
			} else {
				brokenLink = true
			}
		}
		
		/*
		for (var j = 0, jLen = linked_by.length; j < jLen; j++) {
			doc.importance += 4
			var host = linked_by[k]
			if (children[host] == null) {
				children[host] = []
			} 
			if (children[host].indexOf(doc.ip_address) === -1) {
				children[host].push(doc.ip_address)
			}
			if (doc.edges.indexOf(host + "-" + doc.ip_address) === -1) {
				doc.edges.push(host + "-" + doc.ip_address)
			}
		}*/
		
		if (doc.importance > maxImportance) {
			maxImportance = doc.importance;
		} 
		if (doc.importance < minImportance) {
			minImportance = doc.importance;
		}
		if (workingLink === true && brokenLink === true) {
			doc.link_status = 'mixed';
			doc.color = '#ffff00';
		} else if (workingLink === true) {
			doc.link_status = 'working';
			doc.color = '#336600';
		} else {
			doc.link_status = 'broken'
			doc.color = '#ff0000';
		}
		doc.id = doc.ip_address
		doc.opacity = 1
		doc.state = "leaf"
	}
	
	var linearScale = d3.scaleLinear()
		.domain([minImportance, maxImportance])
		.range([minLeafRadius, maxLeafRadius]);
	
	for (var i = 0, iLen = streams.length; i < iLen; i++)	{
		var doc1 = streams[i]
		while (true) {
			doc1.cx = Math.floor(Math.random()*svgWidth);
			doc1.cy = Math.floor(Math.random()*svgHeight);
			dist = distance(doc1.cx, svgWidth/2, doc1.cy, svgHeight/2)
			if (dist < centerSpace) {
				continue
			}
			if (inEllipse(doc1.cx, svgWidth/2, leavesMajorAxis + maxLeafRadius, doc1.cy, svgHeight/2, leavesMinorAxis + maxLeafRadius) <= 1) {
				break;
			}
		}
		doc1.radius = linearScale(doc1.importance);
	}
}

var prepareHosts = function() {
	for (var i = 0, iLen = hosts.length; i < iLen; i++) {
		var doc1 = hosts[i]
		while (true) {
			doc1.cx = Math.floor(Math.random()*svgWidth)
			doc1.cy = Math.floor(Math.random()*svgHeight)
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
			rootEllipse = inEllipse(doc1.cx, svgWidth/2, rootsMajorAxis - rootRadius, doc1.cy, svgHeight/2, rootsMinorAxis - rootRadius)
			if (rootEllipse < 1 && rootEllipse > .975) {
				break;
			}
		}
		doc1.radius = rootRadius
		doc1.opacity = 1
		doc1.id = doc1.host
		doc1.color = "#f48342"
		doc1.children = []
		doc1.state = "root"
		if (children[doc1.host] != null){
			doc1.children =  children[doc1.host]
		}
		hosts[i] = doc1
	}
}

var prepareEdges = function() {
	var edgesData = []
	for (var i = 0, iLen = hosts.length; i < iLen; i++) {
		hostData = hosts[i]
		host = document.getElementById(hostData.host)
		children = hostData.children
		for (var j = 0, jLen = children.length; j < jLen; j++) {
			leaf = document.getElementById(children[j])
			leafData = d3.select(leaf).datum()
			lineData = {'x1': leafData.cx, 'x2': hostData.cx, 'y1': leafData.cy, 'y2': hostData.cy, 'root': host, 'leaf': leaf, 'id': hostData.id + "-" + leafData.id}
			edgesData.push(lineData)
		}
	}
	return edgesData;
}




var createCircles = function(group, data) {
	group.selectAll('circle')
		.data(data)
		.enter()
		.append('circle')
		.attr('id', function(d){return d.id})
		.attr('cx', function(d){return d.cx;})
		.attr('cy', function(d){return d.cy;})
		.attr('r', function(d){return d.radius;})
		.style('fill', function(d){return d3.rgb(d.color);})
		.style('opacity', function(d){return d.opacity})
		.on("click", handleNodeClick)
		.on("mouseover", hoverOn)
		.on("mouseout", hoverOff)
}

var createEdges = function() {
	edgesData = prepareEdges()
	edgesGroup.selectAll("line")
		.data(edgesData)
		.enter()
		.append("line")
		.attr('id', function(d){return d.id})
		.attr('x1', function(d){return d.x1;})
		.attr('x2', function(d){return d.x2;})
		.attr('y1', function(d){return d.y1;})
		.attr('y2', function(d){return d.y2;})
		.attr("stroke", "gray")
		.attr("stroke-width", ".5px")
}

var handleNodeClick = function() {
	nodeData = d3.select(this).datum()
	if (nodeData.state === "leaf") {
		if (selectedLeaf !== this) {
			selectLeaf(this)
		} else {
			deselectLeaf(this)
		}
	}
}

var selectLeaf = function(leaf) {
	if (selectedLeaf !== null) {
		deselectLeaf(selectedLeaf)
	}
	selectedLeaf = leaf
	d3.select(leaf)
		.transition()
		.attr("cx", svgWidth/2)
		.attr("cy", svgHeight/2)
		.attr("r", clickedRadius)
		.attr("stroke", "black")
		.attr("stroke-width", "2px")
	boldEdges(leaf)
	alterTextArea(leaf)
}

var deselectLeaf = function(leaf) {
	transitioningLeaves.push(leaf)
	d3.select(leaf)
		.transition()
		.attr("cx", function(d){return d.cx})
		.attr("cy", function(d){return d.cy})
		.attr("r", function(d){return d.radius})
		.attr("stroke", null)
		.attr("stroke-width", null)
		.on("end", function(){transitioningLeaves.splice(transitioningLeaves.indexOf(leaf), 1)})
	selectedLeaf = null
	deboldEdges(leaf)
	clearTextArea()
}

var hoverOn = function() {
	d3.select(this).style("cursor", "pointer");
	if (transitioningLeaves.indexOf(this) === -1 && selectedLeaf !== this) {
		d3.select(this)
			.transition()
			.attr("stroke", "black")
			.attr("stroke-width", "2px")
	}
}

var hoverOff = function() {
	if (transitioningLeaves.indexOf(this) === -1 && selectedLeaf !== this) {
		d3.select(this)
			.transition()
			.attr("stroke", null)
			.attr("stroke-width", null)
	}
}

var boldEdges = function(leaf) {
	leafData = d3.select(leaf).datum()
	edges = leafData.edges
	for (var i=0, len = edges.length; i < len; i++) {
		edge = document.getElementById(edges[i])
		d3.select(edge).raise()
		d3.select(edge)
			.transition()
			.attr("stroke", "black")
			.attr("stroke-width", "1.5px")
			.attr("x1", svgWidth/2)
			.attr("y1", svgHeight/2)
	}
}

var deboldEdges = function(leaf) {
	leafData = d3.select(leaf).datum()
	edges = leafData.edges
	for (var i=0, len = edges.length; i < len; i++) {
		edge = document.getElementById(edges[i])
		d3.select(edge)
			.transition()
			.attr("stroke", "gray")
			.attr("stroke-width", ".5px")
			.attr("x1", leafData.cx)
			.attr("y1", leafData.cy)
	}
}

var alterTextArea = function(leaf) {
	leafData = d3.select(leaf).datum()
	d3.select("div#info")
		.selectAll("p")
		.remove()
	addIP(leaf)
	addLinkedBy(leafData.linked_by)
	addNetlocs(leafData.network_locations)
}


var addIP = function(leaf) {
	leafData = d3.select(leaf).datum()
	d3.select("div#info")
		.append("p")
		.text("IP address: " + leafData.ip_address)
}

var addLinkedBy = function(hosts) {
	d3.select("div#info")
		.append("p")
		.text("Linked by:")
		.attr("id", "linked-by")
	linkedByText = document.getElementById("linked-by")
	for (var i = 0, len = hosts.length; i < len; i++) {
		if (i === 5) {
			d3.select(linkedByText)
				.append("li")
				.text("Show more...")
				.on("mouseover", function() {d3.select(this).style("cursor", "pointer");})
				.on("click", function() {showMoreLinkedBy(hosts)})
				break;
		} else {
			d3.select(linkedByText)
				.append("li")
				.text(hosts[i])
		}	
	}
}

var addNetlocs = function(netlocs) {
	d3.select("div#info")
		.append("p")
		.text("Network locations:")
		.attr("id", "netlocs")
	netlocsText = document.getElementById("netlocs")
	for (var i = 0, len = netlocs.length; i < len; i++) {
		if (i === 5) {
			d3.select(netlocsText)
				.append("li")
				.text("Show more...")
				.on("mouseover", function() {d3.select(this).style("cursor", "pointer");})
				.on("click", function() {showMoreNetlocs(netlocs)})
				break;
		} else {
			d3.select(netlocsText)
				.append("li")
				.text(netlocs[i].network_location)
		}	
	}
}

var showMoreLinkedBy = function(hosts) {
	d3.select("div#info")
		.selectAll("p")
		.remove()
	d3.select("div#info")
		.append("p")
		.attr("id", "linked-by")
		.text("Linked by:")
	linkedByText = document.getElementById("linked-by")
	for (var i = 0, len = hosts.length; i < len; i++) {
		d3.select(linkedByText)
			.append("li")
			.text(hosts[i])
	}
	d3.select(linkedByText)
		.append("li")
		.text("Go back")
		.on("mouseover", function() {d3.select(this).style("cursor", "pointer");})
		.on("click", function() {alterTextArea(selectedLeaf)})
}

var showMoreNetlocs = function(netlocs) {
	d3.select("div#info")
		.selectAll("p")
		.remove()
	d3.select("div#info")
		.append("p")
		.attr("id", "netlocs")
		.text("Host names:")
	netlocsText = document.getElementById("netlocs")
	for (var i = 0, len = netlocs.length; i < len; i++) {
		d3.select(netlocsText)
			.append("li")
			.text(netlocs[i].network_location)
	}
	d3.select(netlocsText)
		.append("li")
		.text("Go back")
		.on("mouseover", function() {d3.select(this).style("cursor", "pointer");})
		.on("click", function() {alterTextArea(selectedLeaf)})
}

var clearTextArea = function() {
	d3.select("div#info")
		.selectAll("p")
		.remove()
	d3.select("div#info")
		.append("p")
		.text("No node is currently selected, click on a node to view its information.")
}

var distance = function(x1, x2, y1, y2) {
	xDiff = Math.abs(x1 - x2)
	yDiff = Math.abs(y1 - y2)
	dist = Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2))
	return dist;
}

var inEllipse = function(x, h, rx, y, k, ry) {
	return Math.pow(x-h, 2)/Math.pow(rx, 2) + Math.pow(y-k, 2)/ Math.pow(ry, 2)
}