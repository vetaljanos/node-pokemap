(function (exports) {
'use strict';

// Ported from https://github.com/AHAAAAAAA/PokemonGo-Map/blob/master/pogom/search.py#L55
// def gen_new_coords
// def generate_location_steps

// Converts from degrees to radians.
function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

// Converts from radians to degrees.
function toDegrees(radians) {
  return radians * 180 / Math.PI;
}

function get_new_coords(init_loc, distance, bearingDegs) {
    /*
    Given an initial lat/lng, a distance(in kms), and a bearing (degrees),
    this will calculate the resulting lat/lng coordinates.
    */

    var R = 6378.1; // km radius of the earth
    var bearing = toRadians(bearingDegs);

    var init_coords = [toRadians(init_loc[0]), toRadians(init_loc[1])]; // convert lat/lng to radians

    var new_lat = Math.asin( Math.sin(init_coords[0])*Math.cos(distance/R)
      + Math.cos(init_coords[0])*Math.sin(distance/R)*Math.cos(bearing));

    var new_lon = init_coords[1] + Math.atan2(Math.sin(bearing)*Math.sin(distance/R)*Math.cos(init_coords[0]),
        Math.cos(distance/R)-Math.sin(init_coords[0])*Math.sin(new_lat));

    return [toDegrees(new_lat), toDegrees(new_lon)];
}

function generate_location_steps(initial_loc, step_count, pulse_radius) {
    if (!Array.isArray(initial_loc) && (2 === initial_loc.length || 3 === initial_loc.length)) {
      throw new Error("generate_location_steps([lat, lng], step_count)");
    }
    // Bearing (degrees)
    var NORTH = 0;
    var EAST = 90;
    var SOUTH = 180;
    var WEST = 270;

    var pulse_radius = pulse_radius / 1000; // km - radius of players heartbeat is 100m
    var xdist = Math.sqrt(3)*pulse_radius;  // dist between column centers
    var ydist = 3*(pulse_radius/2);         // dist between row centers

    var steps = [];


    var ring = 1;
    var loc = initial_loc;
    var altitude = 0;
    var direction;
    var i;

    steps.push([initial_loc[0], initial_loc[1], altitude]);    // insert initial location

    while (ring < step_count) {
        // Set loc to start at top left
        loc = get_new_coords(loc, ydist, NORTH);
        loc = get_new_coords(loc, xdist/2, WEST);
        for (direction = 0; direction < 6; direction += 1) {
            for (i = 0; i < ring; i += 1) {
                switch (direction) {
                  case 0: // RIGHT
                    loc = get_new_coords(loc, xdist, EAST);
                    break;
                  case 1: // DOWN + RIGHT
                    loc = get_new_coords(loc, ydist, SOUTH);
                    loc = get_new_coords(loc, xdist/2, EAST);
                    break;
                  case 2: // DOWN + LEFT
                    loc = get_new_coords(loc, ydist, SOUTH);
                    loc = get_new_coords(loc, xdist/2, WEST);
                    break;
                  case 3: // LEFT
                    loc = get_new_coords(loc, xdist, WEST);
                    break;
                  case 4: // UP + LEFT
                    loc = get_new_coords(loc, ydist, NORTH);
                    loc = get_new_coords(loc, xdist/2, WEST);
                    break;
                  case 5: // UP + RIGHT
                    loc = get_new_coords(loc, ydist, NORTH);
                    loc = get_new_coords(loc, xdist/2, EAST);
                    break;
                }
                steps.push([loc[0], loc[1], altitude]);
            }
        }
        ring += 1;
    }

    return steps;
}

exports.getNewCoords = get_new_coords;
exports.generateLocationSteps = generate_location_steps;

}('undefined' === typeof window ? module.exports : window));
