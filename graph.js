/**********************************************-----------*********************************************************************
Trying to add a configuration file to this document? Look no further than this.
The IP addresses of the server are located on lines 82-105, look there to find comments on where to change urls
**********************************************------------*********************************************************************/




//constants
const graphHeight = 600;
const graphWidth = 1140;
const chartHeight = 400;
const chartWidth = 400;
const infoHeight = 600;
const infoWidth = 400;
const leavesMinorAxis= graphHeight*.35;
const leavesMajorAxis = graphWidth *.35;
const rootsMinorAxis = graphHeight *.475;
const rootsMajorAxis = graphWidth * .475;
const rootRadius = 20;
const maxLeafRadius = 15;
const minLeafRadius = 3;
const clickedRadius = maxLeafRadius + 50;
const centerSpace = (clickedRadius + maxLeafRadius * 1.125);
// general variables
var chartColors = ["#5d154f", "#f8e622", "#695818", "#ada4f3", "#2af514", "#c009c1", "#050e8f", "#f853c5", "#146b50", "#ce4132",
						"#af2599", "#2830b1", "#1d96aa", "#c826c8", "#a47508", "#5d40ef", "#3c30c5", "#57bd11", "#18295d", "#ff4959",
						"#906f8f", "#ffdb30", "#e5c961", "#19cfe6", "#968a08", "#94a95c", "#09a994", "#d7f75a", "#a81acf", "#6a0ce9"]
var children = {}
var edgesGroup, leavesGroup, rootsGroup
var selectedLeaf = null;
var transitioningLeaves = [];
var streams, hosts, edges;
var streams = [];
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
var hidingLeaves = {};
var chartSelected = "statuses"
var selectedTitles = []
var selectedDisplay = null

var graphSVG = d3.select('div#graph-container')
	.append('svg')
	.attr("id", "graph-svg")
	.attr("width", graphWidth)
	.attr("height", graphHeight)
	.style('background-color', '#202020')
	
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
		titlesXHR = new XMLHttpRequest();
		titlesXHR.onreadystatechange = function() {
			if (titlesXHR.readyState === 4) {
				titles = JSON.parse(titlesXHR.responseText)
				createCompleteTitles()
				hostsXHR = new XMLHttpRequest();
				hostsXHR.onreadystatechange = function() {
					if (hostsXHR.readyState === 4) {
						createPage()
					}
				}
				hostsXHR.open('GET', 'http://127.0.0.1:3000/hosts.json'); // if the IP address of the server changes, this should change
				hostsXHR.send();
			}
		}
		titlesXHR.open('GET', 'http://127.0.0.1:3000/titles.json'); // if the IP address of the server changes, this should change
		titlesXHR.send();
	}
}
streamsXHR.open('GET', 'http://127.0.0.1:3000/streams.json'); // if the IP address of the server changes, this should change
streamsXHR.send();

var createPage = function() {
	createButtons()
	hosts = JSON.parse(hostsXHR.responseText);
	prepareLeaves()
	prepareRoots()
	streams = quickSort(streams, "importance")
	createGraph()
	createStreamStatusBarChart("total", "total")
	createLeavesDropdownSelection()
	createTitlesDropdownSelection()
}


var quickSort = function(list, keyword) {
	if (list.length <= 1) {
		return list
	} 
	var rand = Math.floor(Math.random() * list.length)
	pivot = list[rand][keyword]
	var L = []
	var E = []
	var G = []
	for (var i=0; i < list.length; i++) {
		if (list[i][keyword] < pivot) {
			L.push(list[i])
		} else if (list[i][keyword] > pivot) {
			G.push(list[i])
		} else {
			E.push(list[i])
		}
	}
	return quickSort(G, keyword).concat(E).concat(quickSort(L, keyword)) 
}

var createCompleteTitles = function() {
	completeTitles = []
	for (var i=0; i < titles.length; i++) {
		completeTitles.push(titles[i].title)
	}
	return completeTitles
}

var createGraph = function() {
	createGroups()
	createCircles(rootsGroup, hosts)
	createCircles(leavesGroup, streams)
	setTimeout(function(){
		createEdges()
	}, 0)
}

