$(document).ready(function() {
  "use strict";
  window.backendBase = 'http://syssci.renci.org:8081';

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
            '</label>' +
            '  <input type="text" name="email" />' +
            '<br />' +
            '<label>' +
            '  Password:' +
            '</label>' +
            '  <input type="password" name="password" />' +
            '<br />' +
            '<input type="submit" name="Log in" />');
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
          location.href = 'index.html';
        }
      });
  };

  window.requireAuthentication = function(callback) {
    checkAuthentication(function(isAuthenticated) {
      if (!isAuthenticated) {
        location.href = 'index.html';
      } else {
        callback();
      }
    });
  };

  window.setupLogoutLink = function(logoutLinkSelector) {
    d3.select(logoutLinkSelector)
      .on('click', logout);
  };

  var defaultName = function(surveyId) {
    return 'survey #' + surveyId;
  };

  var renameSurvey = function(id, surveyListSelector, newName) {
    d3.xhr(backendBase + '/survey/' + id + '/rename')
      .header('Content-Type', 'application/json')
      .on('beforesend', function(request) { request.withCredentials = true; })
      .on('error', function(req) {
        var resp = req.response && JSON.parse(req.response);
        if (resp
            && resp.message == 'survey not owned by authenticated user') {
          alert("Can't save: you have read-only access to this survey.");
        } else {
          console.error('Failed to save survey. Request was:', req);
          alert('Failed to save survey #' + id);
        }
      })
      .on('load', function(data) {
        d3.select('#survey_' + id)
          .select('td.name a')
          .text(newName);
        window.alert('Survey renamed.');
      })
      .send('PUT', JSON.stringify({name: newName}));
  };

  var getUserIdFromCookieData = function() {
    if (!document.cookie) { return undefined; }
    // `document.cookie` is a string like so:
    // "auth_token=bfb35669-04f7-4f25-8876-c482dd8580bc; user_id=1"
    var strs = document.cookie.split('; ');
    for (var i=0; i<strs.length; i++) {
      var vals = strs[i].split('=');
      if (vals[0] == 'user_id') {
        return vals[1];
      }
    }
    return undefined;
  };

  var deleteSurvey = function(id, surveyListSelector) {
    d3.xhr(backendBase + '/survey/' + id)
      .header('Content-Type', 'application/json')
      .on('beforesend', function(request) { request.withCredentials = true; })
      .on('error',
          function() { window.alert('Error talking to backend server.'); })
      .on('load', function(data) {
        window.alert('Survey deleted.');
        d3.select('#survey_' + id).remove();
      })
      .send('DELETE');
  };

  var renderSurveyList = function(surveyListSelector, data) {
    // TODO: test this selection pattern:
    d3.select(surveyListSelector).selectAll().remove();
    var asAdmin = data && data[0] && data[0].hasOwnProperty('owner_email');
    var userId = getUserIdFromCookieData();

    if (asAdmin) {
      d3.select(surveyListSelector)
        .append('p')
        .append('a')
        .attr('href', 'register.html')
        .text('Register a new user');
    }

    var columns =
      ['ID', 'Name', 'Created At', 'Modified At', 'Download'];
    if (asAdmin) {
      columns.push('Owner Email');
    }
    columns.push('Rename');
    columns.push('Delete');

    if (!data || data.length === 0) {
      d3.select(surveyListSelector).append('p')
        .text("You're logged in, but you don't have any surveys yet. " +
              "To get started, create a survey using the button below.");
      return;
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
      .append('tr')
      .attr('id', function(d) { return 'survey_' + d.id; });

    rows.append('td')
      .append('a')
      .attr('class', 'guarded')
      .attr('href', function(d) { return 'survey.html?id=' + d.id; })
      .text(function(d) { return d.id; });
    rows.append('td')
      .attr('class', 'name')
      .append('a')
      .attr('class', 'guarded')
      .attr('href', function(d) { return 'survey.html?id=' + d.id; })
      .text(function(d) { return d.name; });
    rows.append('td').text(function(d) { return d.created_at; });
    rows.append('td').text(function(d) { return d.modified_at; });
    rows.append('td')
      .append('a')
      .attr('href', function(d) {
        return backendBase + '/survey/' + d.id + '.csv';
      })
      .text('download');

    if (asAdmin) {
      rows.append('td').text(function(d) { return d.owner_email });
    }

    rows.append('td')
      .append('a')
      .attr('href', '#')
      .on('click', function(d) {
        if (userId == d.owner) {
          var promptText = 'Please enter the name for survey #' + d.id;
          var defaultText = d.name || defaultName(d.id);
          var newName = prompt(promptText, defaultText);
          if (newName != null) {
            renameSurvey(d.id, surveyListSelector, newName);
          }
        } else {
          alert("You cannot rename a survey that you don't own, even if you're an admin. Sorry about that.");
        }
      })
      .text(function(d) {
        if (userId == d.owner) {
          return 'rename';
        } else {
          return '';
        }
      });

    rows.append('td')
      .append('a')
      .attr('href', '#')
      .on('click', function(d) {
        if (userId == d.owner) {
          var confirmText = 'Press OK to delete this survey from the server.';
          if (window.confirm(confirmText)) {
            deleteSurvey(d.id, surveyListSelector);
          }
        } else {
          alert("You cannot delete a survey that you don't own, even if you're an admin. Sorry about that.");
        }
      })
      .text(function(d) {
        if (userId == d.owner) {
          return 'X';
        } else {
          return '';
        }
      });

    d3.selectAll('a.guarded')
      .on('click', function() {
        var msg = 'Warning: if somebody else is editing this survey, either ' +
                  'your changes or theirs will be lost! Press OK to continue.';
        if (!confirm(msg)) {
          d3.event.preventDefault();
        }
      })
  };

  var setupSurveyList = function(surveyListSelector) {
    var message = d3.select(surveyListSelector)
      .append('div')
      .attr('class', 'loading-message')
      .text('Loading...');
    d3.json(backendBase + '/surveys')
      .on('beforesend', function(request) { request.withCredentials = true })
      .on('error', function() { alert('Error talking to backend server.') })
      .on('load', function(result) {
        message.text('');
        message.append('a')
          .attr('href', 'spreadsheet-notes.html')
          .text('Help with downloaded surveys');
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

  var hookRegistrationAction = function(registerSelector) {
    var content = d3.select(registerSelector),
        emailInput = content.select('input[name=email]'),
        passwordInput = content.select('input[name=password]'),
        submitButton = content.select('input[type=submit]');
    submitButton.on('click', function() {
      d3.event.preventDefault();
      var confirmText = 'Are you sure you want to create a new user? ' +
            '(This action cannot be undone.) ' +
            'Note that you must remember the password, ' +
            'because you must email it to them afterwards.';
      if (window.confirm(confirmText)) {
        var requestObject = {email: emailInput.property('value'),
                             password: passwordInput.property('value')};
        d3.xhr(backendBase + '/register')
          .header('Content-Type', 'application/json')
          .on('beforesend', function(request) {request.withCredentials = true;})
          .on('error', function(req) {
            console.error('Failed to create new user. Request was:', req);
            alert('Failed to create new user.');
          })
          .on('load', function(request) {
            alert('Created new user. You must email them to inform them of their password.');
            window.location = 'home.html';
          })
          .send('POST', JSON.stringify(requestObject));}
    });
  };

  window.setupRegistrationPage = function(registerSelector) {
    requireAuthentication(function() {
      hookRegistrationAction(registerSelector);
    });
  };

  window.setupIndexPage = function(loginSelector) {
    setupLoginForm(loginSelector);
  };

  window.setupHomePage =
  function(logoutLinkSelector, surveyListSelector, createButtonSelector) {
    requireAuthentication(function() {
      setupLogoutLink(logoutLinkSelector);
      setupSurveyList(surveyListSelector);
      setupCreateButton(createButtonSelector);
    });
  };

});
