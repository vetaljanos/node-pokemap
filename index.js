'use strict';

var express = require('express');
var JWT = require('jsonwebtoken');
var PokemonGo = require('pokemon-go-node-api');
var bodyParser = require('body-parser');
var crypto = require('crypto');

require('./lib/pokeio-hotfix').fix(PokemonGo);

module.exports.create = function (options) {

var app = express();
var keypair = options.keypair;
var secret = crypto.pbkdf2Sync(keypair.privateKeyPem, '', 1, 16, 'sha256');
var iv = Buffer.alloc(16); // all zeros

function createDemoToken(expIn) {
  var cipher = crypto.createCipheriv('aes128', secret, iv);
  var localToken = JWT.sign(
    { exp: Math.round(new Date(Date.now() + (expIn * 1000)) / 1000)

    , username: 'demo'
    , password: cipher.update('demo', 'utf8', 'base64') + cipher.final('base64')
    , provider: 'demo'

    , accessToken: '---'
    , accessTokenExpires: '---'
    , apiEndpoint: '---'
    }
  , keypair.privateKeyPem
  , { algorithm: 'RS256'}
  );

  return localToken;
}

var demoToken = createDemoToken((365 * 24 * 60 * 60));

function postLogin(req, res) {
  if (
      'demo' === req.body.username
    || 'demo' === req.body.password
    || 'demo' === req.body.provider
    || 'user' === req.body.username
    || 'password' === req.body.password
  ) {
    var expIn = (365 * 24 * 60 * 60);
    var localToken = createDemoToken(expIn);
    res.send({ access_token: localToken, expires_in: expIn });
    return;
  }

  var pokeio = new PokemonGo.Pokeio();

  // location = { latitude, longitude, altitude, type(coords|name), name }
  // provider = ptc | google
  //pokeio.init(req.body.username, req.body.password, req.body.location, req.body.provider, function (err) {
  pokeio.Login(
    req.body.username
  , req.body.password
  , req.body.provider
  , function (err/*, { username, password, provider, accessToken, apiEndpoint }*/) {
    // Note: stores accessToken as self.playerInfo.accessToken
    if (err) {
      res.send({ error: { message: err.toString() } });
      return;
    }

    // TODO use JWT and database
    //var expIn = (15 * 60);
    var expIn = (365 * 24 * 60 * 60);
    var expAt = new Date(Date.now() + (expIn * 1000)).valueOf();
    var session = PokemonGo.serialize(pokeio);
    var cipher = crypto.createCipheriv('aes128', secret, iv);

    if (!session.accessToken) {
      console.log('LOGIN session ERROR:');
      console.log(session);

      res.send({ error: { message: "Login failed. Servers may be unavailable or login may be invalide." } });
      return;
    }

    if (/null/.test(session.apiEndpoint)) {
      console.log('LOGIN session ERROR:');
      console.log(session);

      res.send({ error: { message: "API Endpoint servers are not currently available. Try again later." } });
      return;
    }

    var localToken = JWT.sign(
      { exp: Math.round(expAt / 1000)

      , username: req.body.username
      , password: cipher.update(req.body.password, 'utf8', 'base64') + cipher.final('base64')
      , provider: req.body.provider

      , accessToken: session.accessToken
      , accessTokenExpires: session.accessTokenExpires
      , apiEndpoint: session.apiEndpoint
      }
    , keypair.privateKeyPem
    , { algorithm: 'RS256'}
    );

    res.send({ access_token: localToken, expires_in: expIn });
  });
}

function mockData(loc) {
  var data = JSON.parse(JSON.stringify(require('./utils/demo.json')));
  var ms = Date.now();

  loc.lat = parseFloat(loc.latitude.toFixed(6), 10);
  loc.lng = parseFloat(loc.longitude.toFixed(6), 10);

  data.pokemons = data.pokemons.map(function (pokemon) {
    pokemon.latitude += loc.latitude;
    pokemon.longitude += loc.longitude;
    pokemon.disappear_time += ms;

    return pokemon;
  }).filter(function () {
    if (Math.round(Math.random() * 100) % 10) {
      return true;
      //pokemon.disappear_time -= (15 * );
    }
    return false;
  });
  data.gyms.forEach(function (gym) {
    gym.latitude = parseFloat((gym.latitude + loc.lat).toFixed(6), 10);
    gym.longitude = parseFloat((gym.longitude + loc.lng).toFixed(6), 10);
  });
  data.pokestops.forEach(function (gym) {
    gym.latitude = parseFloat((gym.latitude + loc.lat).toFixed(6), 10);
    gym.longitude = parseFloat((gym.longitude + loc.lng).toFixed(6), 10);
    gym.lure_expiration = gym.lure_expiration && (gym.lure_expiration + ms) || null;
  });

  return data;
}

function getNearby(pokeio, cb) {
  pokeio.Heartbeat(function (err, hb) {
    var pokemons = [];
    var pokestops = [];
    var gyms = [];

    if (err) {
      console.error('ERROR: Heartbeat');
      console.error(err);
      cb({ error: { message: err.toString() } });
      return;
    }

    /*
    console.log('');
    console.log('DEBUG hb');
    console.log(hb);
    */

    // Described at ./node_modules/pokemon-go-node-api/pokemon.proto
    hb.cells.forEach(function (cell) {
      // TODO insert into database since this is longstanding
      cell.Fort.forEach(function (fort) {
        if (null === fort.FortType || 0 === fort.FortType) {
          // it's a gym!
          gyms.push({
            gym_id: fort.FortId
          , gym_points: fort.GymPoints
          , enabled: fort.Enabled
          , guard_pokemon_id: fort.GuardPokemonId
          , guard_pokemon_level: fort.GuardPokemonLevel
          , last_modified: parseInt(fort.LastModifiedMs
              && fort.LastModifiedMs.toString() || 0, 10) || 0
          , latitude: fort.Latitude
          , longitude: fort.Longitude
          , team_id: fort.Team
          });

          console.log('DEBUG gym');
          console.log(fort);
          console.log(gyms[gyms.length - 1]);
        }
        else if (1 === fort.FortType) {
          // it's a pokestop!
          pokestops.push({
            pokestop_id: fort.FortId
          , active_pokemon_id: fort.LureInfo
              && fort.LureInfo.ActivePokemonId || null
          , enabled: fort.Enabled
          , last_modified: parseInt(fort.LastModifiedMs
              && fort.LastModifiedMs.toString() || 0, 10) || 0
          , latitude: fort.Latitude
          , longitude: fort.Longitude
          , lure_expiration: parseInt(fort.LureInfo
              && fort.LureInfo.LureExpiresTimestampMs
              && fort.LureInfo.LureExpiresTimestampMs.toString() || 0, 10) || 0
          });
        }
        else {
          console.log('Unknown Fort Type:');
          console.log(fort);
        }
      });
      cell.MapPokemon.forEach(function (pokemon) {

        var exp = pokemon.ExpirationTimeMs; //.toUnsigned(); // TODO convert to int more exactly
        var id = Buffer.alloc(8); // pokemon.EncounterId;        // ??? how to convert from ProtoLong to base64? // also NearbyPokemon[i].EncounterId
        var l = pokemon.EncounterId.toUnsigned();

        /*
        console.log('DEBUG pokemon.EncounterId');
        console.log(pokemon.EncounterId.toString(10));
        console.log(pokemon.EncounterId.high);
        console.log(pokemon.EncounterId.low);
        */

        // TODO do we need to check os.endianness()?
        // https://github.com/dcodeIO/long.js/issues/34#issuecomment-234544371
        // https://github.com/Daplie/node-pokemap/issues/12
        id.writeInt32BE(l.high, 0);
        id.writeInt32BE(l.low, 4);

        pokemons.push({
          disappear_time: exp.toNumber()
        //, encounter_id: null
        , encounter_id: id.toString('base64') // this is probably still wrong
        , latitude: parseFloat(pokemon.Latitude.toString(), 10)
        , longitude: parseFloat(pokemon.Longitude.toString(), 10)
        , pokemon_id: pokemon.PokedexTypeId // also NearbyPokemon[i].PokedexNumber
        , pokemon_name: (pokeio.pokemonlist[pokemon.PokedexTypeId - 1]||{}).name
        , spawnpoint_id: pokemon.SpawnpointId
        });
      });
    });

    cb(null, {
      pokemons: pokemons
    , pokestops: pokestops
    , gyms: gyms
    });
  });
}

function getData(req, res) {
  // TODO handle updates
  // query = { location, pokestops, gyms, pokemons }

  // TODO check expAt
  var creds = req.sess;
  var pokeio;

  if (!req.query.latitude || !req.query.longitude) {
    res.send({ error: { message: "missing latitude or longitude" } });
    return;
  }

  // TODO allow named coords
  // var geocoder = require('geocoder');
  // geocoder.reverseGeocode(lat, lng, function (err, data) { ... });
  // geocoder.geocode(locationName, function (err, data) { ... });

  creds.latitude = parseFloat(req.query.latitude || req.query.lat, 10) || creds.latitude;
  creds.longitude = parseFloat(req.query.longitude || req.query.lng || req.query.lon, 10) || creds.longitude;
  creds.altitude = parseFloat(req.query.altitude || req.query.alt, 10) || 0;

  if ('demo' === req.sess.username) {
    res.send(mockData(req.sess));
    return;
  }

  console.log(creds);
  pokeio = PokemonGo.deserialize(creds);
  console.log(pokeio.playerInfo);
  /*
  console.log("DEBUG");
  console.log(creds);
  console.log(PokemonGo.deserialize.toString());
  console.log(pokeio);
  */
  getNearby(pokeio, function (err, results) {
    if (err) {
      res.send(err);
    }
    else {
      res.send(results);
    }
  });
}

function getLoc(req, res) {
  res.send({
    latitude: req.sess.latitude
  , longitude: req.sess.longitude
  });
}

function postLoc(req, res) {
  //var expIn = 15 * 60;
  var localToken;

  req.sess.latitude = parseFloat(req.query.lat, 10);
  req.sess.longitude = parseFloat(req.query.lng, 10);
  //req.sess.exp = new Date(Date.now() + (expIn * 1000));

  localToken = JWT.sign(req.sess, keypair.privateKeyPem, { algorithm: 'RS256'});

  res.send({ success: true, access_token: localToken, expires_in: 15 * 60 });
}

function attachSession(req, res, next) {
  var accessToken = (req.headers.authorization||'').replace(/(Bearer|Token|JWT) /ig, '');

  if ('demo' === accessToken) {
    accessToken = demoToken;
  }

  if (accessToken) {
    try {
      req.sess = JWT.verify(accessToken, keypair.publicKeyPem, { algorithms: [ 'RS256' ] });
    } catch(e) {
      console.error(e);
    }
  }

  next();
}

function requireSession(req, res, next) {
  if (!req.sess) {
    res.send({ error: { message: "unrecognized access token, try again" } });
    return;
  }

  next();
}

app.use('/api/com.pokemon.go/login', bodyParser.json());
app.post('/api/com.pokemon.go/login', postLogin);

app.use('/', attachSession);

app.get('/api/com.pokemon.go/nearby', requireSession, getData);
app.get('/raw_data', requireSession, getData);

// Get / Set session data (pretty useless, on the whole)
app.get('/loc', requireSession, getLoc);
app.post('/next_loc', requireSession, postLoc);
//app.post('/pokemon', getData);

return app;

};