var createBarChart = function(data, title) {
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
    margin = {top: 50, right: 20, bottom: 100, left: 40},
		width =+ chartSVG.attr("width") - margin.left - margin.right,
    height =+ chartSVG.attr("height") - margin.top - margin.bottom;
	
	
	var x = d3.scaleBand().rangeRound([0, width]).padding(.1),
			y = d3.scaleLinear()
				.range([height, 0]);
			
	x.domain(data.map(function(d){return d.state}))
	y.domain([0, d3.max(data, function(d) {return d.size;})])
	
	var g = chartSVG.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	xAxisGroup = g.append("g")
		.attr("class", "axis axis--x")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(x));
		
	xAxisGroup.selectAll("text")
		.attr("transform", "rotate(-50, 0, 10)")
		.style("font-family", "Arial")
		.style("text-anchor", "end")
		
	g.append("g")
			.attr("class", "axis axis--y")
			.call(d3.axisLeft(y).ticks(10))
		.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", "0.71em")
			.attr("text-anchor", "end")
		
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
	chartSVG
		.append("text")
		.text(title)
		.attr("transform", "translate(200," + margin.top/2 + ")")
		.style("padding", "10px")
		.style("font-size", "12px")
		.attr("text-anchor", "middle")
}

var createStartSitesBarChart = function () {
	startSitesData = []
	for (var i=0; i < hosts.length; i++) {
		data = {"state": i+1, "size": 0, "color": chartColors[i]}
		startSitesData.push(data)
	}
	if (selectedRoot == null) {
		title = "Total distribution of start sites"
		for (var i=0; i < streams.length; i++) {
			leafData = streams[i]
			hostNamesLength = leafData.linked_by.length
			startSitesData[hostNamesLength-1].size += 1
		}		
	} else {
		id = selectedRoot.id
		title = "Distribution of start sites from " + id
		selectedRootData = d3.select(selectedRoot).datum()
		children = selectedRootData.children
		for (var i=0; i < children.length; i++) {
			leafID = children[i]
			leaf = document.getElementById(leafID)
			leafData = d3.select(leaf).datum()
			hostNamesLength = leafData.linked_by.length
			startSitesData[hostNamesLength-1].size += 1
		}
	}
	createBarChart(startSitesData, title)
	chartSelected = "sites"
}

var createTitlesBarChart = function () {
	var titlesFound = {}
	var titlesData = []
	var parsed = []
	const titlesDisplayed = 30
	if (selectedRoot == null) {
		chartTitle = "Total distribution of titles"
		parsed = streams		
	} else {
		id = selectedRoot.id
		chartTitle = "Distribution of titles from " + id
		selectedRootData = d3.select(selectedRoot).datum()
		children = selectedRootData.children
		for (var i=0; i < children.length; i++) {
			leafID = children[i]
			leaf = document.getElementById(leafID)
			leafData = d3.select(leaf).datum()
			parsed.push(leafData)
		}
	}
	for (var i=0; i < parsed.length; i++) {
		leafData = parsed[i]
		titles = leafData.titles
		for (var j=0; j < titles.length; j++) {
			title = titles[j]
			if (titlesFound[title] == null) {
				titlesFound[title] = 1
			} else {
				titlesFound[title] += 1
			}
		}
	}
	for (var title in titlesFound) {
		size = titlesFound[title]
		data = {"state": title, "size": size}
		titlesData.push(data)
	}
	var titlesAdded = 0
	var tempTitlesData = []
	while(titlesAdded < titlesData.length && titlesAdded < titlesDisplayed) {
		titlesData[titlesAdded].color = chartColors[titlesAdded]
		tempTitlesData.push(titlesData[titlesAdded])
		titlesAdded += 1
	}
	console.log(tempTitlesData)
	titlesData = tempTitlesData
	createBarChart(titlesData, chartTitle)
	chartSelected = "titles"
}


var createStreamStatusBarChart = function() {
	if (selectedRoot === null) {
		id = "total"
		title = "Total distribution of streams"
	} else {
		id = selectedRoot.id
		title = "Distribution of streams from " + id
	}
	if (brokenLinks[id] !== null || workingLinks[id] !== null || mixedLinks[id] !== null) {
		if (brokenLinks[id] == null) {
			brokenLinks[id] = 0
		} if (workingLinks[id] == null) {
			workingLinks[id] = 0
		} if (mixedLinks[id] == null) {
			mixedLinks[id] = 0
		}
		
		data = [{"state": "Broken", "size": brokenLinks[id], "color": "#ff0000"},
						{"state": "Working", "size": workingLinks[id], "color": "#336600"},
						{"state": "Mixed", "size": mixedLinks[id], "color": "#ffff00"}]
		createBarChart(data, title)
	}
	chartSelected = "statuses"
}

