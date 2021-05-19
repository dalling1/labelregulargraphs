// set up a two-dimensional array //////////////////////////////////////////////////////// fn: createArray
// ref: https://stackoverflow.com/questions/966225/
function createArray(length=0) {
 var arr = Array(length);
 var i = length;
 if (arguments.length > 1) {
  var args = Array.prototype.slice.call(arguments, 1);
  while(i--) arr[length-1 - i] = createArray.apply(this, args);
 }
 return arr;
}

// generate a random integer ///////////////////////////////////////////////////////////// fn: randInt
// ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function randInt(min, max) {
 if(typeof max === "undefined"){
  max = min;
  min = 0;
 }
 min = Math.ceil(min);
 max = Math.floor(max);
 return Math.floor(Math.random() * (max - min + 1)) + min; // max and min are both inclusive
}

// initialise the d3 model /////////////////////////////////////////////////////////////// fn: initialiseD3
function initialiseD3(){
 var thesvg = document.getElementById("thesvg");
 var svgwidth = thesvg.getBoundingClientRect().width;
 var svgheight = thesvg.getBoundingClientRect().height;
 var debug = false;

//  .nodes([{}]) // initialize with a single node
 force = d3.layout.force()
     .size([svgwidth, svgheight])
     .nodes([{x:Math.round(svgwidth/2), y:Math.round(svgheight/2)}]) // initialize with a single node, at the centre
     .gravity(document.getElementById("input_gravity").value)
     .charge(-document.getElementById("input_repulsion").value)
     .linkDistance(document.getElementById("input_edgelength").value)
     .on("tick", tick);

 var drag = force.drag()
     .on("dragstart", dragstart);

 var svg = d3.select("#thesvg")
     .attr("width", svgwidth)
     .attr("height", svgheight)
     .on("mousemove", mousemove)
     .on("mouseleave", mouseleave)
     .on("mouseenter", mouseenter)
     .on("DOMMouseScroll", mousewheel)
     .on("mousedown", d3click);

 svg.append("rect")
     .attr("width", svgwidth)
     .attr("height", svgheight);

  // global variables:
 nodes = force.nodes();
 links = force.links();
 node = svg.selectAll(".node");
 link = svg.selectAll(".link");

 var cursor = svg.append("circle")
     .attr("id","thecursor")
     .attr("r", circleSize)
     .attr("transform", "translate(-100,-100)")
     .attr("class", "cursor");

 // keep track of the links between nodes
 // initialise, and then loop through "links" and record those present (which will be none, initially)
 linkedByIndex = {};
 links.forEach(function(d) {
  linkedByIndex[d.target.myindex + "," + d.source.myindex] = 1;
 });

 // size of nodes
 var nodeRadius = parseInt(document.getElementById("input_noderadius").value);

 // add some attributes to the first node
 nodes[0].group = 0;
 nodes[0].myindex = 0;
 nodes[0].isleaf = true;
 nodes[0].id = "node0";
 nodes[0].r = nodeRadius;
// nodes[0].fixed = false; // immobile  (can still be dragged by the user)

 // get things going
 restart();
}

