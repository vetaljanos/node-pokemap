(function (exports) {
'use strict';

var POKE = exports.POKE = {};

POKE.DEFAULT_INTERVAL = 1000;
POKE.DEFAULT_LOGIN_URL = "/api/com.pokemon.go/login";
POKE.DEFAULT_HEARTBEAT_URL = "/raw_data"; // "/api/com.pokemon.go/heartbeat";

POKE.login = function (deps, creds, cb) {
  deps.request({
    url: deps.loginUrl || POKE.DEFAULT_LOGIN_URL
  , method: 'POST'
  , data: JSON.stringify({
      username: creds.username
    , password: creds.password
    , provider: creds.provider
    })
  , headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  , dataType: "json"
  }).then(function (sess) {
    sess.accessToken = sess.accessToken || sess.access_token;

    if (!sess.accessToken) {
      cb(sess.error || new Error("missing access token"));
      return;
    }

    sess.username = creds.username;
    // TODO encrypt with a passcode or something?
    //sess.password = creds.password;
    sess.provider = creds.provider;
    cb(null, sess);
  });
};

// TODO
// wait for one heartbeat to complete (or 10s timeout) before issuing the next?
POKE.heartbeat = function (deps, sess, cb) {
  // preserve from async changes to sess.latitude, etc
  var lat = sess.latitude;
  var lng = sess.longitude;

  if (!lat || !lng) {
    console.log('heartbeat ignored - waiting for lat/lng update');
    return;
  }

  deps.request({
      url: deps.heartbeatUrl || POKE.DEFAULT_HEARTBEAT_URL
    , method: 'GET'
      // TODO make explicit querystring
    , data: {
        'latitude': lat
      , 'longitude': lng
      , 'pokemon': sess.showPokemon
      , 'pokestops': sess.showPokestops
      , 'gyms': sess.showGyms
        // this is moot when the client is in control, as it should be
      , 'scanned': sess.showScanned
      }
    , headers: {
        'Authorization': 'Bearer ' + sess.accessToken
      }
    , dataType: "json"
  }).done(function(result) {
    if (result && result.pokemons) {
        result.scanned = result.scanned || [{
          scanned_id: lat + ',' + lng
        , latitude: lat
        , longitde: lng
        , last_modified: Date.now() // Math.round(Date.now() / 1000)
        }];
    }
    cb(null, result);
  });
};

POKE.startHeartbeat = function (deps, sess, interval, bcb, cb) {
  // note: this is part of window or global, not javascript
  clearInterval(sess.heartbeatInterval);
  sess.heartbeatInterval = setInterval(function () {
    bcb();
    POKE.heartbeat(deps, sess, cb);
  }, interval);
};

POKE.stopHeartbeat = function (deps, sess) {
  // note: this is part of window or global, not javascript
  clearInterval(sess.heartbeatInterval);
};

POKE.setLocation = function (deps, sess, lat, lng) {
// function updateLoc(lat, lng);
  if (lat && lng && 'number' === typeof lat && 'number' === typeof lng) {
    if (lat !== sess.latitude || lng !== sess.longitude) {
      sess.latitude = lat;
      sess.longitude = lng;
    }
  }
};

POKE.create = function (deps) {

  /*
   *  deps = {
   *    request: $.ajax
   *  , onHeartbeat: function () { ... }
   *  , heartbeatInterval: 1000
   *  }
   */

  return {
    login: function (creds, cb) {
      return POKE.login(deps, creds, cb);
    }
  , heartbeat: function (sess, cb) {
      return POKE.heartbeat(deps, sess, cb);
    }
  , setLocation: function (sess, lat, lng) {
      return POKE.setLocation(deps, sess, lat, lng);
    }
  , startHeartbeat: function (sess, bcb, cb) {
      return POKE.startHeartbeat(deps, sess, deps.heartbeatInterval || POKE.DEFAULT_INTERVAL, bcb, cb);
    }
  , stopHeartbeat: function (sess) {
      return POKE.stopHeartbeat(deps, sess);
    }
  };
};

}(window));
