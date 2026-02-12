var models = [
    {
        url: './assets/treasure-chest/tc-1.glb',
        scale: '0.8 0.8 0.8',
        rotation: '0 180 0',
    },
    {
        url: './assets/treasure-chest/tc-1.glb',
        scale: '0.8 0.8 0.8',
        rotation: '0 180 0',
    },
    {
        url: './assets/treasure-chest/tc-1.glb',
        scale: '0.8 0.8 0.8',
        rotation: '0 180 0',
    },
];

/**
 * Offset a lat/lng by a given number of meters north and east.
 * Uses the standard WGS-84 approximation:
 *   1 degree latitude  ≈ 111,320 m
 *   1 degree longitude ≈ 111,320 * cos(lat) m
 */
function offsetCoords(lat, lng, metersNorth, metersEast) {
    var earthRadius = 6378137; // WGS-84 radius in metres
    var dLat = metersNorth / earthRadius;
    var dLng = metersEast / (earthRadius * Math.cos(lat * Math.PI / 180));
    return {
        lat: lat + (dLat * 180 / Math.PI),
        lng: lng + (dLng * 180 / Math.PI)
    };
}

function setModel(model, entity) {
    if (model.scale)    entity.setAttribute('scale',    model.scale);
    if (model.rotation) entity.setAttribute('rotation', model.rotation);
    if (model.position) entity.setAttribute('position', model.position);
    entity.setAttribute('gltf-model', model.url); // fixed: was 'glb-model'
}

function renderPlaces(places) {
    var scene = document.querySelector('a-scene');

    // Remove any previously placed entities before re-rendering
    document.querySelectorAll('[gps-entity-place]').forEach(function (el) {
        el.parentNode.removeChild(el);
    });

    // Place all three entities simultaneously at their GPS offsets
    places.forEach(function (place, idx) {
        var entity = document.createElement('a-entity');
        entity.setAttribute(
            'gps-entity-place',
            'latitude: ' + place.location.lat + '; longitude: ' + place.location.lng + ';'
        );
        setModel(models[idx % models.length], entity);
        scene.appendChild(entity);
    });
}

function buildPlacesFromCoords(lat, lng) {
    return [
        {
            name: 'TC-1',
            location: offsetCoords(lat, lng, 5, 0)   // 5 m north
        },
        {
            name: 'TC-2',
            location: offsetCoords(lat, lng, 0, 5)   // 5 m east
        },
        {
            name: 'TC-3',
            location: offsetCoords(lat, lng, 0, -5)  // 5 m west
        },
    ];
}

function updateGPSStatus(msg) {
    document.getElementById('gps-status').innerText = msg;
}

window.onload = function () {
    if (!navigator.geolocation) {
        updateGPSStatus('❌ Geolocation not supported by this browser.');
        return;
    }

    updateGPSStatus('📡 Acquiring GPS...');

    var watchId = null;

    function startWatch() {
        // Clear any existing watch before starting a new one
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
        }

        watchId = navigator.geolocation.watchPosition(
            function (position) {
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;
                var acc = position.coords.accuracy;

                updateGPSStatus(
                    '✅ GPS locked  |  ' +
                    lat.toFixed(6) + ', ' + lng.toFixed(6) +
                    '  (±' + Math.round(acc) + ' m)'
                );

                var places = buildPlacesFromCoords(lat, lng);
                renderPlaces(places);
            },
            function (err) {
                if (err.code === 1) {
                    // Permission denied – no point retrying
                    updateGPSStatus('❌ Permission denied – allow location in browser/OS settings.');
                } else if (err.code === 2) {
                    // Position unavailable – retry after 3s
                    updateGPSStatus('⚠️ Position unavailable – retrying…');
                    setTimeout(startWatch, 3000);
                } else if (err.code === 3) {
                    // Timeout – retry immediately with lower accuracy as fallback
                    updateGPSStatus('⏳ GPS timeout – retrying with network location…');
                    setTimeout(startWatch, 1000);
                } else {
                    updateGPSStatus('❌ GPS error: ' + err.message);
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,   // accept a fix up to 5s old
                timeout: 30000      // wait up to 30s for a fix (cold-start)
            }
        );
    }

    startWatch();
};