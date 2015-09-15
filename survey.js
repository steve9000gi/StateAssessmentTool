$(document).ready(function() {
  "use strict";

  var backendBase = 'http://syssci.renci.org:8081';

  ///////////////////////////////////////////////////////////////////////////// 
  // setCheckBoxes: assumes the following DOM context:
  //
  // <div id = "divId">
  //   <p>Question?</p>
  //   <label>
  //     <input type="radio" name="name0" value="1"/>
  //     Yes (Select all that apply):
  //   </label>
  //
  //   <label>
  //     <input type="checkbox" class="chkClass" name ="name0.1"... /></label>
  //   <label>
  //     <input type="checkbox" class="chkClass" name ="name0.2"... /></label>
  //   ...
  //   <label>
  //     <input type="checkbox" class="chkClass" name ="name0.n"... /></label>
  //
  //   <label>
  //     <input type="radio" name="name3" value=1>No or unsure or...</label>
  //   ...
  // </div>
  //
  // The checkboxes expand on ("belong to") the first radio button (strictly,
  // the radio button with value = 1). Iff that radio button is checked are the
  // subsidiary/modifying checkboxes enabled and only then can they be checked.
  ///////////////////////////////////////////////////////////////////////////// 
  var setCheckBoxes = function() {
    var chkdRadioSelector = "input[name='" + this.name + "']:checked";
    var divId = this.parentElement.parentElement.id;
    var disableChkBoxes = $(chkdRadioSelector, "#" + divId).val() != 1; 
    var chkBoxClass = "." +
      this.parentElement.parentElement.children[3].children[0].className
      .split(" ")[1];
    var chkboxLabelSelector = "." + divId + "-chkboxLabel";
    $(chkBoxClass) 
      .attr("disabled", disableChkBoxes)
      .attr("checked", function() { return this.checked && !disableChkBoxes; });
    $(chkboxLabelSelector).toggleClass("grayed-out", disableChkBoxes);

    // Trigger event handler to empty text input associated with a checkbox:
    $(chkBoxClass).change();
  };

  $("#s5q1a input[type=radio]").on("change", setCheckBoxes);
  $("#s5q1b input[type=radio]").on("change", setCheckBoxes);
  $("#s5q1c input[type=radio]").on("change", setCheckBoxes);
  $("#s5q1d input[type=radio]").on("change", setCheckBoxes);
  $("#s2q4 input[type=radio]").on("change", setCheckBoxes);
  $("#s4q1 input[type=radio]").on("change", setCheckBoxes);

  // Text input is enabled according to whether "this", presumed to be the
  // associated checkbox, is checked. If unchecked, text is cleared. Affects all
  // text inputs that share the same grandparent with "this".
  var setTextEnabling = function() {
    var textSelector = "#" + this.parentElement.parentElement.id
      + " input[type=text]";
    $(textSelector).attr("disabled", !this.checked);
    if (!this.checked) {
      $(textSelector)[0].value = ""; 
    }
  };

  $("#s2q4-other").on("change", setTextEnabling);
  $("#s4q1-other").on("change", setTextEnabling);

  // Similar to setTextEnabling() except that "this" is assumed to be a radio
  // button rather than a checkbox. Radio buttons tend to come in groups wherein
  // the selection of individual inputs, unlike that of checkboxes, is mutually
  // exclusive, so the boolean for determining whether the text input should be
  // disabled must necessarily be "is 'this' the radio button with the
  // associated text?" rather than "is 'this' checked?": so we can't make 
  // setTextEnabling() the onchange event handler for a radio button, because in
  // such an arrangement this.checked always === true. Might there be a way to 
  // resolve this using the closure for a wrapper function?
  $("#s2q5div input[type=radio").on("change", function(e) {
    var textSelector = "#" + this.parentElement.parentElement.id
      + " input[type=text]";
    $(textSelector).attr("disabled", this.value !== "5");
    if (this.value !== "5") {
      $(textSelector)[0].value = ""; 
    }
  });

  // If the third radio button in s1.q1 is selected, disable and clear s1.q2.
  $("input[name='s1.q1']").on("change", function() {
    var skipNextQuestion = this.value === "3";
    $("#s1q2div *").attr("disabled", skipNextQuestion);
    $("#s1q2div").toggleClass("grayed-out", skipNextQuestion);
    $("#s1q2div input[type=radio]").attr("checked", function() {
      return this.checked && !skipNextQuestion;
    });
    if (skipNextQuestion) {
      $("[name='s1.q2.notes']")[0].value = "";
    }
  });

  // For any question with a textarea that needs to be disabled and emptied of
  // text (and its associated label[s] grayed out) if the answer isn't "yes".
  // Assumptions: grandparent has an id, label associated with textarea to be
  // conditionally disabled is of class="list-label".
  var setTextareaEnabling = function() {
    var disable = this.value !== "1";
    var textareaSelector = "[name='" + this.name + ".list']";
    var labelSelector = "#" + this.parentElement.parentElement.id
      + " .list-label";
    $(textareaSelector).attr("disabled", disable);
    if (disable) {
      $(textareaSelector)[0].value = "";
    }
    $(labelSelector).toggleClass("grayed-out", disable);
  };

  $("[name='s1.q5']").on("change", setTextareaEnabling);
  $("[name='s4.q2']").on("change", setTextareaEnabling);

  // If one of the "Capacity" sets of radio buttons has a value of 0 or 1, then
  // disable and uncheck the associated "Level of Actitity" radio buttons, and
  // gray out the labels.
  var setLevelOfActivityEnabling = function() {
    var disableLOA = ((this.value ==="0") || (this.value === "1"));
    var capacityNameArray = this.name.split(".");
    var loaName = capacityNameArray[0] + "." + capacityNameArray[1] + "."
      + "activity";
    var loaP = $(this.parentElement.parentElement.nextElementSibling);
    $("input[name='" + loaName + "']")
      .attr("disabled", disableLOA)
      .attr("checked", function() { return this.checked && !disableLOA; });
    loaP.toggleClass("grayed-out", disableLOA).find("label")
      .toggleClass("grayed-out", disableLOA);
  };

  $("input[name$='capacity']").on("change", setLevelOfActivityEnabling);

  // Turn off tooltips for anchors:
  $("a").hover(
    function () {
      $(this).data("title", $(this).attr("title"));
      $(this).removeAttr("title");
    },
    function () {
      $(this).attr("title", $(this).data("title"));
    }
  );

  $("a").click(function() {
    $(this).attr("title", $(this).data("title"));
  });

  var getVisibleSection = function() {
    return $(".hideable").filter(function() {
      return $(this).css("display") === "block";
    });
  };

  var showSelectedSection = function(selected) {
    $(".hideable").hide();
    $("#logo")[0].scrollIntoView();
    $("#navigation-box a").removeClass("selected");
    $(selected).show();
  };

  $("#prev").click(function() {
    var current = $(getVisibleSection())[0].id;
    if (current !== "contents") {
      var next = (current === "overview")
               ? "#contents"
               : ((current === "section0") ? "#overview"
                                           : "#section" + (+current[7] - 1));
      showSelectedSection(next);
      var selectedTitle;
      switch (current) {
	case "overview":
	  selectedTitle = "contents";
	  break;
	case "section0":
	  selectedTitle = "overview";
	  break;
	default:
	  selectedTitle = "section" + (+current[7] - 1);
      };
      var selectedA = "#navigation-box a[title='" + selectedTitle + "']";
      $(selectedA).addClass("selected");
    }
  });

  $("#next").click(function() {
    var current = $(getVisibleSection())[0].id;
    if (current !== "section5") {
      var next = (current === "contents")
               ? "#overview"
               : ((current === "overview") ? "#section0"
                                           : "#section" + (+current[7] + 1));
      showSelectedSection(next);
      var selectedTitle;
      switch (current) {
	case "contents":
	  selectedTitle = "overview";
	  break;
	case "overview":
	  selectedTitle = "section0";
	  break;
	default:
	  selectedTitle = "section" + (+current[7] + 1);
      };
      var selectedA = "#navigation-box a[title='" + selectedTitle + "']";
      $(selectedA).addClass("selected");
    }
  });

  $("#contents a, #navigation-box a[class!='relative-link']").click(function() {
    showSelectedSection("#" + this.title);
    var selectedA = "#navigation-box a[title='" + this.title + "']";
    $(selectedA).addClass("selected");
  });

  $("#single-page").click(function() {
    $(".hideable").show();
    $("#logo")[0].scrollIntoView();
    $("#navigation-box a").removeClass("selected");
  });

  $("#instructions-button").click(function() {
    window.open("instructions.html","_blank");
  });

  // Warning: modifies its argument.
  var slurpSurveyMetadata = function(survey) {
    // TODO: check if this works on all browsers, esp. those that don't yet
    // have a built-in date-type input element:
    survey.date = d3.select('input[name=date]').node().value
    var sel = document.getElementById('state-select');
    survey.state = sel.options[sel.selectedIndex].value
    survey.agency = document.getElementById('agency').value
    survey.names = [];
    survey.affiliations = [];
    for (var i=1; i<=5; i++) {
      survey.names[i-1] = document.getElementsByName('name' + i)[0].value;
      survey.affiliations[i-1] =
        document.getElementsByName('affiliation' + i)[0].value;
    }
  };

  var slurpRadio = function(name) {
    // TODO: try using d3's property method here and elsewhere.
    var node = d3.select('input[name="' + name + '"]:checked').node();
    var response = {
      radio: node ? node.value : '',
      notes: d3.select('textarea[name="' + name + '.notes"]').node().value
    };
    node = d3.select('textarea[name="' + name + '.list"]').node();
    if (node) response.listText = node.value;
    node = d3.select('input[name="' + name + '.other"]').node();
    if (node) response.otherText = node.value;
    return response;
  };

  var slurpChecks = function(name) {
    var checks = [];
    d3.selectAll('input[name^="' + name + '.a"]')
      .each(function(d,i) { checks.push(this.checked) })
    return {
      checks: checks,
      notes: d3.select('textarea[name="' + name + '.notes"]').node().value
    };
  };

  // For questions s2.q4, s4.q1, and the subquestions of s5.q1, where the logic
  // is "if yes, then check all that apply".
  var slurpRadioChecks = function(name) {
    var radio = d3.select('input[name="' + name + '"]:checked').node();
    var response = {
      radio: radio ? radio.value : '',
      notes: d3.select('textarea[name="' + name + '.notes"]').node().value
    };
    var checks = [];
    d3.selectAll('input[name^="' + name + '."]')
      .each(function(d,i) { checks.push(this.checked) })
    response.checks = checks;
    return response;
  };

  var slurpCLOA = function(name) {
    var cap = d3.select('input[name="' + name + '.capacity"]:checked').node();
    var act = d3.select('input[name="' + name + '.activity"]:checked').node();
    var node = d3.select('textarea[name="' + name + '.list"]').node();
    return {
      capacity: cap ? cap.value : '',
      activity: act ? act.value : '',
      listText: node ? node.value : '',
      notes:    d3.select('textarea[name="' + name + '.notes"]').node().value
    };
  };

  var slurpSection1 = function() {
    var section = {questions: []};
    section.questions[0] = slurpRadio('s1.q1');
    section.questions[1] = slurpRadio('s1.q2');
    section.questions[2] = slurpRadio('s1.q3');
    section.questions[3] = slurpChecks('s1.q4');
    section.questions[4] = slurpRadio('s1.q5');
    section.questions[5] = slurpRadio('s1.q6');
    section.questions[6] = slurpCLOA('s1.q7');
    section.questions[7] = slurpCLOA('s1.q8');
    section.questions[8] = slurpCLOA('s1.q9');
    section.questions[9] = slurpCLOA('s1.q10');
    section.questions[10] = slurpRadio('s1.q11');
    section.followupNotes =
      d3.select('textarea[name="s1.followup.notes"]').node().value;
    return section;
  };

  var slurpSection2 = function() {
    var section = {questions: []};
    section.questions[0] = slurpRadio('s2.q1');
    section.questions[1] = [
      slurpRadio('s2.q2a'),
      slurpRadio('s2.q2b'),
    ];
    section.questions[2] = slurpRadio('s2.q3');
    section.questions[3] = slurpRadioChecks('s2.q4');
    section.questions[4] = slurpRadio('s2.q5');
    section.questions[5] = slurpRadio('s2.q6');
    section.questions[6] = slurpRadio('s2.q7');
    section.questions[7] = slurpCLOA('s2.q8');
    section.questions[8] = slurpCLOA('s2.q9');
    section.questions[9] = slurpCLOA('s2.q10');
    section.questions[10] = slurpCLOA('s2.q11');
    section.questions[11] = slurpRadio('s2.q12');
    section.followupNotes =
      d3.select('textarea[name="s2.followup.notes"]').node().value;
    return section;
  };

  var slurpSection3 = function() {
    var section = {questions: []};
    section.questions[0] = slurpRadio('s3.q1');
    section.questions[1] = slurpRadio('s3.q2');
    section.questions[2] = slurpRadio('s3.q3');
    section.questions[3] = slurpRadio('s3.q4');
    section.questions[4] = slurpCLOA('s3.q5');
    section.questions[5] = slurpCLOA('s3.q6');
    section.questions[6] = slurpCLOA('s3.q7');
    section.questions[7] = slurpCLOA('s3.q8');
    section.questions[8] = slurpCLOA('s3.q9');
    section.questions[9] = slurpRadio('s3.q10');
    section.followupNotes =
      d3.select('textarea[name="s3.followup.notes"]').node().value;
    return section;
  };

  var slurpSection4 = function() {
    var section = {questions: []};
    section.questions[0] = slurpRadioChecks('s4.q1');
    section.questions[1] = slurpRadio('s4.q2');
    section.questions[2] = slurpRadio('s4.q3');
    section.questions[3] = slurpRadio('s4.q4');
    section.questions[4] = slurpRadio('s4.q5');
    section.questions[5] = slurpRadio('s4.q6');
    section.questions[6] = slurpCLOA('s4.q7');
    section.questions[7] = slurpCLOA('s4.q8');
    section.questions[8] = slurpCLOA('s4.q9');
    section.questions[9] = slurpCLOA('s4.q10');
    section.questions[10] = slurpCLOA('s4.q11');
    section.questions[11] = slurpRadio('s4.q12');
    section.followupNotes =
      d3.select('textarea[name="s4.followup.notes"]').node().value;
    return section;
  };

  var slurpSection5 = function() {
    var section = {questions: []};
    section.questions[0] = [
      slurpRadioChecks('s5.q1a'),
      slurpRadioChecks('s5.q1b'),
      slurpRadioChecks('s5.q1c'),
      slurpRadioChecks('s5.q1d')
    ];
    section.questions[1] = slurpRadio('s5.q2');
    section.questions[2] = slurpRadio('s5.q3');
    section.questions[3] = slurpCLOA('s5.q4');
    section.questions[4] = slurpCLOA('s5.q5');
    section.questions[5] = slurpCLOA('s5.q6');
    section.questions[6] = slurpCLOA('s5.q7');
    section.questions[7] = slurpRadio('s5.q8');
    section.questions[8] = slurpRadio('s5.q9');
    section.questions[9] = slurpRadio('s5.q10');
    section.followupNotes =
      d3.select('textarea[name="s5.followup.notes"]').node().value;
    return section;
  };

  // Read survey data from document, and return a survey object.
  var slurpSurvey = function() {
    var survey = {};
    slurpSurveyMetadata(survey);
    survey.sections = [];
    survey.sections[0] = slurpSection1();
    survey.sections[1] = slurpSection2();
    survey.sections[2] = slurpSection3();
    survey.sections[3] = slurpSection4();
    survey.sections[4] = slurpSection5();
    console.log(survey);
    return survey;
  };

  var applySurveyMetadata = function(survey) {
    d3.select('input[name=date]').node().value = survey.date;
    if (!survey.state) {
      var stateIdx = 0;
    } else {
      var stateIdx =
        d3.select('#state-select')
          .select('option[value="' + survey.state + '"]').node().index;
    }
    document.getElementById('state-select').selectedIndex = stateIdx;
    document.getElementById('agency').value = survey.agency;
    for (var i=1; i<=5; i++) {
      document.getElementsByName('name' + i)[0].value = survey.names[i-1];
      document.getElementsByName('affiliation' + i)[0].value =
        survey.affiliations[i-1];
    }
  }

  var applyRadio = function(question, name) {
    if (question.radio) {
      document.getElementsByName(name)[question.radio-1].checked = true;
    }
    document.getElementsByName(name + '.notes')[0].value = question.notes;
    if (question.hasOwnProperty('listText')) {
      document.getElementsByName(name + '.list')[0].value = question.listText;
    }
    if (question.hasOwnProperty('otherText')) {
      document.getElementsByName(name + '.other')[0].value = question.otherText;
    }
  };

  var applyChecks = function(question, name) {
    for (var i=1; i <= question.checks.length; i++) {
      document.getElementsByName(name + '.a' + i)[0].checked =
        question.checks[i-1];
    }
    document.getElementsByName(name + '.notes')[0].value = question.notes;
  };

  var applyRadioChecks = function(question, name) {
    var radioEl = document.getElementsByName(name)[question.radio-1];
    if (question.radio) {
      radioEl.checked = true;
    }
    if (radioEl) setCheckBoxes.apply(radioEl);
    document.getElementsByName(name + '.notes')[0].value = question.notes;
    for (var i=1; i <= question.checks.length; i++) {
      document.getElementsByName(name + '.' + i)[0].checked =
        question.checks[i-1];
    }
  };

  var applyCLOA = function(question, name) {
    if (question.capacity) {
      document.getElementsByName(name + '.capacity')[question.capacity]
        .checked = true;
    }
    if (question.activity) {
      document.getElementsByName(name + '.activity')[question.activity]
        .checked = true;
    }
    var node = document.getElementsByName(name + '.list')[0];
    if (node) {
      node.value = question.listText;
    }
    document.getElementsByName(name + '.notes')[0].value = question.notes;
  };

  var applySection1 = function(section) {
    applyRadio(section.questions[0], 's1.q1');
    applyRadio(section.questions[1], 's1.q2');
    applyRadio(section.questions[2], 's1.q3');
    applyChecks(section.questions[3], 's1.q4');
    applyRadio(section.questions[4], 's1.q5');
    applyRadio(section.questions[5], 's1.q6');
    applyCLOA(section.questions[6], 's1.q7');
    applyCLOA(section.questions[7], 's1.q8');
    applyCLOA(section.questions[8], 's1.q9');
    applyCLOA(section.questions[9], 's1.q10');
    applyRadio(section.questions[10], 's1.q11');
    document.getElementsByName('s1.followup.notes')[0].value =
      section.followupNotes;
  };

  var applySection2 = function(section) {
    applyRadio(section.questions[0], 's2.q1');
    applyRadio(section.questions[1][0], 's2.q2a');
    applyRadio(section.questions[1][1], 's2.q2b');
    applyRadio(section.questions[2], 's2.q3');
    applyRadio(section.questions[3], 's2.q4');
    applyRadio(section.questions[4], 's2.q5');
    applyRadio(section.questions[5], 's2.q6');
    applyRadio(section.questions[6], 's2.q7');
    applyCLOA(section.questions[7], 's2.q8');
    applyCLOA(section.questions[8], 's2.q9');
    applyCLOA(section.questions[9], 's2.q10');
    applyCLOA(section.questions[10], 's2.q11');
    applyRadio(section.questions[11], 's2.q12');
    document.getElementsByName('s2.followup.notes')[0].value =
      section.followupNotes;
  };

  var applySection3 = function(section) {
    applyRadio(section.questions[0], 's3.q1');
    applyRadio(section.questions[1], 's3.q2');
    applyRadio(section.questions[2], 's3.q3');
    applyRadio(section.questions[3], 's3.q4');
    applyCLOA(section.questions[4], 's3.q5');
    applyCLOA(section.questions[5], 's3.q6');
    applyCLOA(section.questions[6], 's3.q7');
    applyCLOA(section.questions[7], 's3.q8');
    applyCLOA(section.questions[8], 's3.q9');
    applyRadio(section.questions[9], 's3.q10');
    document.getElementsByName('s3.followup.notes')[0].value =
      section.followupNotes;
  };

  var applySection4 = function(section) {
    applyRadio(section.questions[0], 's4.q1');
    applyRadio(section.questions[1], 's4.q2');
    applyRadio(section.questions[2], 's4.q3');
    applyRadio(section.questions[3], 's4.q4');
    applyRadio(section.questions[4], 's4.q5');
    applyRadio(section.questions[5], 's4.q6');
    applyCLOA(section.questions[6], 's4.q7');
    applyCLOA(section.questions[7], 's4.q8');
    applyCLOA(section.questions[8], 's4.q9');
    applyCLOA(section.questions[9], 's4.q10');
    applyCLOA(section.questions[10], 's4.q11');
    applyRadio(section.questions[11], 's4.q12');
    document.getElementsByName('s4.followup.notes')[0].value =
      section.followupNotes;
  };

  var applySection5 = function(section) {
    applyRadioChecks(section.questions[0][0], 's5.q1a');
    applyRadioChecks(section.questions[0][1], 's5.q1b');
    applyRadioChecks(section.questions[0][2], 's5.q1c');
    applyRadioChecks(section.questions[0][3], 's5.q1d');
    applyRadio(section.questions[1], 's5.q2');
    applyRadio(section.questions[2], 's5.q3');
    applyCLOA(section.questions[3], 's5.q4');
    applyCLOA(section.questions[4], 's5.q5');
    applyCLOA(section.questions[5], 's5.q6');
    applyCLOA(section.questions[6], 's5.q7');
    applyRadio(section.questions[7], 's5.q8');
    applyRadio(section.questions[8], 's5.q9');
    applyRadio(section.questions[9], 's5.q10');
    document.getElementsByName('s5.followup.notes')[0].value =
      section.followupNotes;
  };

  // Update the document to match the data in the given survey object.
  var applySurvey = function(survey) {
    console.log(survey);
    if (!survey || !survey.hasOwnProperty('names')) return; // unsaved survey
    applySurveyMetadata(survey);
    applySection1(survey.sections[0]);
    applySection2(survey.sections[1]);
    applySection3(survey.sections[2]);
    applySection4(survey.sections[3]);
    applySection5(survey.sections[4]);
  };

  var getSurveyIDFromLocation = function() {
    var match = location.search.match(/^\?id=(\d+)$/);
    if (match) {
      return +match[1];
    } else {
      alert('Error: bad survey ID; redirecting to home page.');
      location.href = 'home.html';
    }
  };

  var fetchSurvey = function() {
    var id = getSurveyIDFromLocation();
    if (!id) return false;
    d3.json(backendBase + '/survey/' + id)
      .on('beforesend', function(request) { request.withCredentials = true })
      .on('error', function(response) {
        var respObj = JSON.parse(response.response);
        var message = respObj && respObj.message;
        if (response.status == 404 &&
            message == 'survey ID ' + id + ' not found') {
          alert('Survey ' + id + ' not found. Redirecting to home page.')
          location.href = 'home.html';
        } else {
          alert('Error talking to backend server.')
        }
      })
      .on('load', function(data) {
        applySurvey(data.document);
      })
      .send('GET');
    return true;
  }

  var setupSubmitButton = function(submitButtonSelector) {
    var id = getSurveyIDFromLocation();
    if (!id) return;
    d3.select(submitButtonSelector)
      .on('click', function() {
        d3.json(backendBase + '/survey/' + id)
          .on('beforesend', function(request){ request.withCredentials = true })
          .on('error', function() {
            console.error('Error talking to backend server.');
            // alert('Error talking to backend server.')
          })
          .on('load', function(data) {
            alert('survey ' + id + ' saved');
          })
          .send('PUT', JSON.stringify(slurpSurvey()));
      });
  };

  window.setupSurveyPage = function(submitSelector, logoutLinkSelector) {
    requireAuthentication(function() {
      if (fetchSurvey()) {
        setupSubmitButton(submitSelector);
        setupLogoutLink(logoutLinkSelector);
      }
    });
  };

});
