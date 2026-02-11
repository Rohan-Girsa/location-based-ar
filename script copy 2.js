/*************************************************
 * AR TREASURE HUNT - FIXED CONSISTENT ORIENTATION
 * WITH REAL-TIME DISTANCE DISPLAY
 *************************************************/

// ─── Global Configuration ────────────────────────────────────────
const VISIBILITY_DISTANCE = 10;   // meters — chest visible within this distance
const CAPTURE_DISTANCE    = 5;    // meters — can capture/open within this distance

// Global state
let allPlaces = [];
let currentIndex = 0;
let activeEntity = null;
let capturedIndices = [];
let sceneEl = null;

const models = ['gold-chest'];
const modelNames = ['Gold Chest'];

// FIXED SINGLE GLB
const TREASURE_CHEST_URL = "./assets/treasure-chest/shake_treasure_chest.glb";
const TREASURE_CHEST_SCALE = [0.4, 0.4, 0.4];
const CHEST_ANIMATION_INDEX = 2;
const CHEST_ANIMATION_START_TIME = 0;
const CHEST_ANIMATION_END_TIME = 4;

// FIXED ORIENTATION COMPONENT
AFRAME.registerComponent('chest-animation', {
  init: function () {
    this.modelLoaded = false;
    this.mixer = null;
    this.chestOpenAction = null;
    this.clock = new THREE.Clock();
    this.isCapturing = false;
    this.lockedPositionZ = -3.2;
    this.model = null;
  },

  tick: function () {
    if (this.mixer && this.clock) {
      const delta = this.clock.getDelta();

      if (this.chestOpenAction && this.chestOpenAction.isRunning() && CHEST_ANIMATION_END_TIME !== null) {
        const currentTime = this.chestOpenAction.time;
        if (currentTime >= CHEST_ANIMATION_END_TIME) {
          this.chestOpenAction.paused = true;
          this.chestOpenAction.time = CHEST_ANIMATION_END_TIME;
        }
      }

      this.mixer.update(delta);
    }

    if (this.model && !this.isCapturing && this.modelLoaded) {
      this.model.rotation.y += 0.003;
    }

    if (this.model && this.isCapturing) {
      this.model.position.z = this.lockedPositionZ;
    }
  },

  playChestAnimation: function () {
    if (!this.modelLoaded || !this.el.sceneEl?.renderer) return;

    console.log("🎬 Opening chest - facing camera");

    this.isCapturing = true;
    this.lockedPositionZ = -3.2;

    if (this.model) {
      const box = new THREE.Box3().setFromObject(this.model);
      const center = box.getCenter(new THREE.Vector3());

      this.model.position.x = -center.x;
      this.model.position.y = -center.y;
      this.model.position.z = -3.2;

      const camera = this.el.sceneEl.camera;
      const worldCameraPos = new THREE.Vector3();
      camera.getWorldPosition(worldCameraPos);

      this.model.lookAt(worldCameraPos);
    }

    const openingEl = document.getElementById('chest-opening');
    if (openingEl) openingEl.style.display = 'block';

    if (this.chestOpenAction && this.mixer) {
      this.chestOpenAction.reset();
      this.chestOpenAction.time = CHEST_ANIMATION_START_TIME;

      const animationClip = this.chestOpenAction.getClip();
      const endTime = CHEST_ANIMATION_END_TIME !== null ? CHEST_ANIMATION_END_TIME : animationClip.duration;
      const effectiveDuration = endTime - CHEST_ANIMATION_START_TIME;

      this.chestOpenAction.play();

      setTimeout(() => {
        this.isCapturing = false;
        if (openingEl) openingEl.style.display = 'none';
        this.completeCapture();
      }, effectiveDuration * 1000 + 300);
    } else {
      setTimeout(() => {
        this.isCapturing = false;
        if (openingEl) openingEl.style.display = 'none';
        this.completeCapture();
      }, 2000);
    }
  },

  completeCapture: function () {
    const messageEl = document.getElementById('captured-message');
    if (messageEl) {
      messageEl.innerHTML = `🎉 ${modelNames[currentIndex]} Captured! 🎉<div style="font-size: 16px; margin-top: 12px; font-weight: 500;">Treasure is now yours!</div>`;
      messageEl.style.display = 'block';

      setTimeout(() => {
        messageEl.style.display = 'none';
        window.completeCapture?.();
      }, 2500);
    }
  },

  onModelLoaded: function (model) {
    this.model = model;
    this.modelLoaded = true;

    model.scale.set(...TREASURE_CHEST_SCALE);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x = -center.x;
    model.position.y = -center.y;
    model.position.z = -3.2;

    model.traverse((child) => {
      if (child.isMesh) child.userData.clickable = true;
    });

    if (model.animations?.length > 0) {
      this.mixer = new THREE.AnimationMixer(model);
      this.chestOpenAction = this.mixer.clipAction(model.animations[CHEST_ANIMATION_INDEX]);
      this.chestOpenAction.setLoop(THREE.LoopOnce);
      this.chestOpenAction.clampWhenFinished = true;
      this.chestOpenAction.time = CHEST_ANIMATION_START_TIME;
      this.chestOpenAction.setEffectiveTimeScale(1);
      this.chestOpenAction.setEffectiveWeight(1);
    }
  }
});

/*************************************************
 * INIT
 *************************************************/
window.onload = () => {
  sceneEl = document.querySelector('a-scene');
  if (!sceneEl) {
    console.error("a-scene not found");
    return;
  }

  sceneEl.addEventListener('click', tryCapture, true);

  waitForGPSAndStart();
  startGPSTracking();
  startVisibilityCheck();
};

