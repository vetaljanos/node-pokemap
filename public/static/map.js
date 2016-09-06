(function (exports) {
'use strict';

// TODO how can we get rid of this? put it in a real stylesheet maybe?
var light2Style=[{"elementType":"geometry","stylers":[{"hue":"#ff4400"},{"saturation":-68},{"lightness":-4},{"gamma":0.72}]},{"featureType":"road","elementType":"labels.icon"},{"featureType":"landscape.man_made","elementType":"geometry","stylers":[{"hue":"#0077ff"},{"gamma":3.1}]},{"featureType":"water","stylers":[{"hue":"#00ccff"},{"gamma":0.44},{"saturation":-33}]},{"featureType":"poi.park","stylers":[{"hue":"#44ff00"},{"saturation":-23}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"hue":"#007fff"},{"gamma":0.77},{"saturation":65},{"lightness":99}]},{"featureType":"water","elementType":"labels.text.stroke","stylers":[{"gamma":0.11},{"weight":5.6},{"saturation":99},{"hue":"#0091ff"},{"lightness":-86}]},{"featureType":"transit.line","elementType":"geometry","stylers":[{"lightness":-48},{"hue":"#ff5e00"},{"gamma":1.2},{"saturation":-23}]},{"featureType":"transit","elementType":"labels.text.stroke","stylers":[{"saturation":-64},{"hue":"#ff9100"},{"lightness":16},{"gamma":0.47},{"weight":2.7}]}];
var darkStyle=[{"featureType":"all","elementType":"labels.text.fill","stylers":[{"saturation":36},{"color":"#b39964"},{"lightness":40}]},{"featureType":"all","elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#000000"},{"lightness":16}]},{"featureType":"all","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":17},{"weight":1.2}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":21}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":17}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":29},{"weight":0.2}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":18}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#181818"},{"lightness":16}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":19}]},{"featureType":"water","elementType":"geometry","stylers":[{"lightness":17},{"color":"#525252"}]}];
var pGoStyle=[{"featureType":"landscape.man_made","elementType":"geometry.fill","stylers":[{"color":"#a1f199"}]},{"featureType":"landscape.natural.landcover","elementType":"geometry.fill","stylers":[{"color":"#37bda2"}]},{"featureType":"landscape.natural.terrain","elementType":"geometry.fill","stylers":[{"color":"#37bda2"}]},{"featureType":"poi.attraction","elementType":"geometry.fill","stylers":[{"visibility":"on"}]},{"featureType":"poi.business","elementType":"geometry.fill","stylers":[{"color":"#e4dfd9"}]},{"featureType":"poi.business","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"poi.park","elementType":"geometry.fill","stylers":[{"color":"#37bda2"}]},{"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#84b09e"}]},{"featureType":"road","elementType":"geometry.stroke","stylers":[{"color":"#fafeb8"},{"weight":"1.25"}]},{"featureType":"road.highway","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"geometry.fill","stylers":[{"color":"#5ddad6"}]}];

// TODO this doesn't belong here in maps, but rather in main.js
function _sendNotifiction(title, text, icon) {
  var notification = new Notification(title, {
      icon: icon,
      body: text,
      sound: 'sounds/ding.mp3'
  });

  notification.onclick = function () {
      window.open(window.location.href);
  };
}
function sendNotification(title, text, icon) {
  var p;

  if (Notification.permission === "granted") {
      p = Notification.requestPermission();
      p.then(function () {
        _sendNotifiction(title, text, icon);
      });
      return;
  }

  _sendNotifiction(title, text, icon);
}

var POKEMAP = exports.POKEMAP = {};

POKEMAP.create = function (opts) {
  /*
   * opts = {
   *   onChangeLocation: function (lat, lon) { ... }
   * , onChangeConfig: function (key, val) { ... }
   * }
   */
  var STATE = { cfg: {} };
  var google;

  // Dicts
  var map_pokemons = {}; // Pokemon
  var map_gyms = {}; // Gyms
  var map_pokestops = {}; // Pokestops
  var map_scanned = {}; // Pokestops
  var gym_types = ["Uncontested", "Mystic", "Valor", "Instinct"];
  var audio = new Audio('https://github.com/AHAAAAAAA/PokemonGo-Map/raw/develop/static/sounds/ding.mp3');

  function pad(number) {
    return number <= 99 ? ("0" + number).slice(-2) : number;
  }

  function pokemonLabel(name, disappear_time, id, latitude, longitude) {
      var disappear_date = new Date(disappear_time);

      // TODO template properly with jQuery
      var contentstring = ""
        + "<div>"
          + "<b>" + name + "</b>"
          + "<span> - </span>"
          + "<small>"
            + "<a href='http://www.pokemon.com/us/pokedex/" + id + "' target='_blank' title='View in Pokedex'>#" + id + "</a>"
          + "</small>"
        + "</div>"
        + "<div>"
          + "Disappears at " + pad(disappear_date.getHours())
            + ":" + pad(disappear_date.getMinutes())
            + ":" + pad(disappear_date.getSeconds())
          + "<span class='label-countdown' disappears-at='" + disappear_time + "'>(00m00s)</span></div>"
        + "<div>"
          + "<a href='https://www.google.com/maps/dir/Current+Location/" + latitude + "," + longitude + "'"
              + " target='_blank' title='View in Maps'>Get directions</a>"
        + "</div>";

      return contentstring;
  }

  function gymLabel(team_name, team_id, gym_points) {
      var gym_color = [
        "0, 0, 0, .4"
      , "74, 138, 202, .6"
      , "240, 68, 58, .6"
      , "254, 217, 40, .6"
      ];
      var str;
      if (0 === team_id) {
          str = "<div><center>"
            + "<div>"
              + "<b style='color:rgba(" + gym_color[team_id] + ")'>" + team_name + "</b><br>"
              + "<img height='70px' style='padding: 5px;' src='static/forts/" + team_name + "_large.png'>"
            + "</div>"
          + "</center></div>";
      }
      else {
          str = "<div><center>"
            + "<div style='padding-bottom: 2px'>Gym owned by:</div>"
            + "<div>"
              + "<b style='color:rgba(" + gym_color[team_id] + ")'>Team " + team_name + "</b><br>"
              + "<img height='70px' style='padding: 5px;' src='static/forts/" + team_name + "_large.png'>"
            + "</div>"
            + "<div>Prestige: " + gym_points + "</div>"
            + "</center></div>";
      }

      return str;
  }

  function pokestopLabel(lured, last_modified, active_pokemon_id, latitude, longitude) {
      var str;
      if (lured) {
          var active_pokemon = opts.idToPokemon[active_pokemon_id];

          var last_modified_date = new Date(last_modified);
          var current_date = new Date();

          var time_until_expire = current_date.getTime() - last_modified_date.getTime();

          var expire_date = new Date(current_date.getTime() + time_until_expire);
          var expire_time = expire_date.getTime();

          str = "<div><b>Lured Pokéstop</b></div>"
            + "<div>Lured Pokémon: " + active_pokemon + "<span> - </span> <small>"
              + "<a href='http://www.pokemon.com/us/pokedex/" + active_pokemon_id + "'"
                + " target='_blank' title='View in Pokedex'>#" + active_pokemon_id + "</a></small>"
            + "</div>"
            + "<div>"
              + "Lure expires at " + pad(expire_date.getHours())
                + ":" + pad(expire_date.getMinutes()) + ":" + pad(expire_date.getSeconds())
                + "<span class='label-countdown' disappears-at='" + expire_time + "'>(00m00s)</span></div>"
            + "<div>"
            + "<div>"
              + "<a href='https://www.google.com/maps/dir/Current+Location/" + latitude + "," + longitude + "'"
                + " target='_blank' title='View in Maps'>Get directions</a>"
            + "</div>";
      } else {
          str = "<div><b>Pokéstop</b></div>"
            + "<div>"
              + "<a href='https://www.google.com/maps/dir/Current+Location/" + latitude + "," + longitude + "'"
                + " target='_blank' title='View in Maps'>Get directions</a>"
            + "</div>";
      }

      return str;
  }

  function updateLabelDiffTime() {
      $('.label-countdown').each(function(index, element) {
          var disappearsAt = new Date(parseInt(element.getAttribute("disappears-at")));
          var now = new Date();

          var difference = Math.abs(disappearsAt - now);
          var hours = Math.floor(difference / 36e5);
          var minutes = Math.floor((difference - (hours * 36e5)) / 6e4);
          var seconds = Math.floor((difference - (hours * 36e5) - (minutes * 6e4)) / 1e3);
          var timestring;

          if (disappearsAt < now) {
              timestring = "(expired)";
          } else {
              timestring = "(";
              if (hours > 0) {
                  timestring = hours + "h";
              }

              timestring += ("0" + minutes).slice(-2) + "m";
              timestring += ("0" + seconds).slice(-2) + "s";
              timestring += ")";
          }

          $(element).text(timestring);
      });
  }

  function setupPokemonMarker(item) {
      var marker = new google.maps.Marker({
          position: {
              lat: item.latitude,
              lng: item.longitude
          },
          map: STATE.map,
          icon: 'static/icons/' + item.pokemon_id + '.png'
      });

      marker.infoWindow = new google.maps.InfoWindow({
          content: pokemonLabel(item.pokemon_name, item.disappear_time, item.pokemon_id, item.latitude, item.longitude)
      });

      if (opts.notifiedPokemon.indexOf(item.pokemon_id) > -1) {
          if(localStorage.playSound === 'true'){
            audio.play();
          }
          sendNotification('A wild ' + item.pokemon_name + ' appeared!', 'Click to load map', 'static/icons/' + item.pokemon_id + '.png');
      }

      addListeners(marker);
      return marker;
  }

  function setupGymMarker(item) {
      var marker = new google.maps.Marker({
          position: {
              lat: item.latitude,
              lng: item.longitude
          },
          map: STATE.map,
          icon: 'static/forts/' + gym_types[item.team_id] + '.png'
      });

      marker.infoWindow = new google.maps.InfoWindow({
          content: gymLabel(gym_types[item.team_id], item.team_id, item.gym_points)
      });

      addListeners(marker);
      return marker;
  }

  function setupPokestopMarker(item) {
      var imagename = item.lure_expiration ? "PstopLured" : "Pstop";
      var marker = new google.maps.Marker({
          position: {
              lat: item.latitude,
              lng: item.longitude
          },
          map: STATE.map,
          icon: 'static/forts/' + imagename + '.png',
      });

      marker.infoWindow = new google.maps.InfoWindow({
          content: pokestopLabel(!!item.lure_expiration, item.last_modified, item.active_pokemon_id, item.latitude, item.longitude)
      });

      addListeners(marker);
      return marker;
  }

  function getColorByDate(value) {
    //Changes the color from red to green over 15 mins
    var diff = (Date.now() - value) / 1000 / 60 / 15;

    if (diff > 1) {
      diff = 1;
    }

    //value from 0 to 1 - Green to Red
    var hue = ((1 - diff) * 120).toString(10);
    return ["hsl(", hue, ",100%,50%)"].join("");
  }

  function addListeners(marker) {
      marker.addListener('click', function() {
          marker.infoWindow.open(STATE.map, marker);
          updateLabelDiffTime();
          marker.persist = true;
      });

      google.maps.event.addListener(marker.infoWindow, 'closeclick', function() {
          marker.persist = null;
      });

      marker.addListener('mouseover', function() {
          marker.infoWindow.open(STATE.map, marker);
          updateLabelDiffTime();
      });

      marker.addListener('mouseout', function() {
          if (!marker.persist) {
              marker.infoWindow.close();
          }
      });
      return marker;
  }

  function clearStaleMarkers() {
      $.each(map_pokemons, function(key/*, value*/) {

          if (map_pokemons[key].disappear_time < new Date().getTime() ||
                  opts.excludedPokemon.indexOf(map_pokemons[key].pokemon_id) >= 0) {
              map_pokemons[key].marker.setMap(null);
              delete map_pokemons[key];
          }
      });

      $.each(map_scanned, function(key/*, value*/) {
          //If older than 15mins remove
          if (map_scanned[key].last_modified < (new Date().getTime() - 15 * 60 * 1000)) {
              map_scanned[key].marker.setMap(null);
              //console.log('delete scanned');
              delete map_scanned[key];
          }
      });
  }

  function _isReady(log) {
    if (log && !STATE.mapReady) {
      console.log('ignore map update - google.maps object not yet loaded');
    }

    if (log && !(STATE.lat && STATE.lng)) {
      console.log('ignore map update - location not set yet');
    }

    return STATE.mapReady && STATE.lat && STATE.lng;
  }

  function init(_google) {
    google = _google || window.google;
    STATE.mapReady = !!google;

    if (_isReady()) {
      _init();
    }
  }

  function updateLocation(lat, lng, changeType) {
    if (lat && lng && 'number' === typeof lat && 'number' === typeof lng) {
      if (lat !== STATE.lat || lng !== STATE.lng) {
        STATE.lat = lat;
        STATE.lng = lng;
      }
    }

    if (_isReady()) {
      _init();
    }

    STATE.marker.setPosition(new google.maps.LatLng(STATE.lat, STATE.lng));

    if ('center' === changeType) {
      // http://stackoverflow.com/questions/10917648/google-maps-api-v3-recenter-the-map-to-a-marker
      STATE.map.setCenter(STATE.marker.getPosition());
    }
  }

  function updateConfig(key, val) {
    STATE.cfg[key] = val;

    clearTimeout(STATE.updateTimeout);
    STATE.updateTimeout = setTimeout(function () {
      updateMap();
    }, 50);
  }

  function _init() {
    if (STATE.map) {
      return;
    }

    window.setInterval(updateLabelDiffTime, 1000);

    $('.js-geolocation-container').hide();
    $('.js-map').show();

    STATE.map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: STATE.lat,
            lng: STATE.lng
        },
        zoom: 16,
        fullscreenControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: google.maps.ControlPosition.RIGHT_TOP,
          mapTypeIds: [
              google.maps.MapTypeId.ROADMAP,
              google.maps.MapTypeId.SATELLITE,
              'dark_style',
              'style_light2',
              'style_pgo'
          ]
        }
    });

    var style_dark = new google.maps.StyledMapType(darkStyle, {name: "Dark"});
    STATE.map.mapTypes.set('dark_style', style_dark);

    var style_light2 = new google.maps.StyledMapType(light2Style, {name: "Light2"});
    STATE.map.mapTypes.set('style_light2', style_light2);

    var style_pgo = new google.maps.StyledMapType(pGoStyle, {name: "PokemonGo"});
    STATE.map.mapTypes.set('style_pgo', style_pgo);

    STATE.map.addListener('maptypeid_changed', function(/*s*/) {
      opts.onChangeConfig('mapStyle', this.mapTypeId);
    });

    if (!STATE.cfg.mapStyle || STATE.cfg.mapStyle === 'undefined') {
      opts.onChangeConfig('mapStyle', 'roadmap');
    }

    STATE.map.setMapTypeId(STATE.cfg.mapStyle);

    STATE.marker = new google.maps.Marker({
      draggable: true,
      position: {
        lat: STATE.lat,
        lng: STATE.lng
      },
      map: STATE.map,
      animation: google.maps.Animation.DROP
    });

    google.maps.event.addListener(STATE.marker, "dragend", function (event) {
      STATE.lat = event.latLng.lat();
      STATE.lng = event.latLng.lng();

      opts.onChangeLocation(STATE.lat, STATE.lng, 'drag');
    });

    google.maps.event.addListener(STATE.map, 'click', function (event) {
      STATE.lat = event.latLng.lat();
      STATE.lng = event.latLng.lng();

      opts.onChangeLocation(STATE.lat, STATE.lng, 'click');
    });
  }

  function processGyms(item){
    if (!STATE.cfg.showGyms) {
        return false; // in case the checkbox was unchecked in the meantime.
    }

    if (item.gym_id in map_gyms) {
        // if team has changed, create new marker (new icon)
        if (map_gyms[item.gym_id].team_id !== item.team_id) {
            map_gyms[item.gym_id].marker.setMap(null);
            map_gyms[item.gym_id].marker = setupGymMarker(item);
        } else { // if it hasn't changed generate new label only (in case prestige has changed)
            map_gyms[item.gym_id].marker.infoWindow = new google.maps.InfoWindow({
                content: gymLabel(gym_types[item.team_id], item.team_id, item.gym_points)
            });
        }
    }
    else { // add marker to map and item to dict
        if (item.marker) { item.marker.setMap(null); }
        item.marker = setupGymMarker(item);
        map_gyms[item.gym_id] = item;
    }

  }

  function setupScannedMarker(item) {
    //console.log('setupScannedMarker');
    //console.log(item);
    var circleCenter = new google.maps.LatLng(item.latitude, item.longitude);

    var opts = {
      map: STATE.map,
      center: circleCenter,
      radius: 100, // 10 miles in metres
      fillColor: getColorByDate(item.last_modified),
      strokeWeight: 1
    };
    //console.log(opts);
    var marker = new google.maps.Circle(opts);

    return marker;
  }

  function processScanned(item) {
    if (!STATE.cfg.showScanned) {
      //console.log('ignore scanned');
      return false;
    }

    if (item.scanned_id in map_scanned) {
      //console.log('update old scanned');
      map_scanned[item.scanned_id].marker.setOptions({
        fillColor: getColorByDate(item.last_modified)
      });
    } else { // add marker to map and item to dict
      //console.log('create new scanned');
      if (item.marker) { item.marker.setMap(null); }
      item.marker = setupScannedMarker(item);
      map_scanned[item.scanned_id] = item;
    }
  }

  function processPokestops(item) {
    if (!STATE.cfg.showPokestops) {
      return false;
    } else if (!(item.pokestop_id in map_pokestops)) { // add marker to map and item to dict
      // add marker to map and item to dict
      if (item.marker) { item.marker.setMap(null); }
      item.marker = setupPokestopMarker(item);
      map_pokestops[item.pokestop_id] = item;
    }

  }

  function processPokemon(item) {
    if (!STATE.cfg.showPokemon) {
      return false; // in case the checkbox was unchecked in the meantime.
    }
    if (!(item.encounter_id in map_pokemons) &&
            opts.excludedPokemon.indexOf(item.pokemon_id) < 0) {
      // add marker to map and item to dict
      if (item.marker) { item.marker.setMap(null); }
      item.marker = setupPokemonMarker(item);
      map_pokemons[item.encounter_id] = item;
    }
  }

  function updateMap(_result) {
    if (!_isReady(true)) {
      return;
    }

    if (_result) {
      STATE.result = _result;
    }

    if (!STATE.result) {
      console.log('updateMap ignored - waiting for heartbeat');
      return;
    }

    STATE.result.pokemons.forEach(processPokemon);
    STATE.result.pokestops.forEach(processPokestops);
    STATE.result.gyms.forEach(processGyms);
    STATE.result.scanned.forEach(processScanned);

    clearStaleMarkers();
  }

  return {
    init: init
  , setData: updateMap
  , setLocation: updateLocation
  , setConfig: updateConfig
    // data
  , pokemon: map_pokemons
  , gyms: map_gyms
  , scanned: map_scanned
  , pokestops: map_pokestops
  };

};

}(window));
