// ─── TREASURE HUNT PLACES ────────────────────────────────────────────────────
// Add as many lat/lng locations as you like. One chest will be placed at each.
var PLACES = [
    { name: 'Chest 1', lat: 28.412019, lng: 77.109076 },
    { name: 'Chest 2', lat: 28.412189, lng: 77.109486 },
    { name: 'Chest 3', lat: 28.412360, lng: 77.109199 },
    { name: 'Chest 4', lat: 28.412559, lng: 77.109104 },
    { name: 'Chest 5', lat: 28.409375, lng: 77.109199 },
    { name: 'Chest 6', lat: 28.437229, lng: 77.101551 },
    { name: 'Chest 7', lat: 28.632479, lng: 77.086509 },
    { name: 'Chest 8', lat: 28.681455, lng: 77.054366 },
    { name: 'Chest 9', lat: 28.816395, lng: 84.463890 },
];

var MODEL_URL = './assets/treasure-chest/tc-1.glb';
var MODEL_SCALE = '0.8 0.8 0.8';

// ─── SPIN SPEED (radians per frame) ──────────────────────────────────────────
var SPIN_SPEED = 0.01;

// ─── AFRAME COMPONENT: slow Y-axis spin via THREE.js, blocks all user rotation
AFRAME.registerComponent('chest-spin', {
    init: function () {
        // Block any touch/mouse drag rotating the entity
        var el = this.el;
        el.setAttribute('look-controls', 'enabled: false');

        // Freeze rotation on X and Z — only Y will be animated
        this._origOnTouchStart = null;

        // Prevent click/drag propagation that AR.js might interpret as rotation
        ['mousedown', 'touchstart', 'touchmove', 'touchend'].forEach(function (evt) {
            el.addEventListener(evt, function (e) { e.stopPropagation(); });
        });
    },

    tick: function () {
        // Rotate only on Y axis using the underlying THREE.js object
        this.el.object3D.rotation.y += SPIN_SPEED;
        // Lock X and Z to prevent any drift
        this.el.object3D.rotation.x = 0;
        this.el.object3D.rotation.z = 0;
    }
});

// ─── GPS STATUS ───────────────────────────────────────────────────────────────
function updateGPSStatus(msg) {
    document.getElementById('gps-status').innerText = msg;
}

// ─── RENDER ALL PLACES ────────────────────────────────────────────────────────
var scenePlaced = false; // render only once — avoids reload/crash on watchPosition bursts

function renderPlaces() {
    if (scenePlaced) return;
    scenePlaced = true;

    var scene = document.querySelector('a-scene');

    PLACES.forEach(function (place) {
        var entity = document.createElement('a-entity');

        entity.setAttribute('gps-entity-place',
            'latitude: ' + place.lat + '; longitude: ' + place.lng + ';');

        entity.setAttribute('gltf-model', MODEL_URL);
        entity.setAttribute('scale', MODEL_SCALE);

        // No static rotation attribute — THREE.js spin handles it
        entity.setAttribute('chest-spin', '');

        scene.appendChild(entity);
    });
}

// ─── GPS WATCH ────────────────────────────────────────────────────────────────
window.onload = function () {
    if (!navigator.geolocation) {
        updateGPSStatus('❌ Geolocation not supported by this browser.');
        return;
    }

    updateGPSStatus('📡 Acquiring GPS...');

    var watchId = null;

    function startWatch() {
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

                // Place chests only once — fixed coords from PLACES array
                renderPlaces();
            },
            function (err) {
                if (err.code === 1) {
                    updateGPSStatus('❌ Permission denied – allow location in browser/OS settings.');
                } else if (err.code === 2) {
                    updateGPSStatus('⚠️ Position unavailable – retrying…');
                    setTimeout(startWatch, 3000);
                } else if (err.code === 3) {
                    updateGPSStatus('⏳ GPS timeout – retrying…');
                    setTimeout(startWatch, 1000);
                } else {
                    updateGPSStatus('❌ GPS error: ' + err.message);
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 30000
            }
        );
    }

    startWatch();
};