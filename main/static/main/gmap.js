var map;

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 51.5, lng: -0.125 },
    zoom: 12,
    styles: mapStyle
  });
}

var mapStyle = [{
  'featureType': 'landscape',
  'stylers': [{'color': '#fcfcfc'}]
}, {
    'featureType': 'poi',
  'stylers': [{'visibility': 'off'}]
}, {
  'featureType': 'road',
  'elementType': 'geometry',
  'stylers': [{"saturation": -100}] // to make it grayscale
}, {
    'featureType': 'water',
  'elementType': 'labels',
  'stylers': [{'visibility': 'off'}]
}, {
  'featureType': 'water',
  'elementType': 'geometry',
  'stylers': [{'visibility': 'on'}, {'hue': '#5f94ff'}, {'lightness': 60}]
}];