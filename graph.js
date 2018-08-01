
var graphHeight = 600;
var graphWidth = 1140;
var chartHeight = 350;
var chartWidth = 400;
var infoHeight = 600;
var infoWidth = 400;
var leavesMinorAxis= graphHeight*.35;
var leavesMajorAxis = graphWidth *.35;
var rootsMinorAxis = graphHeight *.475;
var rootsMajorAxis = graphWidth * .475;
var rootRadius = 20;
var maxLeafRadius = 15;
var minLeafRadius = 3;
var children = {}
var edgesGroup, leavesGroup, rootsGroup
// transition variables
var selectedLeaf = null;
var clickedRadius = maxLeafRadius + 50;
var transitioningLeaves = [];
var centerSpace = (clickedRadius + maxLeafRadius * 1.125);
var streams, hosts, edges;
var completeStreams = [];
var selectedRoot = null;
var leafEdges = {};
var brokenHidden = false;
var mixedHidden = false;
var selectedDropdown = null;
var streamsDisplayed = 0;
var currentSelectedIndex = null;
var workingLinks = {};
var mixedLinks = {};
var brokenLinks = {};

var graphSVG = d3.select('div#graph-container')
	.append('svg')
	.attr("id", "graph-svg")
	.attr("width", graphWidth)
	.attr("height", graphHeight)
	.style('background-color', 'white')
	
var deleteGroups = function() {
	d3.select("g#edges")
		.remove()
	d3.select("g#leaves")
		.remove()
	d3.select("g#roots")
		.remove()
}
	
var createGroups = function() {
	deleteGroups()
	edgesGroup = graphSVG
		.append('g')
		.attr('id', 'edges')

	leavesGroup = graphSVG
		.append('g')
		.attr('id', 'leaves')
	
	rootsGroup = graphSVG	
		.append('g')
		.attr('id', 'roots')
}	

streamsXHR = new XMLHttpRequest();
streamsXHR.onreadystatechange = function() {
	if (streamsXHR.readyState === 4) {
		streams = JSON.parse(streamsXHR.responseText);
		hostsXHR = new XMLHttpRequest();
		hostsXHR.onreadystatechange = function() {
			if (hostsXHR.readyState === 4) {
				createButtons()
				hosts = JSON.parse(hostsXHR.responseText);
				prepareLeaves()
				prepareRoots()
				sortLeaves()
				createGraph()
				createStreamStatusBarChart("total")
				createDropdownSelection()
			}
		}
		hostsXHR.open('GET', 'http://127.0.0.1:3000/hosts.json');
		hostsXHR.send();
	}
}
streamsXHR.open('GET', 'http://127.0.0.1:3000/streams.json');
streamsXHR.send();

var sortLeaves = function() {
	var sortedLeaves = []
	for (var i=0, iLen = completeStreams.length; i < iLen; i++) {
		doc = completeStreams[i]
		if (doc.stream_status === "Working" || (doc.stream_status === "Broken" && brokenHidden === false) || (doc.stream_status) === "Mixed" && mixedHidden === false && leafEdges[doc.id].length > 0) {
			doc.importance = 0
			doc.importance += leafEdges[doc.id].length*4
			doc.importance += doc.network_locations.length
			sortedLeaves.push(doc)
		}
	}
	streams = quickSort(sortedLeaves)
}

var quickSort = function(list) {
	if (list.length <= 1) {
		return list
	} 
	var rand = Math.floor(Math.random() * list.length)
	pivot = list[rand].importance
	var L = []
	var E = []
	var G = []
	for (var i=0; i < list.length; i++) {
		if (list[i].importance < pivot) {
			L.push(list[i])
		} else if (list[i].importance > pivot) {
			G.push(list[i])
		} else {
			E.push(list[i])
		}
	}
	return quickSort(G).concat(E).concat(quickSort(L)) 
}

var createGraph = function() {
	createGroups()
	createCircles(rootsGroup, hosts)
	createCircles(leavesGroup, streams)
	setTimeout(function(){
		createEdges()
	}, 0)
}

