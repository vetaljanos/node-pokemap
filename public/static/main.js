(function () {
'use strict';

var CONFIG = window.CONFIG;
var POKE = window.POKE;
var POKEMAP = window.POKEMAP;
var pokemap;
var pokemapOpts = {
  request: $.ajax
, heartbeatInterval: CONFIG.heartbeatInterval
, idToPokemon: {}
, excludedPokemon: []
, notifiedPokemon: []
};
var poke = POKE.create(pokemapOpts);
var sess = {};

function initMap() {
  pokemap.init(window.google);

  initSidebar(window.google);

  // NOTE: used by Google Maps and on document load
  if (CONFIG.requireLogin && !sess.accessToken) {
    return;
  }

  // wait for user to click to update
  /*
  if (localStorage.geoIsAllowed) {
    updateGeolocation();
  }
  */
}

function initSidebar(google) {
    $('#gyms-switch').prop('checked', localStorage.getItem("showGyms") !== 'false');
    $('#pokemon-switch').prop('checked', localStorage.getItem("showPokemon") !== 'false');
    $('#pokestops-switch').prop('checked', localStorage.getItem("showPokestops") !== 'false');
    $('#scanned-switch').prop('checked', localStorage.getItem("showScanned") === 'true');
    $('#sound-switch').prop('checked', localStorage.getItem("playSound") === 'true');

    var searchBox = new google.maps.places.SearchBox(document.getElementById('next-location'));

    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();

        if (0 === places.length) {
            return;
        }

        var loc = places[0].geometry.location;

        $.post("next_loc?lat=" + loc.lat() + "&lon=" + loc.lng(), {}).done(function (/*data*/) {
            $("#next-location").val("");
            updateLoc(loc.lat(), loc.lng(), 'center');
        });
    });
}

/*
function scannedLabel(last_modified) {
    var scanned_date = new Date(last_modified);
    var pad = function (number) { return number <= 99 ? ("0" + number).slice(-2) : number; };

    var contentstring = "<div>"
      + "Scanned at " + pad(scanned_date.getHours())
        + ":" + pad(scanned_date.getMinutes()) + ":" + pad(scanned_date.getSeconds())
      + "</div>";
    return contentstring;
}
*/

function updateConfig(key, val) {
  var cur = localStorage.getItem(key);

  if (String(cur) === String(val)) {
    return;
  }

  localStorage.setItem(key, val);
  return pokemap.setConfig(key, val);
}

function logout() {
  poke.stopHeartbeat(sess);

  sess.accessToken = null;
  sess.username = null;
  sess.password = null;

  localStorage.removeItem('accessToken');
  localStorage.removeItem('username');
  localStorage.removeItem('password');
  localStorage.removeItem('provider');
  localStorage.clear();

  $('.js-map').hide();
  $('.js-logout-container').hide();
  $('.js-geolocation-container').hide();

  $('.js-login-container').show();
}

function updateGeolocation() {

  function updatePos(position) {
    console.log("Got geolocation from browser :D");
    console.info(position);

    if (!localStorage.geoIsAllowed) {
      $('.js-geolocation-container').hide();
      localStorage.geoIsAllowed = 'true';
    }

    updateLoc(position.coords.latitude, position.coords.longitude, 'center');
  }

  console.log("Waiting for geolocation from browser");
  window.navigator.geolocation.getCurrentPosition(
    updatePos
  , function (/*err*/) {
      window.alert("No new location.");
    }
  , { enableHighAccuracy: true
    , timeout: 10 * 1000
    , maximumAge: 0
    }
  );

  if (!CONFIG.watchGeo) {
    CONFIG.watchGeo = navigator.geolocation.watchPosition(updatePos);
  }
}

