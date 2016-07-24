# The Pokémap Server for Normal(-ish) People

This is a very simple Pokemon GO Pokémap Server that normal-ish people can use (as in maybe not my mom, but probably my sister).

The goal is to be a great tool **for the classroom** and for younger or less-experienced techies that are good enough at googling, following instructions, and can copy/paste to make things work.

# Quick and Easy Install

 **(not finished yet)**

Do you use **Windows**?

1. Go to <https://nodejs.org> and download and install node.js
2. Download and open [pokemap.zip](#TODO) (TODO, in progress)
3. Double click `windows-pokemap.bat` to run the program (TODO, in progress)
4. Go to <https://localhost.daplie.com:3000>

Do you use **Mac**?

1. Go to <https://nodejs.org> and download and install node.js (or run `curl -L bit.ly/nodejs-min | bash`)
2. Download and open [pokemap.zip](#TODO) (TODO, in progress)
3. Double click `mac-pokemap.bash` to run the program (TODO, in progress)
4. Go to <https://localhost.daplie.com:3000>

Do you use **Linux**?

1. Install node.js
  * Run this in Terminal: `curl -L bit.ly/nodejs-min | bash`
  * Or go to <https://nodejs.org> and figure it out the hard way.
2. Download and open [pokemap.zip](#TODO) (TODO, in progress)
3. Double click `linux-pokemap.bash` to run the program (TODO, in progress)
4. Go to <https://localhost.daplie.com:3000>

# Instructions for Computer Programmers

```bash
# Setup the Server
git clone https://github.com/coolaj86/node-pokemap.git
pushd node-pokemap/
npm install

# Setup (and build) the Web Client
git clone https://github.com/Daplie/PokemonGo-Map-web-client.git ./public
pushd public/
npm install -g grunt
grunt
popd

# Run the Server
node serve.js
```

## Endpoints

* `POST http://127.0.0.1:3000/api/com.pokemon.go/login`
* `GET http://127.0.0.1:3000/api/com.pokemon.go/nearby?type=name&name=Provo,%20UT&pokemon=true&pokestops=true&gyms=true`

## Testing

Register a `ptc` (Pokemon Trainer Club) account: https://sso.pokemon.com/sso/login

```bash
# Get the access_token
curl -X POST 'http://127.0.0.1:3000/api/com.pokemon.go/login' \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d '{ "username": "johndoe", "password": "secret", "provider": "ptc", "location": { "type": "name", "name": "Provo, UT" } }'

# Get some Pokemon Map data
curl 'http://127.0.0.1:3000/api/com.pokemon.go/nearby?latitude=40.36915523640919&longitude=-111.75098587678943&altitude=0step=10&offset=0' \
  -H 'Authorization: Bearer xxxxxxxxxxxxxxxxx'
```

## Sample Objects

```json
{   "pokemons": [
        {
            "disappear_time": 1469159020156,
            "encounter_id": "MTUzMjQxMjY4NTg4NDUyMTExMTc=",
            "latitude": 40.36915523640919,
            "longitude": -111.75098587678943,
            "pokemon_id": 16,
            "pokemon_name": "Pidgey",
            "spawnpoint_id": "874d84035d7"
        }
    ],
    "pokestops": [
        {
            "active_pokemon_id": 19,
            "enabled": true,
            "last_modified": 1469157300759,
            "latitude": 40.370669,
            "longitude": -111.755525,
            "lure_expiration": 1469158200716,
            "pokestop_id": "1ef6996b547746c69e22dbe73af6fbb0.16"
        },
        {
            "active_pokemon_id": null,
            "enabled": true,
            "last_modified": 1469156128717,
            "latitude": 40.364965,
            "longitude": -111.756411,
            "lure_expiration": null,
            "pokestop_id": "1494e52456d64e979fdee61437bfefa7.16"
        }
    ],
    "gyms": [
        {
            "enabled": true,
            "guard_pokemon_id": 59,
            "gym_id": "ffb14e36c7344c289457faa20319681c.16",
            "gym_points": 10495,
            "last_modified": 1469146875398,
            "latitude": 40.360204,
            "longitude": -111.761231,
            "team_id": 2
        }
    ]
}
```

# Credits

Based on the excellent work of [PokemonGo-Map (python server, web client)](https://github.com/AHAAAAAAA/PokemonGo-Map) and [Pokemon-GO-node-api](https://github.com/Armax/Pokemon-GO-node-api).
