// create a table of text inputs //////////////////////////////////////////////////// fn: createMatrixEditor
function createMatrixEditor(n=10){
 // n is the number of categories (ie. rows and columns)

 var defaultColours = ["#f94433", "#18181c", "#34fb44", "#f67ec6", "#235ed0", "#970ba0", "#f29836", "#939a97", "#4bb709", "#dfe33b"];
 var defaultValue = '1';

 var output = ' <table>\n';
// var output += '  <caption>|categories| = '+n+'</caption>\n';

 // colour-picker row
 output += '  <tr>\n';
 output += '   <th></th>\n';
 for (var i=0;i<n;i++){
  output += '   <th><input type="text" class="basicpicker" id="picker'+i+'" onchange="setColours(this);restart();" value="'+defaultColours[i]+'" /></th><!--'+(i+1)+'-->\n';
 }
 output += '  </tr>\n';

 // each row of the matrix
 for (var i=0;i<n;i++){
  output += '  <tr>\n';
  output += '   <th class="cat'+i+'">'+(i+1)+'</th>\n';
  for (var j=0;j<n;j++){
   output += '   <td><input type="text" size="3" id="gen_'+i+'_'+j+'" value="'+defaultValue+'" name="thematrix[]" onchange=\'document.getElementById("gen_'+i+'_'+j+'").value=(this.value);restart();\' /></td>\n';
  }
  output += '  </tr>\n';
 }

 output += ' </table>\n';
 output += ' <p>Read across rows to see the neighbour counts</p>\n';

 return output;
}


// when a colour picker is changed, update objects where that colour is used //////// fn: setColours
function setColours(event=null){
 if (event!=null){
  // update a single colour
  var newcolour = event.value;
  var cat = event.id.replace("picker","");
  var obj = document.getElementsByClassName("cat"+cat);
  for (var i=0;i<obj.length;i++) obj[i].style.backgroundColor=newcolour;
 } else {
  // do them all
  var Ngroups = parseInt(document.getElementById("input_categories").value);
  for (var n=0;n<Ngroups;n++){
   var newcolour = document.getElementById("picker"+n).value;
   var obj = document.getElementsByClassName("cat"+n);
   for (var i=0;i<obj.length;i++) obj[i].style.backgroundColor=newcolour;
  }
 }
}
