/*************************************************
 * GLOBAL STATE
 *************************************************/
let allPlaces = [];
let currentIndex = 0;
let activeEntity = null;
let capturedIndices = [];

/*************************************************
 * MODELS
 *************************************************/
const models = [
  {
    url: './assets/treasure-chest/shake_treasure_chest.glb',
    scale: '0.4 0.4 0.4',
    info: 'Diamond Chest'
  },
  {
    url: './assets/treasure-chest/shake_treasure_chest.glb',
    scale: '0.4 0.4 0.4',
    info: 'Emerald Chest'
  },
  {
    url: './assets/treasure-chest/shake_treasure_chest.glb',
    scale: '0.4 0.4 0.4',
    info: 'Gold Chest'
  },
  {
    url: './assets/treasure-chest/shake_treasure_chest.glb',
    scale: '0.4 0.4 0.4',
    info: 'Silver Chest'
  }
];

/*************************************************
 * ON LOAD
 *************************************************/
window.onload = () => {
  const nextButton = document.querySelector('button[data-action="next"]');
  const respawnButton = document.querySelector('button[data-action="change"]');

  nextButton?.addEventListener('click', (e) => {
    e.preventDefault();
    goToNextItem();
  });

  respawnButton?.addEventListener('click', (e) => {
    e.preventDefault();
    generateAllPlaces();
    showCurrentItem();
  });

  const scene = document.querySelector('a-scene');
  scene.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') tryCapture();
  }, true);

  waitForGPSAndStart();
  startGPSTracking();
  startVisibilityCheck();
};

/*************************************************
 * WAIT FOR GPS LOCK
 *************************************************/
function waitForGPSAndStart() {
  const camera = document.querySelector('[gps-camera]');
  const gps = camera?.components['gps-camera']?.currentCoords;

  if (!gps || !gps.latitude || !gps.longitude) {
    requestAnimationFrame(waitForGPSAndStart);
    return;
  }

  document.getElementById('loading')?.style.setProperty('display', 'none');

  generateAllPlaces();
  showCurrentItem();
}

/*************************************************
 * GPS DEBUG INFO
 *************************************************/
function startGPSTracking() {
  setInterval(() => {
    const camera = document.querySelector('[gps-camera]');
    const gps = camera?.components['gps-camera']?.currentCoords;
    const gpsInfo = document.getElementById('gps-info');

    if (!gpsInfo) return;

    if (gps) {
      gpsInfo.innerHTML =
        `Lat: ${gps.latitude.toFixed(6)}<br>` +
        `Lng: ${gps.longitude.toFixed(6)}`;
    } else {
      gpsInfo.innerHTML = 'GPS: waiting...';
    }
  }, 500);
}

/*************************************************
 * VISIBILITY CHECK
 *************************************************/
function startVisibilityCheck() {
  setInterval(() => {
    if (!activeEntity) return;

    const camera = document.querySelector('[gps-camera]');
    const gps = camera?.components['gps-camera']?.currentCoords;
    if (!gps) return;

    const place = allPlaces[currentIndex];
    const distance = getDistanceMeters(
      gps.latitude,
      gps.longitude,
      place.location.lat,
      place.location.lng
    );

    activeEntity.setAttribute(
      'visible',
      distance <= 10 ? 'true' : 'false'
    );
  }, 500);
}

/*************************************************
 * GENERATE PLACES
 *************************************************/
function generateAllPlaces() {
  const camera = document.querySelector('[gps-camera]');
  const gps = camera.components['gps-camera'].currentCoords;

  allPlaces = models.map((_, index) =>
    generatePlace(gps.latitude, gps.longitude, index)
  );

  currentIndex = 0;
  capturedIndices = [];
  updateStatus();
}

/*************************************************
 * PLACE GENERATION (5–8m radius)
 *************************************************/
function generatePlace(lat, lng, index) {
  const distance = 5 + Math.random() * 3; // 5–8 meters
  const angle = index * 90 + Math.random() * 20;

  const pos = offsetLatLng(lat, lng, distance, angle);

  return {
    location: {
      lat: pos.lat,
      lng: pos.lng
    }
  };
}

/*************************************************
 * OFFSET LAT/LNG BY METERS
 *************************************************/
function offsetLatLng(lat, lng, meters, bearingDeg) {
  const R = 6378137;
  const brng = bearingDeg * Math.PI / 180;

  return {
    lat: lat + (meters * Math.cos(brng)) / R * (180 / Math.PI),
    lng: lng + (meters * Math.sin(brng)) / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI)
  };
}

/*************************************************
 * SHOW CURRENT ITEM
 *************************************************/
function showCurrentItem() {
  if (activeEntity?.parentNode) {
    activeEntity.parentNode.removeChild(activeEntity);
    activeEntity = null;
  }

  while (capturedIndices.includes(currentIndex)) {
    currentIndex = (currentIndex + 1) % models.length;
  }

  if (capturedIndices.length === models.length) {
    document.querySelector('.instructions').innerText = '🎊 All items captured!';
    return;
  }

  const scene = document.querySelector('a-scene');
  const entity = document.createElement('a-entity');

  const place = allPlaces[currentIndex];
  const model = models[currentIndex];

  entity.setAttribute(
    'gps-entity-place',
    `latitude: ${place.location.lat}; longitude: ${place.location.lng};`
  );
  entity.setAttribute('gltf-model', model.url);
  entity.setAttribute('scale', model.scale);
  entity.setAttribute('rotation', model.rotation);
  entity.setAttribute('visible', 'false');

  scene.appendChild(entity);
  activeEntity = entity;

  updateStatus();
}

/*************************************************
 * NEXT ITEM
 *************************************************/
function goToNextItem() {
  currentIndex = (currentIndex + 1) % models.length;
  showCurrentItem();
}

/*************************************************
 * CAPTURE LOGIC
 *************************************************/
function tryCapture() {
  if (!activeEntity) return;

  const camera = document.querySelector('[gps-camera]');
  const gps = camera.components['gps-camera'].currentCoords;
  const place = allPlaces[currentIndex];

  const distance = getDistanceMeters(
    gps.latitude,
    gps.longitude,
    place.location.lat,
    place.location.lng
  );

  if (distance <= 8) {
    capturedIndices.push(currentIndex);
    activeEntity.remove();
    activeEntity = null;

    alert(`🎉 Captured ${models[currentIndex].info}!`);
    goToNextItem();
  } else {
    alert(`📍 ${models[currentIndex].info} is ${Math.round(distance)}m away`);
  }
}

/*************************************************
 * UI STATUS
 *************************************************/
function updateStatus() {
  const label = document.querySelector('.instructions');
  const remaining = models.length - capturedIndices.length;
  label.innerText = `${models[currentIndex].info} | Remaining: ${remaining}`;
}

/*************************************************
 * DISTANCE CALCULATION
 *************************************************/
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
