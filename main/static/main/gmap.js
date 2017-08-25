var map;

function initMap() {
  var london = {
    lat: 51.5,
    lng: -0.125
  };
  map = new google.maps.Map(document.getElementById('map'), {
    center: london,
    zoom: 14,
    styles: mapStyle
  });

  var timeout;
  map.addListener('bounds_changed', function() {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(addPostcodeMarkers, 500);
  });
}

function getCookie(name) {
  var cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = jQuery.trim(cookies[i]);
      // Check if this cookie string begin with the name we want
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function csrfSafeMethod(method) {
  // these HTTP methods do not require CSRF protection
  return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

$.ajaxSetup({
  beforeSend: function(xhr, settings) {
    if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
      xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
    }
  }
});

function updateFeatureStyle(scale) {
  map.data.setStyle(function(feature) {
    var opacity = parseFloat(feature.getProperty('transaction_count')) / 200;
    return /** @type {google.maps.Data.StyleOptions} */ ({
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: scale,
        fillColor: '#f00',
        fillOpacity: opacity,
        strokeWeight: 0
      }
    });
  });
}

function generatePostcodeGeodata(data) {
  var postcodeData = {
    "type": "FeatureCollection",
    "features": []
  };
  data.forEach(function(postcode) {
    postcodeData.features.push({
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [postcode.longitude, postcode.latitude]
      },
      "properties": {
        "transaction_count": postcode.transaction_count
      }
    })
  });
  return postcodeData;
}


function addPostcodeMarkers(mapBounds) {
  var zoomLvl = map.getZoom();
  map.data.forEach(function(feature) {
    map.data.remove(feature);
  });
  // set minimum zoomLvl for marker to be 16, to prevent overloading display
  if (zoomLvl < 16) {
    return;
  }
  var markerScaleDict = {
    16: 3,
    17: 4
  };
  var markerScale = markerScaleDict[zoomLvl] || 5;
  updateFeatureStyle(markerScale);

  var mapBounds = map.getBounds();
  mapBounds = {
    longitude: {
      min: mapBounds.b.b,
      max: mapBounds.b.f
    },
    latitude: {
      min: mapBounds.f.b,
      max: mapBounds.f.f
    },
  };

  $.ajax({
    method: "POST",
    url: "/transactions",
    contentType: 'application/json',
    data: JSON.stringify(mapBounds),
    dataType: "json",
    success: function(data) {
      var postcodeGeodata = generatePostcodeGeodata(data);
      map.data.addGeoJson(postcodeGeodata);
    }
  })
};

var mapStyle = [{
  'featureType': 'landscape',
  'stylers': [{
    'color': '#fcfcfc'
  }]
}, {
  'featureType': 'poi',
  'stylers': [{
    'visibility': 'off'
  }]
}, {
  'featureType': 'road',
  'elementType': 'geometry',
  'stylers': [{
    "saturation": -100 // to make it grayscale
  }]
}, {
  'featureType': 'water',
  'elementType': 'labels',
  'stylers': [{
    'visibility': 'off'
  }]
}, {
  'featureType': 'water',
  'elementType': 'geometry',
  'stylers': [{
    'visibility': 'on'
  }, {
    'hue': '#5f94ff'
  }, {
    'lightness': 60
  }]
}];
