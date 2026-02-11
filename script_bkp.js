// window.onload = () => {
//     const button = document.querySelector('button[data-action="change"]');
//     button.innerText = '﹖';

//     let places = staticLoadPlaces();
//     renderPlaces(places);
// };

// // window.onload = () => {
// //     const button = document.querySelector('button[data-action="change"]');
// //     button.innerText = '﹖';

// //     let places = staticLoadPlaces();
// //     renderPlaces(places);

// //     // ✅ Alert on scene click / tap
// //     const scene = document.querySelector('a-scene');
// //     scene.addEventListener('click', () => {
// //         alert('Scene clicked!');
// //     });
// // };


// function staticLoadPlaces() {
//     return [
//         {
//             name: 'Pokèmon',
//             location: {
//                 lat: 28.412,
//                 lng: 77.108,
//             },
//         },
//     ];
// }

// var models = [
//     {
//         url: './assets/magnemite/scene.gltf',
//         scale: '0.4 0.4 0.4',
//         info: 'Magnemite, Lv. 5, HP 10/10',
//         rotation: '0 180 0',
//     },
//     {
//         url: './assets/articuno/scene.gltf',
//         scale: '0.2 0.2 0.2',
//         rotation: '0 180 0',
//         info: 'Articuno, Lv. 80, HP 100/100',
//     },
//     {
//         url: './assets/dragonite/scene.gltf',
//         scale: '0.08 0.08 0.08',
//         rotation: '0 180 0',
//         info: 'Dragonite, Lv. 99, HP 150/150',
//     },
// ];

// var modelIndex = 0;
// var setModel = function (model, entity) {
//     if (model.scale) {
//         entity.setAttribute('scale', model.scale);
//     }

//     if (model.rotation) {
//         entity.setAttribute('rotation', model.rotation);
//     }

//     if (model.position) {
//         entity.setAttribute('position', model.position);
//     }

//     entity.setAttribute('gltf-model', model.url);

//     const div = document.querySelector('.instructions');
//     div.innerText = model.info;
// };

// // function renderPlaces(places) {
// //     let scene = document.querySelector('a-scene');

// //     places.forEach((place) => {
// //         let latitude = place.location.lat;
// //         let longitude = place.location.lng;

// //         let model = document.createElement('a-entity');
// //         model.setAttribute('gps-entity-place', `latitude: ${latitude}; longitude: ${longitude};`);

// //         setModel(models[modelIndex], model);

// //         model.setAttribute('animation-mixer', '');

// //         document.querySelector('button[data-action="change"]').addEventListener('click', function () {
// //             var entity = document.querySelector('[gps-entity-place]');
// //             modelIndex++;
// //             var newIndex = modelIndex % models.length;
// //             setModel(models[newIndex], entity);
// //         });

// //         scene.appendChild(model);
// //     });
// // }
// function renderPlaces(places) {
//     let scene = document.querySelector('a-scene');

//     places.forEach((place) => {
//         let latitude = place.location.lat;
//         let longitude = place.location.lng;

//         let model = document.createElement('a-entity');
//         model.setAttribute(
//             'gps-entity-place',
//             `latitude: ${latitude}; longitude: ${longitude};`
//         );

//         setModel(models[modelIndex], model);
//         model.setAttribute('animation-mixer', '');

//         // ✅ HUNT / CAPTURE Pokémon on tap
//         model.addEventListener('click', (e) => {
//             e.stopPropagation();

//             alert(`You caught ${models[modelIndex].info}! 🎉`);

//             // 🔥 Remove Pokémon from scene
//             model.parentNode.removeChild(model);
//         });

//         document
//             .querySelector('button[data-action="change"]')
//             .addEventListener('click', function () {
//                 var entity = document.querySelector('[gps-entity-place]');
//                 if (!entity) return;

//                 modelIndex++;
//                 var newIndex = modelIndex % models.length;
//                 setModel(models[newIndex], entity);
//             });

//         scene.appendChild(model);
//     });
// }


/*************************************************
 * GLOBAL STATE
 *************************************************/
let modelIndex = 0;
let activePokemon = null;
let activePlace = null;

/*************************************************
 * ON LOAD
 *************************************************/
