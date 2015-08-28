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

  $("#submit").on("click", function() {
    alert("This button is a placeholder. When this survey application is "
	+ "up and running, this is how you'll save your survey results. At "
	+ "this point, however, nothing has been saved.");
  });

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

  var renderLoginForm = function(login_selector) {
    var container = d3.select(login_selector);
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
          if (error) {
            message.text('Login failed');
          } else {
            d3.select(login_selector).style('visibility', 'hidden');
            d3.select(login_selector).selectAll().remove();
            location.href = 'home.html';
          }
        });
    });
  };

  var setupLoginForm = function(login_selector) {
    if (location.pathname !== '/') return;
    checkAuthentication(function(isAuthenticated) {
      if (isAuthenticated) {
        location.href = 'home.html';
      } else {
        renderLoginForm(login_selector);
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

  var setupLogoutLink = function(logout_link_selector) {
    if (location.pathname !== '/home.html') return;
    d3.select(logout_link_selector)
      .on('click', logout);
  };

  var requireAuthentication = function() {
    checkAuthentication(function(isAuthenticated) {
      if (!isAuthenticated) {
        location.href = '/';
      }
    });
  };

  window.setupIndexPage = function(login_selector) {
    setupLoginForm(login_selector);
  };

  window.setupHomePage = function(logout_link_selector) {
    requireAuthentication();
    setupLogoutLink(logout_link_selector);
  };

});
