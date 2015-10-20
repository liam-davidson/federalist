var Backbone = require('backbone');
var ViewSwitcher = require('ampersand-view-switcher');
var querystring = require('querystring');

var AuthenticateView = require('./authenticate');
var SiteEditView = require('./site/edit');
var SiteListView = require('./site/list');
var AddSiteView = require('./site/add');
var BuildsView = require('./site/builds');
var EditorContainerView = require('./editor/edit-main');

var AppView = Backbone.View.extend({
  el: 'main',
  initialize: function (opts) {
    this.user = opts.user;
    this.sites = opts.collection;

    // Initiate websocket subscription and fetch sites on build message
    io.socket.get('/v0/build?limit=0');
    io.socket.on('build', function() {
      this.sites.fetch();
    }.bind(this));

    this.render();
  },
  render: function () {
    this.pageSwitcher = this.pageSwitcher || new ViewSwitcher(this.el);
  },
  home: function () {
    federalist.navigate('');
    var authed = this.user.isAuthenticated(),
        error = querystring.parse(window.location.search.slice(1)).error,
        messages = {
          'Error.Passport.Unauthorized': 'Your account is not set up to access Federalist. Have you signed up as a beta user? If you have signed up and should have access, please let us know.',
          'default': 'An unexpected error occured. Please try again. If you continue to see this message, please let us know.'
        },
        message = error && (messages[error] || messages['default']);

    if(authed) {
      var listView = new SiteListView({ collection: this.sites });
      this.pageSwitcher.set(listView);

      return this;
    }

    // Show alert message
    if (message) {
      $('.alert-container').html(
        '<div class="alert alert-danger" role="alert">' + message + '</div>'
      );
    }

    var authenticateView = new AuthenticateView();
    this.pageSwitcher.set(authenticateView);
    return this;
  },
  new: function () {
    var addSiteView = new AddSiteView({
          user: this.user,
          collection: this.sites
        });
    this.pageSwitcher.set(addSiteView);

    this.listenToOnce(addSiteView, 'site:save:success', function () {
      this.home();
    }.bind(this));

    return this;
  },
  edit: function (owner, repo, branch, file) {
    var editView = new EditorContainerView({
      owner: owner,
      repo: repo,
      branch: branch,
      file: file
    });
    this.pageSwitcher.set(editView);

    return this;
  },
  siteEdit: function(id) {
    var siteEditView = new SiteEditView({ model: this.sites.get(id) });
    this.pageSwitcher.set(siteEditView);
    this.listenToOnce(siteEditView, 'site:save:success', function () {
      this.home();
    }.bind(this));
    return this;
  },
  builds: function(id) {
    var buildsView = new BuildsView({ model: this.sites.get(id) });
    this.pageSwitcher.set(buildsView);
    return this;
  }
});

module.exports = AppView;