var createHostNamesBarChart = function () {
	hostNamesData = [
	{"state": 1}, {"state": 2}, {"state": 3}, {"state": "4-5"}, {"state": "5-6"}, {"state": "7-9"}, {"state": "10-12"},
	{"state": "13-15"}, {"state": "16-20"}, {"state": "21-25"}, {"state": "26-30"}, {"state": "31+"}]
	for (var i=0; i < hostNamesData.length; i++) {
		hostNamesData[i].size = 0
		hostNamesData[i].color = chartColors[i]
	}
	
	if (selectedRoot === null) {
		id = "total"
		title = "Total distribution of host names"
		leaves = streams
	} else {
		id = selectedRoot.id
		title = "Distribution of host names from " + id
		leaves = []
		selectedRootData = d3.select(selectedRoot).datum()
		children = selectedRootData.children
		for (var i=0; i < children.length; i++) {
			leafID = children[i]
			leaf = document.getElementById(leafID)
			leafData = d3.select(leaf).datum()
			leaves.push(leafData)
		}
	}
	for (var i=0; i < leaves.length; i++) {
		leafData = leaves[i]
		hostNamesLength = leafData.network_locations.length
		if (hostNamesLength === 1) {
			hostNamesData[0].size += 1
		} else if (hostNamesLength === 2) {
			hostNamesData[1].size += 1
		} else if (hostNamesLength === 3) {
			hostNamesData[2].size += 1
		} else if (3 < hostNamesLength  && hostNamesLength < 5) {
			hostNamesData[3].size += 1
		} else if (5 <= hostNamesLength && hostNamesLength < 7) {
			hostNamesData[4].size += 1
		} else if (7 <= hostNamesLength && hostNamesLength < 9) {
			hostNamesData[5].size += 1
		} else if (10 <= hostNamesLength && hostNamesLength < 13) {
			hostNamesData[6].size += 1
		} else if (13 <= hostNamesLength && hostNamesLength < 16) {
			hostNamesData[7].size += 1
		} else if (16 <= hostNamesLength && hostNamesLength < 21) {
			hostNamesData[8].size += 1
		} else if (21 <= hostNamesLength && hostNamesLength < 26) {
			hostNamesData[9].size += 1
		} else if (26 <= hostNamesLength && hostNamesLength < 31) {
			hostNamesData[10].size += 1 
		} else {
			hostNamesData[11].size += 1
		}
	}
	createBarChart(hostNamesData, title)
	chartSelected = "hosts"
}

