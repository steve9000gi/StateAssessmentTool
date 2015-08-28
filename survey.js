$(document).ready(function() {
  "use strict";

  var backendBase = 'http://localhost:8081';

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

  // Check whether we're authenticated at the backend, and call the callback
  // with the boolean result (i.e. true = authenticated, false = not).
  var checkAuthentication = function(callback) {
    d3.xhr(backendBase + '/testauth')
      .on('beforesend', function(request) { request.withCredentials = true })
      .get(function(error, data) {
        if (error) {
          callback(false);
        } else {
          var message = JSON.parse(data.response).message;
          if (message === 'authenticated') {
            callback(true);
          } else {
            callback(false);
          }
        }
      })
  };

  var renderLoginForm = function(loginSelector) {
    var container = d3.select(loginSelector);
    var form = container
      .append('form')
      .html('<label>' +
            '  Email address:' +
            '  <input type="text" name="email" />' +
            '</label>' +
            '<br />' +
            '<label>' +
            '  Password:' +
            '  <input type="password" name="password" />' +
            '</label>' +
            '<br />' +
            '<input type="submit" name="Login" />');
    var message = container
      .append('p')
      .attr('class', 'message');

    form.on('submit', function() {
      d3.event.preventDefault();
      message.text('Loading...');
      var requestData = {
        email   : d3.event.target[0].value,
        password: d3.event.target[1].value
      };
      d3.xhr(backendBase + '/login')
        .header('Content-Type', 'application/json')
        .on('beforesend', function(request) { request.withCredentials = true })
        .post(JSON.stringify(requestData), function(error, data) {
          message.text('');
          if (error) {
            message.text('Login failed');
          } else {
            d3.select(loginSelector).style('visibility', 'hidden');
            d3.select(loginSelector).selectAll().remove();
            location.href = 'home.html';
          }
        });
    });
  };

  var setupLoginForm = function(loginSelector) {
    if (location.pathname !== '/') return;
    checkAuthentication(function(isAuthenticated) {
      if (isAuthenticated) {
        location.href = 'home.html';
      } else {
        renderLoginForm(loginSelector);
      }
    });
  };

  var logout = function() {
    d3.xhr(backendBase + '/logout')
      .on('beforesend', function(request) { request.withCredentials = true })
      .get(function(error, data) {
        if (error) {
          console.log('Logout error:', error);
          alert('Error logging out.');
        } else {
          location.href = '/';
        }
      });
  };

  var requireAuthentication = function() {
    checkAuthentication(function(isAuthenticated) {
      if (!isAuthenticated) {
        location.href = '/';
      }
    });
  };

  var setupLogoutLink = function(logoutLinkSelector) {
    if (location.pathname !== '/home.html') return;
    d3.select(logoutLinkSelector)
      .on('click', logout);
  };

  var renderSurveyList = function(surveyListSelector, data) {
    // TODO: test this selection pattern:
    d3.select(surveyListSelector).selectAll().remove();
    if (!data || data.length === 0) {
      d3.select(surveyListSelector).append('p')
        .text("You're logged in, but you don't have any surveys yet. " +
              "To get started, create a survey using the button below.");
      return;
    }

    var asAdmin = data && data[0] && data[0].hasOwnProperty('owner_email');
    var columns =
      ['Map ID', 'Created At', 'Modified At'];
    if (asAdmin) {
      columns.push('Owner Email');
    }

    var table = d3.select(surveyListSelector).append('table'),
        thead = table.append('thead'),
        tbody = table.append('tbody');

    thead
      .append('tr')
      .selectAll('th')
      .data(columns)
      .enter()
      .append('th')
      .text(String);

    var rows = tbody
      .selectAll('tr')
      .data(data)
      .enter()
      .append('tr');

    rows.append('td')
      .append('a')
      .attr('href', function(d) { return 'survey.html?id=' + d.id})
      .text(function(d) { return d.id });
    rows.append('td').text(function(d) { return d.created_at });
    rows.append('td').text(function(d) { return d.modified_at });
    if (asAdmin) {
      rows.append('td').text(function(d) { return d.owner_email });
    }
  };

  var setupMapList = function(surveyListSelector) {
    var message = d3.select(surveyListSelector)
      .append('div')
      .attr('class', 'loading-message')
      .text('Loading...');
    d3.json(backendBase + '/surveys')
      .on('beforesend', function(request) { request.withCredentials = true })
      .on('error', function() { alert('Error talking to backend server.') })
      .on('load', function(result) {
        message.text('');
        renderSurveyList(surveyListSelector, result)
      })
      .send('GET');
  };

  var setupCreateButton = function(createButtonSelector) {
    d3.select(createButtonSelector)
      .on('click', function() {
        d3.json(backendBase + '/survey')
          .on('beforesend', function(request){ request.withCredentials = true })
          .on('error', function() { alert('Error talking to backend server.') })
          .on('load', function(data) {
            if (data && typeof data === 'object' && data.hasOwnProperty('id')) {
              location.href = 'survey.html?id=' + data.id;
            } else {
              console.log('unexpected data received:', data);
              alert('Error: unexpected response from the backend server.');
            }
          })
          .send('POST', JSON.stringify({}));
      });
  };

  var writeSurveyToDocument = function(survey) {
    // TODO;
    console.log('writeSurveyToDocument (stub)', survey);
  };

  var readSurveyFromDocument = function() {
    // TODO;
    console.log('readSurveyFromDocument (stub)');
    return {};
  };

  var getSurveyIDFromLocation = function() {
    var match = location.search.match(/^\?id=(\d+)$/);
    if (match) {
      return +match[1];
    } else {
      alert('Error: invalid survey ID');
      return null;
    }
  };

  var fetchSurvey = function() {
    var id = getSurveyIDFromLocation();
    if (!id) return;
    d3.json(backendBase + '/survey/' + id)
      .on('beforesend', function(request) { request.withCredentials = true })
      .on('error', function() { alert('Error talking to backend server.') })
      .on('load', function(data) {
        writeSurveyToDocument(data.document);
      })
      .send('GET');
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
            console.log('survey ' + id + ' saved');
          })
          .send('PUT', JSON.stringify(readSurveyFromDocument()));
      });
  };

  window.setupIndexPage = function(loginSelector) {
    setupLoginForm(loginSelector);
  };

  window.setupHomePage =
  function(logoutLinkSelector, surveyListSelector, createButtonSelector) {
    requireAuthentication();
    setupLogoutLink(logoutLinkSelector);
    setupMapList(surveyListSelector);
    setupCreateButton(createButtonSelector);
  };

  window.setupSurveyPage = function(submitSelector) {
    fetchSurvey();
    setupSubmitButton(submitSelector);
  };

});
