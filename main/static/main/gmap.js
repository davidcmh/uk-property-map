var map;
var distinctPostcodes;

function initMap() {
  var london = {
    lat: 51.5,
    lng: -0.125
  };

  // TODO: delete
  var london = {
    lat: 51.74474,
    lng: -0.3447387
  }
  map = new google.maps.Map(document.getElementById('map'), {
    center: london,
    zoom: 16, // TODO: replace to be 14
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
        "transaction_count": postcode.transaction_count,
        "distinct_postcodes": postcode.distinct_postcodes
      }
    })
  });
  return postcodeData;
}

function hideTransactions() {
    document.getElementById("transactions-table").style.display = "none";
    document.getElementById("transactions-btn").innerHTML = "<i class='material-icons'>keyboard_arrow_right</i>";
    document.getElementById("transactions-btn").onclick = showTransactions;
};

function showTransactions() {
    document.getElementById("transactions-table").style.display = "inline-block";
    document.getElementById("transactions-btn").innerHTML = "<i class='material-icons'>keyboard_arrow_left</i>";
    document.getElementById("transactions-btn").onclick = hideTransactions;
};

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
    16: 4,
    17: 5
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

  var marker;
  map.data.addListener('click', function(event) {
    if (marker) {
        marker.setMap(null);
    }
	marker = new google.maps.Marker({
      position: event.feature.getGeometry().get(),
      map: map
    });
    distinctPostcodes = event.feature.getProperty('distinct_postcodes')
    document.getElementById("overlay-container").style.display = 'block';
	document.getElementById("overlay-container").innerHTML= "<div id='summary-container'>" +
                "<div id='transactions-summary'>" +
                    "<p> Postcodes: " + distinctPostcodes + "</p>" +
                    "<p> Transaction count: " + event.feature.getProperty('transaction_count') + "</p>" +
                    "<p> Latitude: " + event.feature.getGeometry().b.lat().toFixed(5) + "</p>" +
                    "<p> Longitude: " + event.feature.getGeometry().b.lng().toFixed(5) + "</p>" +
                "</div>" +
                "<button id='transactions-btn' type='button'>" +
                    "<i class='material-icons'>keyboard_arrow_right</i>" +
                "</button>" +
            "</div>" +
            "<div id='transactions-table'> hello world </div>"
	;
	document.getElementById("transactions-btn").onclick = showTransactions;
  });

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