function d3click(){
 var debug = false;
 var Ngroups = parseInt(document.getElementById("input_categories").value);
 var nodeRadius = parseInt(document.getElementById("input_noderadius").value);

 force.stop(); // necessary?
 var point = d3.mouse(this);
 var clicklocation = {x: Math.round(point[0]), y: Math.round(point[1])};

 // first, check if we are actually clicking on an existing node (with 1-pixel padding)
 var clickedNode = false;
 var clickedNodeIndex = -1;
 nodes.forEach(function(thisnode) {
  thisdist = distance(clicklocation,thisnode);
  var nodesize = thisnode.r;
  if (thisdist < (nodesize+1)) {
   clickedNode = true;
   clickedNodeIndex = thisnode.index;
  }
 });

 // if we clicked on a node
 if (clickedNode) {
  if (debug) console.log("You clicked on a node! (Node "+clickedNodeIndex+")");
  // ... then do nothing: node clicks and drags are handled elsewhere
 } else {
  nodes.forEach(function(thisnode) {
   thisdist = distance(clicklocation,thisnode);
   if (thisdist < circleSize) {
    if (debug) console.log("Clicked at ("+clicklocation.x+", "+clicklocation.y+")");
    if (debug) console.log("Node "+thisnode.myindex+" is within the circle, so we add any required child nodes to it");
    if (debug) console.log("Node index="+thisnode.index+" myindex="+thisnode.myindex+" at ("+thisnode.x+", "+thisnode.y+") to ("+clicklocation.x+", "+clicklocation.y+") is dist="+Math.round(thisdist));

    // 1. count how many neighbours of each type this node has:
    count = Array(Ngroups);
    for (i=0;i<Ngroups;i++){ count[i] = 0; } // initialise to zero
    nodes.forEach(function(othernode) {
     if (othernode.myindex != thisnode.myindex) {
      if (neighbouring(thisnode,othernode)){
       count[othernode.group]++;
      }
     }
    });

    // 2. having counted, look at the counts and add new nodes where required (to bring
    //    the counts up to those specified in the generating matrix [as it currently exists]):
    // i. loop through the counts:
    var genMatrix = getMatrix();
    for (g=0;g<Ngroups;g++){
     if (debug) console.log("genMatrix = "+genMatrix[thisnode.group][g]+"  count = "+count[g]);
     // ii. compare the count with the generating matrix, and
     // iii. add nodes as required
     for (k=count[g];k<genMatrix[thisnode.group][g];k++){ // if the count already matches genMatrix, this will be a zero-length for-loop
      if (debug) console.log(" + adding neighbour to node "+thisnode.myindex)
      nodes.push({x:clicklocation.x+randInt(0,50)-25,y:clicklocation.y+randInt(0,50)-25,group:g,myindex:nodes.length,r:nodeRadius});
      if (debug) console.log("         ADDED NODE AT x="+nodes[nodes.length-1].x+", y="+nodes[nodes.length-1].y+", index="+nodes[nodes.length-1].index);

      nodes[nodes.length-1].myindex = nodes.length-1;
      nodes[nodes.length-1].group = g;
      nodes[nodes.length-1].isleaf = true;
      nodes[nodes.length-1].r = nodeRadius;
//      nodes[nodes.length-1].fixed = false; // *probably* this should always be false for *new* nodes...

      // now create a link to the new node from the parent:
      createLink(thisnode,nodes[nodes.length-1]);

      if (debug) console.log("... created node "+nodes[nodes.length-1].myindex+" with group "+nodes[nodes.length-1].group);

      // update the leaf status of this node:
      thisnode.isleaf = false;
     }
    }
   }
  });
 }
 restart();
}

// find all of the leaf nodes and add their neighbours /////////////////////////////////// fn: addAllLeaves
function addAllLeaves(){
 var debug = false;
 var Ngroups = parseInt(document.getElementById("input_categories").value);
 var nodeRadius = parseInt(document.getElementById("input_noderadius").value);

 force.stop(); // necessary?

 nodes.forEach(function(thisnode) {
  // 1. count how many neighbours of each type this node has:
  count = Array(Ngroups);
  for (i=0;i<Ngroups;i++){ count[i] = 0; } // initialise to zero

  if (thisnode.isleaf) { // *** ONLY ACT ON LEAVES ***
   nodes.forEach(function(othernode) {
    if (othernode.myindex != thisnode.myindex) {
     if (neighbouring(thisnode,othernode)){
      count[othernode.group]++;
     }
    }
   });

   // 2. having counted, look at the counts and add new nodes where required (to bring
   //    the counts up to those specified in the generating matrix [as it currently exists]):
   // i. loop through the counts:
   var genMatrix = getMatrix();
   for (g=0;g<Ngroups;g++){
    if (debug) console.log("genMatrix = "+genMatrix[thisnode.group][g]+"  count = "+count[g]);
    // ii. compare the count with the generating matrix, and
    // iii. add nodes as required
    for (k=count[g];k<genMatrix[thisnode.group][g];k++){ // if the count already matches genMatrix, this will be a zero-length for-loop
     if (debug) console.log(" + adding neighbour to node "+thisnode.myindex)
     nodes.push({x:Math.round(thisnode.x+randInt(0,50)-25),y:Math.round(thisnode.y+randInt(0,50)-25),group:g,myindex:nodes.length,r:nodeRadius});
     if (debug) console.log("         ADDED NODE AT x="+nodes[nodes.length-1].x+", y="+nodes[nodes.length-1].y+", index="+nodes[nodes.length-1].index);

     nodes[nodes.length-1].myindex = nodes.length-1;
     nodes[nodes.length-1].group = g;
     nodes[nodes.length-1].isleaf = true;
     nodes[nodes.length-1].r = nodeRadius;
//     nodes[nodes.length-1].fixed = false; // *probably* this should always be false for *new* nodes...

     // now create a link to the new node from the parent:
     createLink(thisnode,nodes[nodes.length-1]);
     if (debug) console.log("... created node "+nodes[nodes.length-1].myindex+" with group "+nodes[nodes.length-1].group);

     // update the leaf status of this node:
     thisnode.isleaf = false;
    }
   }
  }
 });
 restart();
}

