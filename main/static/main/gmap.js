var map;
var distinctPostcodes;
var marker;
var activeContainer;

google.charts.load('current', {'packages':['table']});

$.ajax({
    method: "GET",
    url: "/get-like-count",
    success: function(likeCount) {
        document.getElementById("like-count").innerHTML = likeCount;
    }
})

function initMap() {
  var london = {
    lat: 51.51538,
    lng: -0.17450
  };

  map = new google.maps.Map(document.getElementById('map'), {
    center: london,
    zoom: 16,
    styles: mapStyle
  });

  var timeout;
  map.addListener('bounds_changed', function() {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(addPostcodeMarkers, 500);
  });

  document.getElementById("comment-btn").onclick = showDisqusContainer;
  document.getElementById("info-btn").onclick = showInfoContainer;
  document.getElementById("like-btn").onclick = incrementLikeCount;
  document.getElementById("about-close-btn").onclick = hideInfoContainer;

  // Create the search box and link it to the UI element.
    var input = document.getElementById('pac-input');
    var infoBtn = document.getElementById('info-btn');
    var commentBtn = document.getElementById('comment-btn');
    var likeBtn = document.getElementById('like-btn');
    var searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(infoBtn);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(commentBtn);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(likeBtn);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
      searchBox.setBounds(map.getBounds());
    });

    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener('places_changed', function() {
      var places = searchBox.getPlaces();
      var existingZoomLvl = map.getZoom();

      if (places.length == 0) {
        return;
      }

      // For each place, get the icon, name and location.
      var bounds = new google.maps.LatLngBounds();
      places.forEach(function(place) {
        if (!place.geometry) {
          console.log("Returned place contains no geometry");
          return;
        }
        if (marker) {
            marker.setMap(null);
        }

        marker = new google.maps.Marker({
          map: map,
          title: place.name,
          position: place.geometry.location
        });

        if (place.geometry.viewport) {
          // Only geocodes have viewport.
          bounds.union(place.geometry.viewport);
        } else {
          bounds.extend(place.geometry.location);
        }
      });
      map.fitBounds(bounds);
      map.setZoom(existingZoomLvl);
    });

    showInfoContainer();
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
    document.getElementById("transactions-table").style.pointerEvents = "none";
};

function showTransactions() {
    document.getElementById("transactions-table").style.display = "inline-block";
    document.getElementById("transactions-btn").innerHTML = "<i class='material-icons'>keyboard_arrow_left</i>";
    document.getElementById("transactions-btn").onclick = hideTransactions;
    document.getElementById("transactions-table").style.pointerEvents = "auto";
    $.ajax({
        method: "POST",
        url: "/transaction-list",
        contentType: 'application/json',
        data: JSON.stringify({postcodes: distinctPostcodes}),
        dataType: "json",
        success: function(data) {
          drawTable(data);
        }
    })
};

function hideOverlayContainerIfActive() {
    if (activeContainer) {
        if (activeContainer == 'disqus-container') {
            hideDisqusContainer();
        } else if (activeContainer == 'info-container') {
            hideInfoContainer();
        } else if (activeContainer == 'transaction-container') {
            hideTransactionContainer();
        }
        activeContainer = null;
    };

};

function showDisqusContainer() {
    hideOverlayContainerIfActive();
    activeContainer = "disqus-container";
    document.getElementById("disqus-container").style.display = 'block';
    document.getElementById("comment-btn").onclick = hideDisqusContainer;
    document.getElementById("comment-btn").style.background = '#d3d3d3';
};

function hideDisqusContainer() {
    document.getElementById("disqus-container").style.display = 'none';
    document.getElementById("comment-btn").onclick = showDisqusContainer;
    document.getElementById("comment-btn").style.background = 'white';
};

function showInfoContainer() {
    hideOverlayContainerIfActive();
    activeContainer = "info-container";
    document.getElementById("info-container").style.display = 'block';
    document.getElementById("info-btn").onclick = hideInfoContainer;
    document.getElementById("info-btn").style.background = '#d3d3d3';
};

function hideInfoContainer() {
    document.getElementById("info-container").style.display = 'none';
    document.getElementById("info-btn").onclick = showInfoContainer;
    document.getElementById("info-btn").style.background = 'white';
};

function hideTransactionContainer() {
    document.getElementById("transaction-container").style.display = 'none';
};

