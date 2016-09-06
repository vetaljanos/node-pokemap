'use strict';

// CHANGE ME
window.CONFIG = {
  latitude: 50.0266511
, longitude: 36.3578367
, gmaps_key: 'AIzaSyAA-QeKkOX2v7zcRS9IUS0SYJnFiZyOAfQ'
, requireLogin: false
, heartbeatInterval: 5000 // in ms
  // distance in meters to travel between heartbeats
, pulseRadius: 25
  // number of concentric rings to expand during search
  // (keep this small - less than 10 - it gets really big really fast)
, ringSteps: 8
};

// Auto-detect language to use
window.document.documentElement.lang = 'en';
[ 'de', 'en', 'fr', 'pt_br', 'ru', 'zh_cn', 'zh_hk' ].some(function (lang) {
  if (window.navigator.language.match(lang)) {
    window.document.documentElement.lang = lang;
    return true;
  }
});