// the time-step updating function for the d3 model ////////////////////////////////////// fn: tick
function tick() {
 var gridSizeX = 50;
 var gridSizeY = 50;

 node.attr("cx", function(d) { return d.x; })
     .attr("cy", function(d) { return d.y; });
 node.attr("px", function(d) { return d.cx; })
     .attr("py", function(d) { return d.cy; });

 node.attr("transform", function(d) {"translate(" + gridSizeX*Math.round(d.px/gridSizeX)-d.px + ", "+ gridSizeY*Math.round(d.py/gridSizeY)-d.py +" );"; });

 link.attr("x1", function(d) { return d.source.x; })
     .attr("y1", function(d) { return d.source.y; })
     .attr("x2", function(d) { return d.target.x; })
     .attr("y2", function(d) { return d.target.y; });
}

// define double-click behaviour ///////////////////////////////////////////////////////// fn: dblclick
function dblclick(d) {
 var debug = false;
 if (debug) console.log("Double click!");
 d3.select(this).classed("fixed", d.fixed = false);
}

// set up drag behaviour ///////////////////////////////////////////////////////////////// fn: dragstart
function dragstart(d) {
 var debug = false;
 if (debug) console.log("Dragging!");
 d3.select(this).classed("fixed", d.fixed = true);
}

// function for restarting the d3 model ////////////////////////////////////////////////// fn: restart
function restart() {
 var nodeRadius = parseInt(document.getElementById("input_noderadius").value);
 var svg = d3.select("#thesvg");
 var debug = false;
 force.gravity(document.getElementById("input_gravity").value)
      .charge(-document.getElementById("input_repulsion").value)
      .linkDistance(document.getElementById("input_edgelength").value);

 link = link.data(links);

 link.enter().insert("line", ".node")
     .attr("class", "link");

 node = node.data(nodes)
    .attr("class", "node")
    .on("dblclick", dblclick)
    .call(force.drag);

 node.enter().insert("circle", ".cursor")
     .attr("class", "node")
     .attr("r", nodeRadius)
     .call(force.drag);

 // check whether we are fading the leaf nodes:
 var dofadeleaves = document.getElementById("input_fadeleaves").checked;

 // let the nodes be coloured according to their group:
//works too:  svg.selectAll(".node").style("fill",function(d){return d3colour(d.group);});
//also works: svg.selectAll(".node").style("fill",function(d){return document.getElementById("picker"+d.group).value;});
 svg.selectAll(".node")
    .style("fill",function(d){if (document.getElementById("input_fill").checked) return document.getElementById("picker"+d.group).value; else return "#fff0";})
    .style("stroke",function(d){if (document.getElementById("input_outlines").checked) return document.getElementById("outlinepicker").value; else return "none";})
    .style("fill-opacity",function(d){if (d.isleaf && dofadeleaves) return "0.3"; else return "1";})
    .style("stroke-opacity",function(d){if (d.isleaf && dofadeleaves) return "0"; else return "1";})
    .style("stroke-dasharray",function(d){if (d.isleaf && dofadeleaves) return "2,2"; else return "none";});

 // outline? or leave black
//    .style("stroke",function(d){return d3colour(d.group);});

 svg.selectAll(".link")
    .style("stroke",function(d){if (document.getElementById("input_edges").checked) return document.getElementById("edgepicker").value; else return "none";})
    .style("stroke-opacity",function(d){if ((d.source.isleaf || d.target.isleaf) && dofadeleaves) return "0.3"; else return "1";})
    .style("stroke-dasharray",function(d){if ((d.source.isleaf || d.target.isleaf) && dofadeleaves) return "2,2"; else return "none";});

// svg.selectAll(".node").style("stroke","#000")

 force.start();
 return 0;
}

// fetch the generating matrix entries from the form ///////////////////////////////////// fn: getMatrix
function getMatrix(){
 var debug = false;
 var Ngroups = parseInt(document.getElementById("input_categories").value);
 var genMatrix = createArray(Ngroups,Ngroups); // initialise

 for (m=0;m<Ngroups;m++){
  for (n=0;n<Ngroups;n++){
   // get the values from the form:
   if (debug) console.log("value ("+m+","+n+") is ["+$("#gen_"+m+"_"+n).val()+"]");
   genMatrix[m][n] = $("#gen_"+m+"_"+n).val();
  }
 }
 return genMatrix;
}