function incrementLikeCount() {
    document.getElementById("like-btn").onclick = decrementLikeCount;
    document.getElementById("like-btn").style.color =  '#2f6f56';
    $.ajax({
        method: "GET",
        url: "/increment-like-count",
        success: function(likeCount) {
            document.getElementById("like-count").innerHTML = likeCount;
        }
    })
};

function decrementLikeCount() {
    document.getElementById("like-btn").onclick = incrementLikeCount;
    document.getElementById("like-btn").style.color =  'rgba(0,0,0,0.6)';
    $.ajax({
        method: "GET",
        url: "/decrement-like-count",
        success: function(likeCount) {
            document.getElementById("like-count").innerHTML = likeCount;
        }
    })
};

function addPostcodeMarkers() {
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
    url: "/transaction-summary",
    contentType: 'application/json',
    data: JSON.stringify(mapBounds),
    dataType: "json",
    success: function(data) {
      var postcodeGeodata = generatePostcodeGeodata(data);
      map.data.addGeoJson(postcodeGeodata);
    }
  })

  map.data.addListener('click', function(event) {
    hideOverlayContainerIfActive();
    activeContainer = 'transaction-container';
    if (marker) {
        marker.setMap(null);
    }
	marker = new google.maps.Marker({
      position: event.feature.getGeometry().get(),
      map: map
    });
    distinctPostcodes = event.feature.getProperty('distinct_postcodes');
    document.getElementById("transaction-container").style.display = 'block';
	document.getElementById("transaction-container").innerHTML= "<div class='row'>" +
	        "<div id='summary-container'>" +
                "<div id='transactions-summary'>" +
                    "<p style='margin-top:10px;'> Postcodes: " + distinctPostcodes.split(',').join(', ') + "</p>" +
                    "<p> Transaction count: " + event.feature.getProperty('transaction_count') + "</p>" +
                    "<p> Latitude: " + event.feature.getGeometry().b.lat().toFixed(5) + "</p>" +
                    "<p> Longitude: " + event.feature.getGeometry().b.lng().toFixed(5) + "</p>" +
                "</div>" +
                "<button id='transactions-btn' type='button'>" +
                    "<i class='material-icons'>keyboard_arrow_right</i>" +
                "</button>" +
            "</div>" +
            "<div id='transactions-table'> </div>" +
        "</div>"
	;
	document.getElementById("transactions-btn").onclick = showTransactions;
  });
};

function drawTable(transactionData) {
    var cssClassNames = {
        'headerRow': 't-header',
        'tableRow': 't-background t-font',
        'oddTableRow': 't-background',
        'selectedTableRow': 't-background',
        'hoverTableRow': 't-hover',
        'headerCell': 't-header',
        'tableCell': 't-background t-font',
        'rowNumberCell': 't-background'
        };

    var options = {
        showRowNumber: true,
        allowHtml: true,
        cssClassNames: cssClassNames,
        width: '100%',
        height: '100%'
        };

    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Date');
    data.addColumn('string', 'Estate type');
    data.addColumn('string', 'Property type');
    data.addColumn('string', 'Transaction category');
    data.addColumn('number', 'Price paid');
    data.addColumn('string', 'PAON');
    data.addColumn('string', 'SAON');
    data.addColumn('string', 'Street');
    data.addColumn('string', 'Town');
    data.addColumn('string', 'County');
    data.addColumn('string', 'Postcode');
    var rows = [];
    transactionData.forEach(function(row) {
        rows.push([
            row.transaction_date,
            _.startCase(row.estate_type.split('/').pop()),
            _.startCase(row.property_type.split('/').pop()),
            _.startCase(row.transaction_category.split('/').pop()),
            parseFloat(row.price_paid),
            _.startCase(_.snakeCase(row.paon)),
            _.startCase(_.snakeCase(row.saon)),
            _.startCase(_.snakeCase(row.street)),
            _.startCase(_.snakeCase(row.town)),
            _.startCase(_.snakeCase(row.county)),
            row.postcode
        ])
    });

    data.addRows(rows);

    var table = new google.visualization.Table(document.getElementById('transactions-table'));

    table.draw(data, options);
}

var mapStyle = [{
  'featureType': 'landscape',
  'stylers': [{
    'color': '#fcfcfc'
  }]
}, {
  'featureType': 'poi',
  'stylers': [{
    'visibility': 'on'
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
