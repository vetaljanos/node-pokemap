'use strict';

module.exports.fix = function (PokemonGo) {

  //
  // Shim for PokemonGo lib, needs pull request once complete
  //
  //
  //var request = require('request');
  //var FileCookieStore = require('tough-cookie-filestore');
  //var path = require('path');
  PokemonGo.Pokeio.prototype.serialize = /*PokemonGo.Pokeio.prototype.serialize ||*/ function () {
    var self = this;
    var json = {
      username: self.playerInfo.username
    , password: self.playerInfo.password
    , provider: self.playerInfo.provider

    , latitude: self.playerInfo.latitude
    , longitude: self.playerInfo.longitude
    , altitude: self.playerInfo.altitude

      // refresh before expires
    , accessToken: self.playerInfo.accessToken
    , accessTokenExpires: self.playerInfo.accessTokenExpires
    , apiEndpoint: self.playerInfo.apiEndpoint
    };
    console.log('DEBUG json');
    console.log(json);
    return json;
  };
  PokemonGo.serialize = function (pokeio) {
    return pokeio.serialize();
  };

  PokemonGo.Pokeio.prototype.deserialize = /*PokemonGo.Pokeio.prototype.deserialize ||*/ function (opts) {
    if (!opts.accessToken || !opts.apiEndpoint) {
      throw new Error("accessToken or apiEndpoint could not be found to be deserialized");
    }
    var self = this;
    self.playerInfo.username = opts.username || 'ERROR_USERNAME';
    self.playerInfo.password = opts.password || 'ERROR_PW';
    self.playerInfo.provider = opts.provider || 'ERROR_PROVIDER';
    self.playerInfo.accessToken = opts.accessToken || 'ERROR';
    self.playerInfo.accessTokenExpires = opts.accessTokenExpires || 0;
    self.playerInfo.latitude = opts.latitude || 'ERROR_LAT';
    self.playerInfo.longitude = opts.longitude || 'ERROR_LNG';
    self.playerInfo.altitude = opts.altitude || 0;

    // TODO
    // logging reveals that cookies are probably not even used, just JWTs :)
    //self.j = request.jar(new FileCookieStore(path.resolve('/tmp/', self.playerInfo.username + '.pokemongo.json')));
    //self.request = request.defaults({ jar: self.j });

    self.playerInfo.apiEndpoint = opts.apiEndpoint || 'ERROR_API';
  };

  PokemonGo.deserialize = function (opts) {
    var pokeio = new PokemonGo.Pokeio();
    pokeio.deserialize(opts);
    return pokeio;
  };

  PokemonGo.Pokeio.prototype.Login = PokemonGo.Pokeio.prototype.Login || function (username, password, provider, callback) {
    var self = this;

    if (provider !== 'ptc' && provider !== 'google') {
      return callback(new Error('Invalid provider'));
    }

    self.playerInfo.provider = provider;
    self.GetAccessToken(username, password, function (err, accessToken) {
      // Note: stores accessToken as self.playerInfo.accessToken
      if (err) {
        callback(err);
        return;
      }

      self.GetApiEndpoint(function (err, apiEndpoint) {
        // Note: stores endpoint as self.playerInfo.apiEndpoint
        if (err) {
          callback(err);
          return;
        }

        if (callback) {
          callback(null, {
            username: username
          //, password: password // TODO cipher
          , provider: provider
          , accessToken: accessToken
          , apiEndpoint: apiEndpoint
          });
        }
      });
    });
  };

};