// set the generating matrix from a variable ///////////////////////////////////////////// fn: getMatrix
function setMatrix(genMatrix){
 var debug = false;
 var Ngroups = parseInt(document.getElementById("input_categories").value);

 // we don't test the size, just use whatever partial matrix is given
 for (m=0;m<Ngroups;m++){
  for (n=0;n<Ngroups;n++){
   // put the values into the form:
   if (genMatrix[m][n]!=undefined) $("#gen_"+m+"_"+n).val(genMatrix[m][n]);
  }
 }

}


// create the dot code for the current graph ///////////////////////////////////////////// fn: makeDot
function makeDot(){
 var dot = "graph {\n";
 var lastsource = "";
 var lasttarget = "";
 var Ngroups = parseInt(document.getElementById("input_categories").value);

 // loop through the group, set each one's colour and then list its nodes:
 var keepCount = 0;
 for (g=0;g<Ngroups;g++){
  dot += "\n {color:"+document.getElementById("picker"+g).value+"}\n  ";
  nodes.forEach(function(d) {
   if (d.group == g) {
    dot += " "+d.myindex+";"
    keepCount++;
    if (keepCount%20 == 0){ // wrap long lines after 20 nodes
     dot += "\n  ";
    }
   }
  });
 }
 dot += "\n\n";

 // loop through the links nodes and add them to the output
 links.forEach(function(d) {
  if (d.source.myindex == lasttarget && d.target.myindex == lastsource){
   // do nothing (do not print both links for an undirected edge)
  } else {
   dot += " "+d.source.myindex+" -- "+d.target.myindex+"\n";
  }
  lastsource = d.source.myindex;
  lasttarget = d.target.myindex;
 });
 dot += "\n}\n";

 document.getElementById("dotcontent").innerHTML = "<pre>"+dot+"</pre>";
 document.getElementById("dotcontent").setAttribute("data-copy-text",dot); // for the clipboard
}


// create the initial matrix editing table and display some control values /////////////// fn: setup
function setup(){
 // save the current matrix entries if they exist
 if (document.getElementById("matrixtable")!=null){
  neomatrix = getMatrix();
 }

 var n = parseInt(document.getElementById("input_categories").value);
 document.getElementById("editorcontent").innerHTML = createMatrixEditor(n);

 // initial d3 "cursor" size
 circleSize = 80;

 // initialise the colour pickers
 $(".basicpicker").spectrum({
  preferredFormat: "hex3",
 });

 setColours();

 // put the values back into the matrix, if we saved them, otherwise save them now
 if (typeof(neomatrix)!="undefined"){
  setMatrix(neomatrix);
 } else {
  neomatrix = getMatrix();
 }

}

// HTML input labelling function ///////////////////////////////////////////////////////// fn: setOutputValues
// function which looks for inputs and their labels (containing the input value), and sets the label
// (called on page load, to set the initial labels, and when one of the slider controls changes (valency, maxdepth))
function setOutputValues(){
 var debug = false;

 var inputs = document.getElementsByTagName("input"); // get a list of the page inputs
 for (var i=0;i<inputs.length;i++){ // loop over the inputs
  if (inputs[i].id.length && !inputs[i].classList.contains("pickertheme")){ // omit the colour pickers from this process
   if (debug) console.log("examining "+inputs[i].id);
   outputID = inputs[i].id.replace('input_','output_');
   if (!!document.getElementById(outputID)){ // does an output tag for this control exist?
    document.getElementById(outputID).value = inputs[i].value; // set the value of the output to the input
   }
  } else {
   if (debug) console.log("skipping "+inputs[i].id);
  }
 }
}

// set up the d3 colours ///////////////////////////////////////////////////////////////// fn: d3colour
function d3colour(n){
// var d3colour = d3.scale.category20();
 var d3colourscale = d3.scale.category20();
 var colour = "#0000ff";
 switch (n){
  case 0: colour = "#f94433"; break;
  case 1: colour = "#2211fc"; break;
  case 2: colour = "#34fb44"; break;
  default:
   colour = d3colourscale(n);
 }
 return colour;
}

// set the scroll-wheel behaviour //////////////////////////////////////////////////////// fn: mousewheel
function mousewheel() {
 // check on the allowed radii: get slider values
 var delta = d3.event.detail;
 var minCircleRadius = 10;
 var maxCircleRadius = 100;

 circleSize += delta;
 if (circleSize<minCircleRadius) circleSize=minCircleRadius;
 if (circleSize>maxCircleRadius) circleSize=maxCircleRadius;

 var cursor = d3.select("#thecursor");
 cursor.attr("r", circleSize);
}