window.onload = () => {
    const button = document.querySelector('button[data-action="change"]');
    button.innerText = '﹖';

    const places = staticLoadPlaces();
    renderPlaces(places);

    const scene = document.querySelector('a-scene');

    // 🎯 Capture Pokémon on screen tap
    scene.addEventListener('click', () => {
        if (!activePokemon || !activePlace) {
            alert('No Pokémon nearby!');
            return;
        }

        const camera = document.querySelector('[gps-camera]');
        if (!camera || !camera.components['gps-camera']) {
            alert('GPS not ready');
            return;
        }

        const userLat = camera.components['gps-camera'].currentCoords.latitude;
        const userLng = camera.components['gps-camera'].currentCoords.longitude;

        const pokemonLat = activePlace.location.lat;
        const pokemonLng = activePlace.location.lng;

        const distance = getDistanceMeters(
            userLat,
            userLng,
            pokemonLat,
            pokemonLng
        );

        if (distance <= 20) {
            alert(`🎉 You caught ${models[modelIndex].info} (${Math.round(distance)}m)`);

            // 🔥 Remove Pokémon
            activePokemon.parentNode.removeChild(activePokemon);
            activePokemon = null;
        } else {
            alert(`Too far! 🧭 ${Math.round(distance)}m away`);
        }
    });
};

AFRAME.registerComponent('gps-debug', {
    tick: function () {
        const camera = document.querySelector('[gps-camera]');
        if (!camera || !camera.components['gps-camera']) return;

        const coords = camera.components['gps-camera'].currentCoords;
        if (!coords) return;

        document.getElementById('gps-info').innerHTML =
            `Lat: ${coords.latitude.toFixed(6)}<br>` +
            `Lng: ${coords.longitude.toFixed(6)}`;
    }
});


/*************************************************
 * STATIC PLACES
 *************************************************/
function staticLoadPlaces() {
    return [
        {
            name: 'Pokèmon',
            location: {
                lat: 28.412214,
                lng: 77.109395,
            },
        },
    ];
}

/*************************************************
 * MODELS
 *************************************************/
const models = [
    {
        url: './assets/magnemite/scene.gltf',
        scale: '0.4 0.4 0.4',
        rotation: '0 0 0',
        info: 'Magnemite, Lv. 5, HP 10/10',
    },
    {
        url: './assets/articuno/scene.gltf',
        scale: '0.2 0.2 0.2',
        rotation: '0 0 0',
        info: 'Articuno, Lv. 80, HP 100/100',
    },
    {
        url: './assets/dragonite/scene.gltf',
        scale: '0.08 0.08 0.08',
        rotation: '0 0 0',
        info: 'Dragonite, Lv. 99, HP 150/150',
    },
    {
        url: './assets/treasure-chest/scenes.gltf',
        scale: '0.5 0.5 0.5',
        rotation: '0 0 0',
        info: 'Treasure Chest',
    },
];

/*************************************************
 * APPLY MODEL
 *************************************************/
function setModel(model, entity) {
    entity.setAttribute('gltf-model', model.url);
    entity.setAttribute('scale', model.scale);
    entity.setAttribute('rotation', model.rotation);

    const div = document.querySelector('.instructions');
    if (div) div.innerText = model.info;
}

/*************************************************
 * RENDER PLACES
 *************************************************/
function renderPlaces(places) {
    const scene = document.querySelector('a-scene');

    places.forEach((place) => {
        activePlace = place;

        const model = document.createElement('a-entity');
        model.setAttribute(
            'gps-entity-place',
            `latitude: ${place.location.lat}; longitude: ${place.location.lng};`
        );

        setModel(models[modelIndex], model);
        model.setAttribute('animation-mixer', '');

        activePokemon = model;
        scene.appendChild(model);
    });

    // 🔄 Change Pokémon button
    document.querySelector('button[data-action="change"]')
        .addEventListener('click', () => {
            if (!activePokemon) return;

            modelIndex = (modelIndex + 1) % models.length;
            setModel(models[modelIndex], activePokemon);
        });
}

/*************************************************
 * DISTANCE CALCULATION (METERS)
 *************************************************/
function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius (m)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