var createBarChart = function(data) {
	d3.select("div#chart-container")
		.selectAll("svg")
			.remove()
	
	var chartSVG = d3.select("div#chart-container")
	.append('svg')
	.attr("id", "chart-svg")
	.attr("width", chartWidth)
	.attr("height", chartHeight)
	.style('background-color', 'white')
	
	d3.select(chartSVG),
    margin = {top: 20, right: 20, bottom: 30, left: 40},
		width =+ chartSVG.attr("width") - margin.left - margin.right,
    height =+ chartSVG.attr("height") - margin.top - margin.bottom;
	
	
	var x = d3.scaleBand().rangeRound([0, width]).padding(.1),
			y = d3.scaleLinear()
				.range([height, 0]);
			
	x.domain(data.map(function(d){return d.state}))
	y.domain([0, d3.max(data, function(d) {return d.size;})])
	
	
	var g = chartSVG.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	g.append("g")
		.attr("class", "axis axis--x")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(x));
		
	g.append("g")
			.attr("class", "axis axis--y")
			.call(d3.axisLeft(y).ticks(10))
		.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", "0.71em")
			.attr("text-anchor", "end")
			.text("Frequency");
			
	g.selectAll("rect")
    .data(data)
    .enter()
		.append("rect")
      .attr("x", function(d) { return x(d.state); })
      .attr("y", function(d) { return y(d.size); })
      .attr("width", x.bandwidth())
      .attr("height", function(d) { 
				return height - y(d.size); })
			.attr("fill", function(d) {
				return d.color
			});
}

var createStreamStatusBarChart = function(id) {
	if (brokenLinks[id] != null && workingLinks[id] != null && mixedLinks[id] != null) {
		data = [{"state": "Broken", "size": brokenLinks[id], "color": "#ff0000"},
						{"state": "Working", "size": workingLinks[id], "color": "#336600"},
						{"state": "Mixed", "size": mixedLinks[id], "color": "#ffff00"}]
		createBarChart(data)
	}
}

var createButtons = function() {
	buttonData = [
		{"buttonText": "Leaves displayed", "onPress": toggleDropdown, "id": "button-dropdown", "class": "dropbtn"},
		{"buttonText": "Hide broken streams", "onPress": function() {toggleHidingStatus(this);}, "id": "button-hide-broken", "class": null},
		{"buttonText": "Hide mixed streams", "onPress": function() {toggleHidingStatus(this);}, "id": "button-hide-mixed", "class": null},
		{"buttonText": "Previous most important", "onPress": function() {
			if (selectedLeaf === null || currentSelectedIndex === 0) {
				selectMostImportantLeaf()
			} else {
				currentSelectedIndex -= 1
				selectLeafByIndex(-1)
		}}, "id": "button-prev-important", "class": null},
		{"buttonText": "Select most important", "onPress": selectMostImportantLeaf, "id": "button-most-important", "class": null},
		{"buttonText": "Next most important", "onPress": function() {
			if (selectedLeaf === null) {
				selectMostImportantLeaf()
			} else if (currentSelectedIndex < streams.length-1) {
				currentSelectedIndex += 1
				selectLeafByIndex(1)
		}}, "id": "button-prev-important", "class": null},
		]
	d3.select("div#buttons")
		.selectAll("buttons")
		.data(buttonData)
		.enter()
		.append("button")
		.text(function(d){return d.buttonText})
		.attr("id", function(d){return d.id})
		.attr("class", function(d){return d.class})
		.on("click", function(d){d.onPress();});
	d3.select("div#myDropdown")
		.raise()
}

var selectMostImportantLeaf = function() {
	maxImportance = Number.NEGATIVE_INFINITY
	maxLeafData = null
	for (var i=0, len = streams.length; i < len; i++) {
		var importance = 0
		doc = streams[i]
		if (leafEdges[doc.id].length > 0) {
			importance += leafEdges[doc.id].length * 4
			importance += doc.network_locations.length
			if (importance > maxImportance) {
				maxImportance = importance;
				maxLeafData = doc
			}
		}
	}
	maxLeaf = document.getElementById(maxLeafData.id)
	selectLeaf(maxLeaf)
}

var selectLeafByIndex = function(dir) {
	while (currentSelectedIndex < streams.length) {
		leafData = streams[currentSelectedIndex]
		if (leafEdges[leafData.id].length > 0) {
			leaf = document.getElementById(leafData.id)
			selectLeaf(leaf)
			break;
		} 
		currentSelectedIndex += dir
	}
}