// function to calculate Euclidean distance between two nodes //////////////////////////// fn: distance
// also works with, eg., mouse-click coordinates when packed as {x: point[0], y: point[1]}
function distance(node1, node2) {
  var dist = Math.sqrt(Math.pow(node1.x-node2.x,2.0) + Math.pow(node1.y-node2.y,2.0));
  return dist;
}

// function to find the bounding box of the extant nodes ///////////////////////////////// fn: bounds
function bounds() {
 var minX = 1000000;
 var maxX = -1000000;
 var minY = 1000000;
 var maxY = -1000000;
 nodes.forEach(function(thisnode) {
  if ((thisnode.x-thisnode.r)<minX) {minX=(thisnode.x-thisnode.r); minXnode=thisnode.index;}
  if ((thisnode.x+thisnode.r)>maxX) {maxX=(thisnode.x+thisnode.r); maxXnode=thisnode.index;}
  if ((thisnode.y-thisnode.r)<minY) {minY=(thisnode.y-thisnode.r); minYnode=thisnode.index;}
  if ((thisnode.y+thisnode.r)>maxY) {maxY=(thisnode.y+thisnode.r); maxYnode=thisnode.index;}
 });
 minX=Math.floor(minX);
 maxX=Math.ceil(maxX);
 minY=Math.floor(minY);
 maxY=Math.ceil(maxY);
 return {minX, maxX, minY, maxY, minXnode, maxXnode, minYnode, maxYnode};
}

// function which returns true if two nodes are linked /////////////////////////////////// fn: neighbouring
// we do this by keeping track of links in an array
function neighbouring(a, b) {
 // a and b are nodes (not node indices, etc.)
 return linkedByIndex[a.myindex + "," + b.myindex];
}

// create an edge between nodes ////////////////////////////////////////////////////////// fn: createLink
// making this a function lets us modify the desired behaviour in one place
//   (eg. directional links? self links? etc.)
function createLink(a, b) {
 // Note that a and b are nodes (not node indices, etc.)
 var allowSelfLink = false;
 var allowDirectedLinks = false; // otherwise, create a link each way
 var okayToLink = true;

 if (a.myindex==b.myindex & !allowSelfLink) { // check if we are linking a node to itself
  okayToLink = false;
 }

 if (okayToLink){
  links.push({source: a, target: b}); // add the link (a -> b)
  linkedByIndex[a.myindex + "," + b.myindex] = 1; // and update the connectivity list
  if (!allowDirectedLinks){ // need links the other way too
   links.push({source: b, target: a});
   linkedByIndex[b.myindex + "," + a.myindex] = 1;
  }
 }
}


// set up the mouse move behaviour /////////////////////////////////////////////////////// fn: mousemove
function mousemove() {
 var cursor = d3.select("#thecursor");
 cursor.attr("transform", "translate(" + d3.mouse(this) + ")");
}

// set up the mouse behaviour when it leaves the SVG ///////////////////////////////////// fn: mouseleave
function mouseleave() {
 var cursor = d3.select("#thecursor");
 cursor.attr("display", "none");
}

// set up the mouse behaviour when it enters the SVG ///////////////////////////////////// fn: mouseenter
function mouseenter() {
 var cursor = d3.select("#thecursor");
 cursor.attr("display", "");
}

// set up the click behaviour //////////////////////////////////////////////////////////// fn: mousedown
function mousedown() {
 if (false) switch (event.which) {
  case 1:
   alert("Left Mouse button pressed.");
   break;
  case 2:
   alert("Middle Mouse button pressed.");
   break;
  case 3:
   alert("Right Mouse button pressed.");
   break;
  default:
   alert("You have a strange Mouse!");
 }
}

// copy the specified object's contents ////////////////////////////////////////////////// fn: copy
async function copy(targetId=null){
 // Modified from https://www.jasongaylord.com/blog/2020/05/21/copy-to-clipboard-using-javascript
 if (!navigator.clipboard){
  return;
 }

 try {
  if (targetId==null){
   target = event.srcElement;
  } else {
   target = document.getElementById(targetId);
  }
  var copy_value = target.getAttribute("data-copy-text");
  await navigator.clipboard.writeText(copy_value);
 } catch (error){
  console.error("copy failed", error);
 }
}