window.completeCapture = function () {
  capturedIndices.push(currentIndex);
  if (activeEntity?.parentNode) {
    activeEntity.parentNode.removeChild(activeEntity);
  }
  activeEntity = null;

  updateCapturedList();
  setTimeout(goToNextItem, 1500);
};

/*************************************************
 * CORE FUNCTIONS
 *************************************************/
function waitForGPSAndStart() {
  const camera = document.querySelector('[gps-camera]');
  const gps = camera?.components?.['gps-camera']?.currentCoords;

  if (!gps?.latitude || !gps?.longitude) {
    requestAnimationFrame(waitForGPSAndStart);
    return;
  }

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';

  generateAllPlaces();
  showCurrentItem();
}

function startGPSTracking() {
  setInterval(() => {
    const gps = document.querySelector('[gps-camera]')?.components?.['gps-camera']?.currentCoords;
    const gpsInfo = document.getElementById('gps-info');

    if (gpsInfo && gps) {
      const lat = gps.latitude.toFixed(6);
      const lng = gps.longitude.toFixed(6);
      gpsInfo.innerHTML = `Lat: ${lat}<br>Lng: ${lng}`;

      // Update distance display
      updateDistanceDisplay(gps);
    }
  }, 500);
}

function updateDistanceDisplay(currentGps) {
  const distanceEl = document.getElementById('distance-info');
  if (!distanceEl || !allPlaces[currentIndex] || !currentGps) {
    if (distanceEl) distanceEl.innerHTML = "Distance: —";
    return;
  }

  const place = allPlaces[currentIndex];
  const distance = getDistanceMeters(
    currentGps.latitude,
    currentGps.longitude,
    place.lat,
    place.lng
  );

  let color = '#ff4444'; // red = far
  if (distance <= CAPTURE_DISTANCE) color = '#0f0';      // green = very close
  else if (distance <= VISIBILITY_DISTANCE) color = '#ffcc00'; // yellow = visible

  distanceEl.innerHTML = `Distance: ${Math.round(distance)} m`;
  distanceEl.style.color = color;
}

function startVisibilityCheck() {
  function check() {
    if (!activeEntity) return requestAnimationFrame(check);

    const gps = document.querySelector('[gps-camera]')?.components?.['gps-camera']?.currentCoords;
    if (!gps) return requestAnimationFrame(check);

    const place = allPlaces[currentIndex];
    if (!place) return requestAnimationFrame(check);

    const distance = getDistanceMeters(gps.latitude, gps.longitude, place.lat, place.lng);

    activeEntity.setAttribute('visible', distance <= VISIBILITY_DISTANCE);

    requestAnimationFrame(check);
  }
  check();
}

function generateAllPlaces() {
  const gps = document.querySelector('[gps-camera]')?.components?.['gps-camera']?.currentCoords;
  if (!gps?.latitude || !gps?.longitude) return;

  allPlaces = models.map((_, index) => {
    const distance = 5 + Math.random() * 3;
    const angle = index * 90 + Math.random() * 20;
    const pos = offsetLatLng(gps.latitude, gps.longitude, distance, angle);
    return { lat: pos.lat, lng: pos.lng };
  });

  currentIndex = 0;
  capturedIndices = [];
  updateUI();
}

function showCurrentItem() {
  if (activeEntity?.parentNode) {
    activeEntity.parentNode.removeChild(activeEntity);
  }

  while (capturedIndices.includes(currentIndex)) {
    currentIndex = (currentIndex + 1) % models.length;
  }

  if (capturedIndices.length === models.length) {
    return;
  }

  const entity = document.createElement('a-entity');
  const place = allPlaces[currentIndex];

  entity.setAttribute('gps-entity-place', `latitude: ${place.lat}; longitude: ${place.lng}`);
  entity.setAttribute('gltf-model', `url(${TREASURE_CHEST_URL})`);
  entity.setAttribute('scale', '1 1 1');
  entity.setAttribute('rotation', '0 0 0');
  entity.setAttribute('visible', 'false');

  entity.addEventListener('model-loaded', (e) => {
    entity.components?.['chest-animation']?.onModelLoaded(e.detail.model);
  });

  entity.setAttribute('chest-animation', '');

  sceneEl.appendChild(entity);
  activeEntity = entity;

  updateUI();
}

function tryCapture(event) {
  if (event.target.tagName === 'BUTTON' || !activeEntity) return;

  const gps = document.querySelector('[gps-camera]')?.components?.['gps-camera']?.currentCoords;
  if (!gps) return;

  const place = allPlaces[currentIndex];
  const distance = getDistanceMeters(gps.latitude, gps.longitude, place.lat, place.lng);

  if (distance <= CAPTURE_DISTANCE) {
    activeEntity.components?.['chest-animation']?.playChestAnimation();
  }
}

function goToNextItem() {
  currentIndex = (currentIndex + 1) % models.length;
  showCurrentItem();
}

function updateUI() {
  // No instructions element in current HTML
}

function updateCapturedList() {
  const list = document.getElementById('captured-items');
  const container = document.getElementById('captured-list');
  if (list && container) {
    list.innerHTML = capturedIndices.map(i => `<li>${modelNames[i]}</li>`).join('');
    container.style.display = capturedIndices.length > 0 ? 'block' : 'none';
  }
}

// GPS Helpers
function offsetLatLng(lat, lng, meters, bearingDeg) {
  const R = 6378137;
  const brng = bearingDeg * Math.PI / 180;
  return {
    lat: lat + (meters * Math.cos(brng)) / R * (180 / Math.PI),
    lng: lng + (meters * Math.sin(brng)) / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI)
  };
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}