var createDropdownSelection = function() {
	sizeOfStreams = completeStreams.length
	dropdownLimits = [25, 50, 100, 200, 300, 400, 500, 750, 1000, 1500, 2000]
	dropdownData = []
	for (var i=0; i < dropdownLimits.length; i++) {
		limit = dropdownLimits[i]
		if (sizeOfStreams > limit) {
			data = {"value": limit, "dropdownText": limit, "id": limit}
			dropdownData.push(data)
		}
	}
	dropdownData.push({"value": sizeOfStreams, "dropdownText": "Display all", "id": "Display all"})
	d3.select("div#myDropdown")
		.selectAll("p")
		.data(dropdownData)
		.enter()
		.append("p")
		.attr("id", limit)
		.text(function(d){return d.dropdownText})
		.on("click", function(){selectDropdown(this)})
}

var selectDropdown = function(paragraph) {
	if (selectedDropdown !== null) {
		d3.select(selectedDropdown)
			.style("background-color", "#f1f1f1")
	} 
	selectedDropdown = paragraph
	d3.select(selectedDropdown)
		.style("background-color", "#888888")
	selectedData = d3.select(selectedDropdown).datum()
	streamsDisplayed = selectedData.value
	alterStreamsDisplayed()
}

var prepareLeaves = function() {
	var maxImportance = Number.NEGATIVE_INFINITY
	var minImportance = Number.POSITIVE_INFINITY
	for (var i = 0, iLen = streams.length; i < iLen; i++)	{
		var doc = streams[i]
		doc.importance = 0
		doc.edges = []
		for (var j = 0, jLen = doc.network_locations.length; j < jLen; j++) {
			var netloc = doc.network_locations[j]
			doc.importance += 1
		}
		
		for (var j = 0, jLen = doc.linked_by.length; j < jLen; j++) {
			doc.importance += 4
			var host = doc.linked_by[j]
			if (children[host] == null) {
				children[host] = []
			} 
			if (children[host].indexOf(doc.ip_address) === -1) {
				children[host].push(doc.ip_address)
			}
			if (leafEdges[doc.ip_address] == null) {
				leafEdges[doc.ip_address] = []
				if (doc.stream_status === "Mixed") {
					if (mixedLinks[host] == null) {
						mixedLinks[host] = 0
					}
					mixedLinks[host] += 1
				} else if (doc.stream_status === "Working") {
					if (workingLinks[host] == null) {
						workingLinks[host] = 0
					}
					workingLinks[host] += 1
				} else if (doc.stream_status === "Broken") {
					if (brokenLinks[host] == null) {
						brokenLinks[host] = 0
					}
					brokenLinks[host] += 1
				}
			} 
			edge = host + "-" + doc.ip_address
			index = leafEdges[doc.ip_address].indexOf(edge)
			if (index === -1) {
				leafEdges[doc.ip_address].push(edge)
			}
		}
		if (doc.importance > maxImportance) {
			maxImportance = doc.importance;
		} 
		if (doc.importance < minImportance) {
			minImportance = doc.importance;
		}
		if (doc.stream_status === "Mixed") {
			if (mixedLinks["total"] == null) {
				mixedLinks["total"] = 0
			}
			mixedLinks["total"] += 1
			doc.color = '#ffff00';
		} else if (doc.stream_status === "Working") {
			if (workingLinks["total"] == null) {
				workingLinks["total"] = 0
			}
			doc.color = '#336600';
			workingLinks["total"] += 1
		} else if (doc.stream_status === "Broken") {
			doc.color = '#ff0000';
			if (brokenLinks["total"] == null) {
				brokenLinks["total"] = 0
			}
			brokenLinks["total"] += 1
		}
		doc.id = doc.ip_address
		doc.opacity = 1
		doc.state = "leaf"
	}
	
	var linearScale = d3.scaleLinear()
		.domain([minImportance, maxImportance])
		.range([minLeafRadius, maxLeafRadius]);
	
	for (var i = 0, iLen = streams.length; i < iLen; i++)	{
		doc = streams[i]
		doc.radius = linearScale(doc.importance);
		doc.s = null
		doc.sw = null
	}
	streamsDisplayed = streams.length
	completeStreams = streams
}

