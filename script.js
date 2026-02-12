var models = [
    {
        url: './assets/treasure-chest/tc-1.glb',
        scale: '0.8 0.8 0.8',
        rotation: '0 180 0',
    },
    {
        url: './assets/treasure-chest/tc-1.glb',
        scale: '0.8 0.8 0.8',
        rotation: '0 180 0'
    },
    {
        url: './assets/treasure-chest/tc-1.glb',
        scale: '0.8 0.8 0.8',
        rotation: '0 180 0'
    },
];

var modelIndex = 0;

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
    entity.setAttribute('glb-model', model.url);
    // document.getElementById('model-info').innerText = model.info;
}

function renderPlaces(places) {
    var scene = document.querySelector('a-scene');

    document.querySelectorAll('[gps-entity-place]').forEach(function (el) {
        el.parentNode.removeChild(el);
    });

    places.forEach(function (place, idx) {
        var entity = document.createElement('a-entity');
        entity.setAttribute(
            'gps-entity-place',
            'latitude: ' + place.location.lat + '; longitude: ' + place.location.lng + ';'
        );

        // Each place gets a different model in the cycle
        setModel(models[idx % models.length], entity);
        entity.setAttribute('animation-mixer', '');
        scene.appendChild(entity);
    });

    // Change-model button cycles all placed entities together
    document.querySelector('button[data-action="change"]').onclick = function () {
        modelIndex++;
        document.querySelectorAll('[gps-entity-place]').forEach(function (entity, idx) {
            var newIndex = (modelIndex + idx) % models.length;
            setModel(models[newIndex], entity);
        });
    };
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
    document.querySelector('button[data-action="change"]').innerText = '﹖';

    if (!navigator.geolocation) {
        updateGPSStatus('❌ Geolocation not supported by this browser.');
        return;
    }

    updateGPSStatus('📡 Acquiring GPS...');

    // watchPosition fires on first fix and again whenever the user moves,
    // keeping the Pokémon anchored to the correct real-world offsets.
    navigator.geolocation.watchPosition(
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
            var messages = {
                1: '❌ Permission denied – please allow location access.',
                2: '❌ Position unavailable.',
                3: '❌ GPS timeout – retrying…'
            };
            updateGPSStatus(messages[err.code] || '❌ GPS error: ' + err.message);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );
};