function updateLoc(lat, lng, changeType) {
  if (lat && lng && 'number' === typeof lat && 'number' === typeof lng) {
    if (!sess.scan || lat !== sess.latitude || lng !== sess.longitude) {
      poke.setLocation(sess, lat, lng);
      pokemap.setLocation(lat, lng, changeType);
      sess.scanIndex = 0;
      sess.scan = window.generateLocationSteps(
        [ sess.latitude, sess.longitude ]
      , CONFIG.ringSteps
      , CONFIG.pulseRadius
      );
    }
  }
}

function beforeHeartbeat() {
  if (!sess.scan) {
    // can't update scan location if it isn't set
    return;
  }

  sess.latitude = sess.scan[sess.scanIndex][0];
  sess.longitude = sess.scan[sess.scanIndex][1];
  sess.scanIndex += 1;
  if (sess.scanIndex >= sess.scan.length) {
    sess.scanIndex = 0;
  }

  pokemap.setLocation(sess.latitude, sess.longitude);
}

function onHeartbeat(err, data) {
  if (err) {
    console.error('onHeartbeat:');
    console.error(err);
    $('.js-alert-message').val("heartbeat failure");
    return;
  }

  return pokemap.setData(data);
}

function cancelGeoWatch() {
  navigator.geolocation.clearWatch(CONFIG.watchGeo);
  CONFIG.watchGeo = null;
}

