$(document).ready(function() {
  "use strict";

  ///////////////////////////////////////////////////////////////////////////// 
  // setCheckBoxes: assumes the following DOM context:
  // <div id = "divId">
  //   <p>Question?</p>
  //   <label>
  //     <input type="radio" name="name0" value=1>some text</label>
  //   <label>
  //     <input type="checkbox" class="indented chkClass" name ="name1"... />
  //   <label>
  //     <input type="checkbox" class="indented chkClass" name ="name2"... />
  //   ...
  //   <label>
  //     <input type="radio" name="name3" value=1>some text</label>
  //   ...
  // </div>
  //
  // The checkboxes "belong to" "this", the first radio button. Iff that first
  // radio button is checked are the subsidiary/modifying checkboxes enabled
  // and only then can they be checked.
  ///////////////////////////////////////////////////////////////////////////// 
  var setCheckBoxes = function() {
    var chkdRadioSelector = "input[name='" + this.name + "']:checked";
    var divId = "#" + this.parentElement.parentElement.id;
    var disableChkBoxes = 
      $(chkdRadioSelector, divId).val() != 1; 
    var chkBoxClass = "." +
      this.parentElement.parentElement.children[3].children[0].className
      .split(" ")[1];
    $(chkBoxClass) 
      .attr("disabled", disableChkBoxes) .attr("checked", function() { 
      return this.checked && !disableChkBoxes; }); 
  };

  $("#s5q1a input[type=radio]").on("change", setCheckBoxes);
  $("#s5q1b input[type=radio]").on("change", setCheckBoxes);
  $("#s5q1c input[type=radio]").on("change", setCheckBoxes);
  $("#s5q1d input[type=radio]").on("change", setCheckBoxes);
});