var createButtons = function() {
	graphButtonData = [
		{"buttonText": "Leaves displayed", "onPress": function(){
			toggleDropdown("leaves-dropdown")
		}, "id": "button-leaves-dropdown", "class": "dropbtn"},
		{"buttonText": "Titles displayed", "onPress": function(){
			toggleDropdown("titles-dropdown")
		}, "id": "button-titles-dropdown", "class": "dropbtn"},
		{"buttonText": "Hide broken streams", "onPress": function() {toggleHidingStatus(this);}, "id": "button-hide-broken", "class": "graph-button"},
		{"buttonText": "Hide mixed streams", "onPress": function() {toggleHidingStatus(this);}, "id": "button-hide-mixed", "class": "graph-button"},
		{"buttonText": "Previous most important", "onPress": function() {
			if (selectedLeaf === null || currentSelectedIndex === 0) {
				selectMostImportantLeaf()
			} else {
				currentSelectedIndex -= 1
				selectLeafByIndex(-1)
		}}, "id": "button-prev-important", "class": "graph-button"},
		{"buttonText": "Select most important", "onPress": selectMostImportantLeaf, "id": "button-most-important", "class": "graph-button"},
		{"buttonText": "Next most important", "onPress": function() {
			if (selectedLeaf === null) {
				selectMostImportantLeaf()
			} else if (currentSelectedIndex < streams.length-1) {
				currentSelectedIndex += 1
				selectLeafByIndex(1)
		}}, "id": "button-prev-important", "class": "graph-button"},
		]
	d3.select("div#buttons")
		.selectAll("buttons")
		.data(graphButtonData)
		.enter()
		.append("button")
		.text(function(d){return d.buttonText})
		.attr("id", function(d){return d.id})
		.attr("class", function(d){return d.class})
		.on("click", function(d){d.onPress();});
	d3.select("div#leaves-dropdown")
		.raise()
	d3.select("div#titles-dropdown")
		.raise()
		
	chartButtonData = [
		{"buttonText": "Stream statuses info", "onPress": createStreamStatusBarChart, "id": "chart-stream-status", "class": "chart-button"},
		{"buttonText": "Start sites info", "onPress": createStartSitesBarChart, "id": "chart-start-sites", "class": "chart-button"},
		{"buttonText": "Host names info", "onPress": createHostNamesBarChart, "id": "chart-host-names", "class": "chart-button"},
		{"buttonText": "Titles info", "onPress": createTitlesBarChart, "id": "chart-host-names", "class": "chart-button"},
	]
	d3.select("div#chart-buttons")
		.selectAll("buttons")
		.data(chartButtonData)
		.enter()
		.append("button")
		.text(function(d){return d.buttonText})
		.attr("id", function(d){return d.id})
		.attr("class", function(d){return d.class})
		.on("click", function(d){d.onPress();});
}


var selectMostImportantLeaf = function() {
	index = 0
	while(true) {
		leafData = streams[index]
		if ((leafData.stream_status === "Broken" && brokenHidden === true) || (leafData.stream_status === "Mixed" && mixedHidden === true)) {
			index += 1
			continue;
		}
		leaf = document.getElementById(leafData.id)
		if (selectedTitles.length > 0) {
			show = false
			for (var i=0; i < selectedTitles.length; i++) {
				title = selectedTitles[i]
				if (leafData.titles.indexOf(title) !== -1) {
					show = true
					break;
				}
			}
			if (show === true) {
				selectLeaf(leaf)
				break;
			} else {
				index += 1
			}
		} else {
			selectLeaf(leaf)
			break;
		}
	}
}

var selectLeafByIndex = function(dir) {
	while(true) {
		console.log("Looping")
		leafData = streams[currentSelectedIndex]
		if ((leafData.stream_status === "Broken" && brokenHidden === true) || (leafData.stream_status === "Mixed" && mixedHidden === true)) {
			currentSelectedIndex += dir
			if ((dir === -1 && currentSelectedIndex === 0) || (dir === 1 && currentSelectedIndex === streams.length)) {
				break;
			}
			continue;
		} if (selectedTitles.length > 0) {
			show = false
			for (var i=0; i < selectedTitles.length; i++) {
				title = selectedTitles[i]
				if (leafData.titles.indexOf(title) !== -1) {
					show = true
					break;
				}
			}
			if (show !== true) {
				currentSelectedIndex += dir
				if ((dir === -1 && currentSelectedIndex === 0) || (dir === 1 && currentSelectedIndex === streams.length)) {
					break;
				}
				continue;
			}
		}
		leaf = document.getElementById(leafData.id)
		if (hidingLeaves[leafData.id] === true) {
			while (hidingLeaves[leafData.id] === true) {
				currentSelectedIndex -= dir
				leafData = streams[currentSelectedIndex]
			}
			break;
		}
		selectLeaf(leaf)
		break;
	}
}

var createTitlesDropdownSelection = function() {
	dropdownData = []
	for (var i=0; i < titles.length; i++) {
		dropdownData.push(titles[i].title)
	}
	dropdownData.sort(function(a, b){
		var nameA = a.toLowerCase(), nameB = b.toLowerCase() 
    if(nameA < nameB) return -1;
    if(nameA > nameB) return 1;
    return 0;
	})
	dropdownData.unshift("Select all", "Clear all")
	d3.select("div#titles-dropdown")
		.selectAll("p")
		.data(dropdownData)
		.enter()
		.append("p")
		.attr("id", function(d){return d})
		.text(function(d){return d})
		.on("click", function(d){selectTitleDropdown(this)})
		.on("mouseover", function(d) {
			d3.select(this)
				.style("cursor", "pointer")
			if (selectedTitles.indexOf(d) === -1) {
				d3.select(this)
					.style("background-color",  "#ddd")
			}
		})
		.on("mouseout", function(d) {
			if (selectedTitles.indexOf(d) === -1) {
				d3.select(this)
					.style("background-color",  "#f1f1f1")
			}
		})
}