$(function () {
  if (!Notification) {
      console.warning('could not load notifications');
      return;
  }

  // TODO use .js-* classes on body, not ids directly on element
  var $selectExclude = $("#exclude-pokemon");
  var $selectNotify = $("#notify-pokemon");

  $selectExclude.on("change", function (/*e*/) {
    pokemapOpts.excludedPokemon = $selectExclude.val().map(Number);
    pokemap.clearStaleMarkers();
    localStorage.remember_select_exclude = JSON.stringify(pokemapOpts.excludedPokemon);
  });

  $selectNotify.on("change", function (/*e*/) {
    pokemapOpts.notifiedPokemon = $selectNotify.val().map(Number);
    localStorage.remember_select_notify = JSON.stringify(pokemapOpts.notifiedPokemon);
  });

  $('#gyms-switch').change(function() {
    updateConfig("showGyms", this.checked);

    if (this.checked) {
      return;
    }

    Object.keys(pokemap.gyms).forEach(function (key) {
      pokemap.gyms[key].marker.setMap(null);
      delete pokemap.gyms[key];
    });
  });

  $('#pokemon-switch').change(function() {
    updateConfig("showPokemon", this.checked);

    if (this.checked) {
      return;
    }

    Object.keys(pokemap.pokemon).forEach(function (key) {
      pokemap.pokemon[key].marker.setMap(null);
      delete pokemap.pokemon[key];
    });
  });

  $('#pokestops-switch').change(function() {
    updateConfig("showPokestops", this.checked);

    if (this.checked) {
      return;
    }

    Object.keys(pokemap.pokestops).forEach(function (key) {
      pokemap.pokestops[key].marker.setMap(null);
      delete pokemap.pokestops[key];
    });
  });

  $('#scanned-switch').change(function() {
    updateConfig("showScanned", this.checked);

    if (this.checked) {
      // TODO repopulate from non-shown
      return;
    }

    Object.keys(pokemap.scanned).forEach(function (key) {
      pokemap.scanned[key].marker.setMap(null);
      // TODO don't delete
      delete pokemap.scanned[key];
    });
  });

  $('#sound-switch').change(function() {
    updateConfig("playSound", this.checked);
  });

  $('body').on('click', '.js-geolocation', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();

    updateGeolocation();
  });

  $('body').on('click', '.js-manual-location', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();

    cancelGeoWatch();

    var geocoder = new window.google.maps.Geocoder();
    var address = $('.js-location').val();


    geocoder.geocode({ 'address': address }, function (results, status) {
      if (status !== window.google.maps.GeocoderStatus.OK) {
        window.alert('Geocode was not successful for the following reason: ' + status);
      }

      updateLoc(results[0].geometry.location.lat(), results[0].geometry.location.lng(), 'center');
      //poke.setLocation(sess, results[0].geometry.location.lat(), results[0].geometry.location.lng());
    });
  });

  $('body').on('click', '.js-logout', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();

    logout();
  });

  $('body').on('submit', 'form.js-login-form', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();

    poke.login({
      username: $('.js-login-container .js-username').val() || 'demo'
    , password: $('.js-login-container .js-password').val() || 'demo'
    , provider: $('.js-login-container .js-provider').val() || 'ptc'
    }, function (err, _sess) {
      if (err) {
        // TODO show 'bad credentials'
        $('.js-login-container .js-password').val('');
        $('.js-login-container .js-message').val(err.message || err.toString());
        return;
      }

      // accessToken, username, password, provider
      Object.keys(sess).forEach(function (key) {
        sess[key] = _sess[key];
      });

      localStorage.setItem('accessToken', sess.accessToken);
      $('.js-login-container').hide();

      // You can try using the default key... but it won't work for you, or not for long
      if ('AIzaSyB0Dqa90ZCmlwh7oPHkgfr2-cMMkufLBQE' !== CONFIG.gmaps_key) {
        $('.js-google-maps-key').hide();
      }

      if (localStorage.geoIsAllowed) {
        $('.js-geolocation-container').hide();
        updateGeolocation();
      } else {
        $('.js-geolocation-container').show();
      }

      poke.startHeartbeat(sess, beforeHeartbeat, onHeartbeat);
    });
  });

  sess.accessToken = localStorage.getItem('accessToken') || CONFIG.latitude;
  sess.latitude = localStorage.getItem('latitude') || CONFIG.latitude;
  sess.longitude = localStorage.getItem('longitude') || CONFIG.longitude;
  sess.showPokemon = localStorage.getItem('showPokemon') || true;
  sess.showGyms = localStorage.getItem('showGyms') || true;
  sess.showPokestops = localStorage.getItem('showPokestops') || false;
  sess.showScanned = localStorage.getItem('showScanned') || false;

  // default state, show nothing
  $('.js-map').hide();
  $('.js-login-container').hide();
  $('.js-geolocation-container').hide();

  $.getJSON("static/locales/pokemon." + document.documentElement.lang + ".json").done(function(data) {
    var pokeList = [];

    $.each(data, function(key, value) {
        pokeList.push( { id: key, text: value } );
        pokemapOpts.idToPokemon[key] = value;
    });

    // setup the filter lists
    $selectExclude.select2({
        placeholder: "Select Pokémon",
        data: pokeList
    });
    $selectNotify.select2({
        placeholder: "Select Pokémon",
        data: pokeList
    });

    // recall saved lists
    if (localStorage.getItem('remember_select_exclude')) {
        $selectExclude.val(JSON.parse(localStorage.remember_select_exclude)).trigger("change");
    }
    if (localStorage.getItem('remember_select_notify')) {
        $selectNotify.val(JSON.parse(localStorage.remember_select_notify)).trigger("change");
    }

    pokemapOpts.onChangeLocation = function (lat, lng/*, changeType*/) {
      updateLoc(lat, lng);
    };
    pokemapOpts.onChangeConfig = function (key, val) {
      localStorage.setItem(key, val);
      pokemap.setConfig(key, val);
    };
    pokemap = POKEMAP.create(pokemapOpts);

    [ 'showPokemon', 'showPokestops', 'mapStyle', 'showGyms', 'showScanned' ].forEach(function (key) {
      pokemap.setConfig(key, localStorage.getItem(key));
    });

    if (CONFIG.requireLogin && !sess.accessToken) {
      $('.js-login-container').show();
      return;
    }
    else {
      poke.startHeartbeat(sess, beforeHeartbeat, onHeartbeat);
      // this init is also called by Google Maps load
      $('.js-geolocation-container').show();
      $('.js-logout-container').show();
    }
  });

});

// exported for Google Maps api
window.initMap = initMap;
}());
