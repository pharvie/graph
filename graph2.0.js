
var svgHeight = 600;
var svgWidth = 1250;
var infoHeight = 600;
var infoWidth = 400;
var leavesMinorAxis= svgHeight*.375;
var leavesMajorAxis = svgWidth *.375;
var rootsMinorAxis = svgHeight *.5;
var rootsMajorAxis = svgWidth * .5;
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
var selectedRoots = [];
var leafEdges = {};
var brokenHidden = false;
var mixedHidden = false;
var selectedDropdown = null;
var streamsDisplayed = 0;
var currentSelectedIndex = null

var graphSVG = d3.select('div#graph-container')
	.append('svg')
	.attr("id", "graph-svg")
	.attr("width", svgWidth)
	.attr("height", svgHeight)
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
		checkSelectedRoots()
	}, 0)
}

var createButtons = function() {
	buttonData = [
		{"buttonText": "Leaves displayed", "onPress": toggleDropdown, "id": "button-dropdown", "class": "dropbtn"},
		{"buttonText": "Hide broken streams", "onPress": function() {toggleHidingStatus(this);}, "id": "button-hide-broken", "class": null},
		{"buttonText": "Hide mixed streams", "onPress": function() {toggleHidingStatus(this);}, "id": "button-hide-mixed", "class": null},
		{"buttonText": "Clear all roots", "onPress": clearRoots, "id": "button-clear", "class": null},
		{"buttonText": "Select all roots", "onPress": selectAllRoots, "id": "button-select-all", "class": null},
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
	console.log("Selecting leaf by index")
	while (currentSelectedIndex < streams.length) {
		console.log("In while loop")
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
			doc.color = '#ffff00';
		} else if (doc.stream_status === "Working") {
			doc.color = '#336600';
		} else if (doc.stream_status === "Broken") {
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
		doc.s = null
		doc.sw = null
	}
	streamsDisplayed = streams.length
	completeStreams = streams
}

var prepareRoots = function() {
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
		doc1.s = "black"
		doc1.sw = "2px"
		if (children[doc1.host] != null){
			doc1.children =  children[doc1.host]
		}
		selectedRoots.push(doc1.id)
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

var clearRoots = function() {
	deselectLeaf(selectedLeaf, 0)
	for (var i = 0, len = selectedRoots.length; i < len; i++) {
		hostname = (selectedRoots[i])
		root = document.getElementById(hostname)
		deselectRoot(root)
	}
	for (var i = 0, len = selectedRoots.length; i < len; i++) {
		selectedRoots.splice(selectedRoots.indexOf(selectedRoots[i], 1))
	}
}

var selectAllRoots = function() {
	for (var i = 0, len = hosts.length; i < len; i++) {
		hostname = (hosts[i].id)
		root = document.getElementById(hostname)
		selectRoot(root)
	}
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
		if (selectedRoots.indexOf(nodeData.id) === -1) {
			selectRoot(this)
		} else {
			deselectRoot(this)
			selectedRoots.splice(selectedRoots.indexOf(nodeData.id), 1)
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
	rootData = d3.select(root).datum()
	selectedRoots.push(root.id)
	rootData.s = "black"
	rootData.sw = "2px"
	d3.select(root)
		.transition()
		.attr("stroke", function(d){return d.s})
		.attr("stroke-width",  function(d){return d.sw})
	toggleRootEdges(root, true)
	sortLeaves()
}

var deselectRoot = function(root) {
	rootData = d3.select(root).datum()
	rootData.s = null
	rootData.sw = null
	d3.select(root)
		.transition()
		.attr("stroke", function(d){return d.s})
		.attr("stroke-width",  function(d){return d.sw})
	toggleRootEdges(root, false)
	sortLeaves()
}

var checkSelectedRoots = function() {
	for (var i=0, iLen = hosts.length; i < iLen; i++) {
		hostData = hosts[i]
		if (selectedRoots.indexOf(hostData.id) === -1) {
			root = document.getElementById(hostData.id)
			deselectRoot(root)
		}
	}
}

var toggleRootEdges = function(root, show) {
	if (show === true) {
		display = "block"
	} else {
		s = "gray"
		sw = ".5px"
		display = "none"
	}
	rootData = d3.select(root).datum()
	for (var i=0, len = rootData.children.length; i < len; i++) {
		childID = rootData.children[i]
		child = document.getElementById(childID)
		if (child !== null) {
			childData = d3.select(child).datum()
			edgeID = rootData.id + "-" + childID
			edge = document.getElementById(edgeID)
			d3.select(edge)
				.transition()
				.style("display", display)
				.attr("stroke", s)
				.attr("stroke-width", sw)
			index = leafEdges[childID].indexOf(edgeID)
			if (show === true) {
				if (leafEdges[childID].length === 0) {
						d3.select(child)
							.transition()
							.style("display", display)
				}	if (index === -1) {
					leafEdges[childID].push(edgeID)
				}
			} else {
				if (index !== -1) {
					leafEdges[childID].splice(index, 1)
				} if (leafEdges[childID].length === 0 && streams.indexOf(childData) !== -1) {
					d3.select(child)
						.transition()
						.style("display", display)
				}
			}
		}
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
		.attr("cx", svgWidth/2)
		.attr("cy", svgHeight/2)
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
			.attr("x1", svgWidth/2)
			.attr("y1", svgHeight/2)
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
	d3.select("div#info")
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
	d3.select("div#info")
		.append("p")
		.text("IP address: " + leafData.ip_address)
}

var addListedInfo = function(list, string) {
	d3.select("div#info")
		.append("p")
		.text(string)
		.attr("id", string)
	selectedText = document.getElementById(string)
	for (var i = 0, len = list.length; i < len; i++) {
		if (i === 5) {
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
	maxShown = 25
	d3.select("div#info")
		.selectAll("p")
		.remove()
	d3.select("div#info")
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

var inEllipse = function(x, h, rx, y, k, ry) {
	return Math.pow(x-h, 2)/Math.pow(rx, 2) + Math.pow(y-k, 2)/ Math.pow(ry, 2)
}

