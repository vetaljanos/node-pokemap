'use strict';

var scan = require('../static/scan.js');

var lat = 40.2262363;
var lng = -111.6630927;
var rings = 5;          // each ring is 100m out from the last, so they get big, fast

var steps = scan.generateLocationSteps([lat, lng], rings);

console.log(steps);