var selectTitleDropdown = function(title) {
	titleData = d3.select(title).datum()
	index = selectedTitles.indexOf(titleData)
	if (titleData === "Clear all") {
		console.log("clearing")
		selectedTitles = []
		d3.select("div#titles-dropdown")
			.selectAll("p")
				.style("background-color",  "#f1f1f1")
	} else if (titleData === "Select all") {
		selectedTitles = createCompleteTitles()
		d3.select("div#titles-dropdown")
			.selectAll("p")
				.style("background-color",  function(d) {
					if (d !== "Clear all") {
						return "#888888"
					} else {
						return "#f1f1f1"
					}
				})
	} else if (index === -1) {
		selectedTitles.push(titleData)
		d3.select(title)
			.style("background-color", "#888888")
	} else {
		selectedTitles.splice(index, 1)
		d3.select(title)
			.style("background-color",  "#f1f1f1")
	}
}


var createLeavesDropdownSelection = function() {
	sizeOfStreams = streams.length
	dropdownLimits = [25, 50, 100, 200, 300, 400, 500, 750, 1000, 1500, 2000, 2500, 3000]
	dropdownData = []
	for (var i=0; i < dropdownLimits.length; i++) {
		limit = dropdownLimits[i]
		if (sizeOfStreams > limit) {
			data = {"value": limit, "dropdownText": limit, "id": limit}
			dropdownData.push(data)
		}
	}
	dropdownData.push({"value": sizeOfStreams, "dropdownText": "Display all", "id": "Display all"})
	d3.select("div#leaves-dropdown")
		.selectAll("p")
		.data(dropdownData)
		.enter()
		.append("p")
		.attr("id", limit)
		.text(function(d){return d.dropdownText})
		.on("click", function(){selectDisplayDropdown(this)})
		.on("mouseover", function(d) {
			d3.select(this)
				.style("cursor", "pointer")
			if (selectedDisplay !== this) {
				d3.select(this)
					.style("background-color",  "#ddd")
			}
		})
		.on("mouseout", function(d) {
			if (selectedDisplay !== this) {
				d3.select(this)
					.style("background-color",  "#f1f1f1")
			}
		})
		
}

var selectDisplayDropdown = function(display) {
	if (selectedDisplay !== null) {
		d3.select(selectedDisplay)
			.style("background-color", "#f1f1f1")
	} 
	selectedDisplay = display
	d3.select(selectedDisplay)
		.style("background-color", "#888888")
	displayData = d3.select(selectedDisplay).datum()
	streamsDisplayed = displayData.value
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
		hidingLeaves[doc.id] = false
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
}