var prepareRoots = function() {
	for (var i = 0, iLen = hosts.length; i < iLen; i++) {
		var doc1 = hosts[i]
		doc1.radius = rootRadius
		doc1.opacity = 1
		doc1.id = doc1.host
		doc1.color = "#f48342"
		doc1.children = []
		doc1.state = "root"
		doc1.s = null
		doc1.sw = null
		if (children[doc1.host] != null) {
			doc1.children =  children[doc1.host]
		}
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
			if (leaf !== null) {
				leafData = d3.select(leaf).datum()
				lineData = {'x1': leafData.cx, 'x2': hostData.cx, 'y1': leafData.cy, 'y2': hostData.cy, 'root': host, 'leaf': leaf, 'id': hostData.id + "-" + leafData.id}
				edgesData.push(lineData)
			}
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
		.attr("stroke", function(d){return d.s})
		.attr("stroke-width", function(d){return d.sw})
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

var toggleHidingStatus = function(clickedData) {
	if (clickedData.id === "button-hide-broken") {
		if (brokenHidden === false) {
			brokenHidden = true
			clickedData.buttonText = clickedData.buttonText.replace("Hide", "Show")
		} else {
			brokenHidden = false
			clickedData.buttonText = clickedData.buttonText.replace("Show", "Hide")
		}
	} else {
		if (mixedHidden === false) {
			mixedHidden = true
			clickedData.buttonText = clickedData.buttonText.replace("Hide", "Show")
		} else {
			mixedHidden = false
			clickedData.buttonText = clickedData.buttonText.replace("Show", "Hide")
		}
	}
	clicked = document.getElementById(clickedData.id)
	d3.select(clicked)
		.text(function(d) {return d.buttonText;})
	alterStreamsDisplayed()
}


var alterStreamsDisplayed = function() {
	sortLeaves()
	tempStreams = []
	for (i=0, iLen = streams.length; i < iLen; i++) {
		if (tempStreams.length === streamsDisplayed) {
			break;
		}
		doc = streams[i]
		tempStreams.push(doc)
	}
	streams = tempStreams
	createGraph()
}


var handleNodeClick = function() {
	nodeData = d3.select(this).datum()
	if (nodeData.state === "root") {
		if (selectedRoot !== this) {
			selectRoot(this)
		} else {
			deselectRoot(this, true)
		}
	}
	else if (nodeData.state === "leaf") {
		if (selectedLeaf !== this) {
			selectLeaf(this)
		} else {
			deselectLeaf(this, 500)
		}
	} 
}

var selectRoot = function(root) {
	if (selectedRoot !== null) {
		deselectRoot(selectedRoot, false)
	}
	selectedRoot = root
	d3.select(root)
		.raise()
		.transition()
		.attr("r", function(d){return d.radius*1.5})
		.attr("stroke", "black")
		.attr("stroke-width", "2px")
	rootID = d3.select(root).datum().id
	createStreamStatusBarChart(rootID)
}

var deselectRoot = function(root, completeDeselect) {
	selectedRoot = null
	d3.select(root)
		.lower()
		.transition()
		.attr("r", function(d){return d.radius})
		.attr("stroke", null)
		.attr("stroke-width", null)
	if (completeDeselect === true) {
		createStreamStatusBarChart("total")
	}
}

var selectLeaf = function(leaf) {
	if (selectedLeaf !== null) {
		deselectLeaf(selectedLeaf, 500)
	}
	selectedLeaf = leaf
	d3.select(leaf)
		.raise()
		.transition()
		.attr("cx", graphWidth/2)
		.attr("cy", graphHeight/2)
		.attr("r", clickedRadius)
		.attr("stroke", "black")
		.attr("stroke-width", "2px")
	boldEdges(leaf)
	alterTextArea(leaf)
	currentSelectedIndex = streams.indexOf(d3.select(leaf).datum())
	leafData = d3.select(leaf).datum()
	console.log(leafData.importance)
}

var deselectLeaf = function(leaf, transitionTime) {
	deboldEdges(leaf, transitionTime)
	clearTextArea()
	selectedLeaf = null
	if (leaf !== null) {
		transitioningLeaves.push(leaf)
		d3.select(leaf)
			.transition()
			.duration(transitionTime)
			.attr("cx", function(d){return d.cx})
			.attr("cy", function(d){return d.cy})
			.attr("r", function(d){return d.radius})
			.attr("stroke", null)
			.attr("stroke-width", null)
			.on("end", function(){transitioningLeaves.splice(transitioningLeaves.indexOf(leaf), 1)})
	}
	currentSelectedIndex = 0
}

var hoverOn = function() {
	d3.select(this).style("cursor", "pointer");
	if (transitioningLeaves.indexOf(this) === -1 && selectedLeaf !== this && selectedRoot !== this) {
		d3.select(this)
			.transition()
			.attr("stroke", "black")
			.attr("stroke-width", "2px")
	}
}

var hoverOff = function() {
	if (transitioningLeaves.indexOf(this) === -1 && selectedLeaf !== this && selectedRoot !== this) {
		d3.select(this)
			.transition()
	.attr("stroke", function(d){return d.s})
			.attr("stroke-width", function(d){return d.sw})
	}
}

var boldEdges = function(leaf) {
	leafData = d3.select(leaf).datum()
	edges = leafEdges[leafData.id]
	for (var i=0, len = edges.length; i < len; i++) {
		edge = document.getElementById(edges[i])
		d3.select(edge).raise()
		d3.select(edge)
			.transition()
			.attr("stroke", "black")
			.attr("stroke-width", "1.5px")
			.attr("x1", graphWidth/2)
			.attr("y1", graphHeight/2)
	}
}

var deboldEdges = function(leaf, transitionTime) {
	if (leaf !== null) {
		leafData = d3.select(leaf).datum()
		edges = leafEdges[leafData.id]
		for (var i=0, len = edges.length; i < len; i++) {
			edge = document.getElementById(edges[i])
			d3.select(edge)
				.transition()
				.duration(transitionTime)
				.attr("stroke", "gray")
				.attr("stroke-width", ".5px")
				.attr("x1", leafData.cx)
				.attr("y1", leafData.cy)
		}
	}
}

var alterTextArea = function(leaf) {
	leafData = d3.select(leaf).datum()
	d3.select("div#text-info")
		.selectAll("p")
		.remove()
	edges = leafEdges[leafData.id]
	tempEdges = []
	for (var i=0; i < edges.length; i++) {
		var edge = ""
		splitEdge = edges[i].split("-")
		for (var j=0; j < splitEdge.length-1; j++) {
			if (j < splitEdge.length-1) {
				edge += splitEdge[j] + "-"
			}
		}
		edge = edge.substring(0, edge.length-1)
		tempEdges.push(edge)
	}
	edges = tempEdges
	addIP(leaf)
	addListedInfo(edges, "Linked by:")
	addListedInfo(leafData.network_locations, "Network locations:")
	addListedInfo(leafData.titles, "Titles:")
}

var addIP = function(leaf) {
	leafData = d3.select(leaf).datum()
	d3.select("div#text-info")
		.append("p")
		.text("IP address: " + leafData.ip_address)
}

var addListedInfo = function(list, string) {
	maxShown = 3
	d3.select("div#text-info")
		.append("p")
		.text(string)
		.attr("id", string)
	selectedText = document.getElementById(string)
	for (var i = 0, len = list.length; i < len; i++) {
		if (i === maxShown) {
			d3.select(selectedText)
				.append("li")
				.text("Show more...")
				.on("mouseover", function() {d3.select(this).style("cursor", "pointer");})
				.on("click", function() {showIndex(list, string, 0)})
				break;
		} else {
			d3.select(selectedText)
				.append("li")
				.text(list[i])
		}	
	}
}

var showIndex = function(list, string, index) {
	maxShown = 12
	d3.select("div#text-info")
		.selectAll("p")
		.remove()
	d3.select("div#text-info")
		.append("p")
		.text(string)
		.attr("id", string)
	selectedText = document.getElementById(string)
	for (var i = index, len = list.length; i < len && i < index + maxShown; i++) {
		d3.select(selectedText)
			.append("li")
			.text(list[i])
		if (i === (index + maxShown)-1 && i + maxShown < list.length) {
			d3.select(selectedText)
				.append("li")
				.text("Show more")
				.on("mouseover", function() {d3.select(this).style("cursor", "pointer");})
				.on("click", function() {showIndex(list, string, index+20)})
		}
	}
	if (index > 0) {
		d3.select(selectedText)
			.append("li")
			.text("Show previous")
			.on("mouseover", function() {d3.select(this).style("cursor", "pointer");})
			.on("click", function() {showIndex(list, string, index-20)})
	}
	d3.select(selectedText)
			.append("li")
			.text("Go back to information" )
			.on("mouseover", function() {d3.select(this).style("cursor", "pointer");})
			.on("click", function() {alterTextArea(selectedLeaf)})
}

var clearTextArea = function() {
	d3.select("div#text-info")
		.selectAll("p")
		.remove()
	d3.select("div#text-info")
		.append("p")
		.text("No node is currently selected, click on a node to view its information.")
}


/* When the user clicks on the button, 
toggle between hiding and showing the dropdown content */
function toggleDropdown() {
    document.getElementById("myDropdown").classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {

    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}