var prepareRoots = function() {
	for (var i = 0, iLen = hosts.length; i < iLen; i++) {
		var doc1 = hosts[i]
		doc1.radius = rootRadius
		doc1.opacity = 1
		doc1.id = doc1.host
		doc1.color = "orangered"
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
			console.log("replacing text")
			clickedData.buttonText = clickedData.buttonText.replace("Hide", "Show")
			console.log(clickedData.buttonText)
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
	console.log(clicked)
	d3.select(clicked)
		.text(function(d) {return d.buttonText;})
	alterStreamsDisplayed()
}


var alterStreamsDisplayed = function() {
	streamsAdded = 0
	for (i=0, iLen = streams.length; i < iLen; i++) {
		leafData = streams[i]
		leaf = document.getElementById(leafData.id)
		if (streamsAdded > streamsDisplayed || (leafData.stream_status === "Broken" && brokenHidden === true) || (leafData.stream_status === "Mixed" && mixedHidden === true)) {
			toggleLeaf(leaf, "none")
		} else {
			if (selectedTitles.length > 0) {
				show = false
				for (var j=0; j < selectedTitles.length; j++) {
					title = selectedTitles[j]
					if (leafData.titles.indexOf(title) !== -1) {
						show = true
						break;
					}
				}
				if (show === true) {
					streamsAdded += 1
					toggleLeaf(leaf, "block")		
				} else {
					toggleLeaf(leaf, "none")
				}
			} else {
				streamsAdded += 1
				toggleLeaf(leaf, "block")				
			}
		}
	}
}


var toggleLeaf = function(leaf, display) {
	d3.select(leaf)
		.style("display", display)
	leafData = d3.select(leaf).datum()
	edges = leafEdges[leafData.id]
	for (var i=0; i < edges.length; i++) {
		edgeID = edges[i]
		edge = document.getElementById(edgeID)
		d3.select(edge)
			.style("display", display)
	}
	if (display === 'none') {
		hidingLeaves[leafData.id] = true
	} else {
		hidingLeaves[leafData.id] = false
	}
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
	if (chartSelected === "statuses") {
		createStreamStatusBarChart()
	} else if (chartSelected === "sites") {
		createStartSitesBarChart()
	} else if (chartSelected === "hosts") {
		createHostNamesBarChart()
	} else if (chartSelected === "titles") {
		createTitlesBarChart()
	}
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
		if (chartSelected === "statuses") {
		createStreamStatusBarChart()
		} else if (chartSelected === "sites") {
			createStartSitesBarChart()
		} else if (chartSelected === "hosts") {
			createHostNamesBarChart()
		} else if (chartSelected === "titles") {
			createTitlesBarChart()
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
		.attr("cx", graphWidth/2)
		.attr("cy", graphHeight/2)
		.attr("r", clickedRadius)
		.attr("stroke", "black")
		.attr("stroke-width", "2px")
	boldEdges(leaf)
	alterTextArea(leaf)
	currentSelectedIndex = streams.indexOf(d3.select(leaf).datum())
	leafData = d3.select(leaf).datum()
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
	addListedInfo(leafData.network_locations, "Host names:", false)
	addListedInfo(leafData.titles, "Titles:", false)
	addListedInfo(leafData.playable_urls, "Playable streams:", true)
}

var addIP = function(leaf) {
	leafData = d3.select(leaf).datum()
	d3.select("div#text-info")
		.append("p")
		.text("IP address: " + leafData.ip_address)
}

var addListedInfo = function(list, string, linked) {
	maxShown = 2
	if (linked === true) { 
		console.log(list)
	}
	if (list.length > 0) {
		d3.select("div#text-info")
			.append("p")
			.text(string)
			.attr("id", string)
		selectedText = document.getElementById(string)
		for (var i = 0, len = list.length; i < len; i++) {
			if (linked === true) {
				url = list[i]
			}
			if (i === maxShown) {
				d3.select(selectedText)
					.append("li")
					.text("Show more...")
					.on("mouseover", function() {d3.select(this).style("cursor", "pointer");})
					.on("click", function() {showIndex(list, string, 0, linked)})
					break;
			} else {
				point = d3.select(selectedText)
					.append("li")
				if (linked === true) {
					point.text("Link " + (i+1))
						.style("color", "white")
						.on("mouseover", function() {d3.select(this).style("cursor", "pointer");})
						.on("click", function() {
							d3.select(this)
								.style("color", "black")
							window.open(url)
						})
				} else {
					point.text(list[i])
				}
			}	
		}		
	}
}

var showIndex = function(list, string, index, linked) {
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
		point = d3.select(selectedText)
				.append("li")
		if (linked === true) {
			point.append("a")
				.attr("href", list[i])
				.text("Link " + (i+1))
		} else {
			point.text(list[i])
		} if (i === (index + maxShown)-1 && i + maxShown < list.length) {
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
function toggleDropdown(id) {
   document.getElementById(id).classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
  if (!document.getElementById("button-leaves-dropdown").contains(event.target)) {
    var dropdown = document.getElementById("leaves-dropdown");
    if (dropdown.classList.contains('show')) {
      dropdown.classList.remove('show');
    }
  } if (!document.getElementById("button-titles-dropdown").contains(event.target) && 
		!document.getElementById("titles-dropdown").contains(event.target)) {
		var dropdown = document.getElementById("titles-dropdown");
    if (dropdown.classList.contains('show')) {
      dropdown.classList.remove('show');
			alterStreamsDisplayed()
    }
	}
}
