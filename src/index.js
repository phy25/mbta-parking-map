const NAMESPACE = 'mbtaParkingMap';

if (!location.host.startsWith('localhost')) {
    Sentry.init({
        dsn: "https://9ff52b5dde604a63b3af9d5cb8a83246@o71025.ingest.sentry.io/6563566",
        release: NAMESPACE + "@" + document.body.dataset.version,
        integrations: [new Sentry.BrowserTracing()],
        tracesSampleRate: 0.2,
    });
}

import "./style.css";
import config from './config.js';
import {getColorInterpolateArray, QUANTILE_STOPS_GTR, QUANTILE_STOPS_RTG} from './colorGen';
import {getUniqueColorsets, getColorsetHash, generateBubble, getMapboxImageOption} from './bubbleGen';
import "./privacy.html";

const mbtaParkingJsonDownload = require('./data-mbta-parking.json.js');
const mbtaLinesJsonDownload = require('./data-mbta-lines.json.js');

const detailsMinZoom = 11;

const mapLoading = document.getElementById('map-loading');

if (!(
    'connection' in navigator && (
        navigator.connection.saveData === true
        || ['slow-2g', '2g', '3g'].includes(navigator.connection.effectiveType)
    ))) {
    const placeholderMapUrl = 'https://api.mapbox.com/styles/v1/'
    + config.styleId + '/static/' + config.lnglat[0] + ',' + config.lnglat[1] + ',' + config.zoom
    + '/640x640?logo=false&access_token=' + config.webAccessToken;
    // Static Maps should not be bundled into our assets (for caching)
    mapLoading.style.backgroundImage = 'linear-gradient(90deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.8)), url(\'' + placeholderMapUrl + '\')';
    mapLoading.style.backgroundColor = 'transparent';
} else {
    console.log("Detected slow network, not loading placeholder image");
}

window.addEventListener('DOMContentLoaded', function() {
    mapboxgl.accessToken = config.webAccessToken;
    const map = new mapboxgl.Map({
        container: 'map', // container ID
        style: 'mapbox://styles/'+config.styleId+'?optimize=true', // style URL
        center: config.lnglat, // starting position [lng, lat]
        zoom: config.zoom, // starting zoom
        minZoom: 6,
        logoPosition: 'bottom-right',
        trackResize: false,
        // customAttribution: 'Data from MassDOT',
    });
    window.map = map;

    const adjustMapPadding = function(){
        const container = document.getElementById('panel-container');
        const panel = document.getElementById('panel');
        let paddingObject = {'left': 0, 'bottom': 0};

        if (container.classList.contains('on')) {
            if (window.innerHeight > window.innerWidth) {
                paddingObject['bottom'] = panel.getBoundingClientRect().height;
            } else {
                paddingObject['left'] = panel.getBoundingClientRect().width;
            }
        }
        // map.easeTo({'padding': paddingObject, 'duration': 400});

        // mapLoading.style.marginLeft = paddingObject['left'] / 2 + 'px';
        // mapLoading.style.marginBottom = paddingObject['bottom'] + 'px';
        document.getElementById('map-container').style.left = paddingObject['left'] + 'px';
        document.getElementById('map-container').style.bottom = paddingObject['bottom'] + 'px';
        map.resize();
    };

    document.getElementById('panel-handle-button').addEventListener('click', function(event) {
        const container = document.getElementById('panel-container');

        if (container.classList.contains('on')) {
            container.classList.remove('on');
            this.title = 'Expand options';
            if (event.isTrusted) {
                localStorage[NAMESPACE + 'Panel'] = 'no';
            }
        } else {
            container.classList.add('on');
            this.title = 'Collapse options';
            if (event.isTrusted) {
                // Prevent onload from grabbing focus
                document.getElementById('panel').focus();
                localStorage[NAMESPACE + 'Panel'] = 'yes';
            }
        }
        adjustMapPadding();
    });

    document.getElementById('map-container').style.display = 'block';

    let shouldOpenPanel = localStorage[NAMESPACE + 'Panel'] == 'yes';
    const SHOW_PANEL_PIXEL_THRESHOLD = 720;

    if (localStorage[NAMESPACE + 'Panel'] === undefined &&
        (window.innerHeight > SHOW_PANEL_PIXEL_THRESHOLD || window.innerWidth > SHOW_PANEL_PIXEL_THRESHOLD)) {
        shouldOpenPanel = true;
    }

    if (shouldOpenPanel) {
        document.getElementById('panel-handle-button').click();
    } else {
        adjustMapPadding();
    }

    // let resizeDebouncer = 0;
    window.addEventListener('resize', function(){
        adjustMapPadding();
        /*
        if (resizeDebouncer) {
            clearTimeout(resizeDebouncer);
        }

        resizeDebouncer = setTimeout(adjustMapPadding, 200);
        */
    });

    window.addEventListener('beforeprint', function() {
        adjustMapPadding();
    });

    // Async load starts
    const mapLoadPromise = new Promise((resolve, reject) => {
        const geolocate_control = new mapboxgl.GeolocateControl();
        map.addControl(geolocate_control);

        const navigation_control = new mapboxgl.NavigationControl();
        map.addControl(navigation_control);

        const scale_control = new mapboxgl.ScaleControl({
            unit: 'imperial'
        });
        map.addControl(scale_control, 'bottom-right');

        if (map.isStyleLoaded()) {
            resolve();
        } else {
            map.on('load', () => {
                resolve();
            });
            map.on('error', (err) => {
                console.error("Mapbox error", err);
                reject(err);
            });
        }
    });


    let geoJson = null, stopsParkingLotCount = {}, stopsWithoutLines = new Map(), stopsIdToLineColors = new Map(),
        linesJson = null, linesIdToStops = {};

    const bubbleLoad = (resolve, reject) => {
        let uniqueColorsets = getUniqueColorsets([...stopsIdToLineColors.values()]);
        uniqueColorsets.forEach(colorset => {
            let colorsetHash = getColorsetHash(colorset);
            let bubbleImage = generateBubble(colorset);
            map.addImage(colorsetHash, bubbleImage, getMapboxImageOption());
        });

        geoJson.features.forEach(f => {
            let stop_id = f.properties.stop_id;
            if (stop_id) {
                f.properties.bubble_image_id = getColorsetHash(stopsIdToLineColors.get(stop_id));
            }
        });

        resolve();
    };

    const parkingDataLoadPromise = new Promise((resolve) => {
        const parkingDownload = fetch(mbtaParkingJsonDownload);
        const linesDownload = fetch(mbtaLinesJsonDownload);
        parkingDownload
            .then(async response => {
                geoJson = await response.json();
                geoJson.features.forEach(f => {
                    let stop_id = f.properties.stop_id;
                    if (stop_id) {
                        stopsParkingLotCount[stop_id] = (stopsParkingLotCount[stop_id] || 0) + 1;
                        stopsWithoutLines.set(stop_id, true);
                    }
                });
            })
            .then(() => linesDownload.then(async response => {
                linesJson = await response.json();
                linesJson.forEach(line => {
                    line.stops.forEach(stop_id => {stopsWithoutLines.delete(stop_id);});
                });

                linesJson.push({
                    id: 'null',
                    name: 'Other services',
                    color: '#000000',
                    textColor: '#FFFFFF',
                    stops: [...stopsWithoutLines.keys()],
                });

                linesJson.forEach(line => {
                    let facilitiesSum = line.stops.reduce((sum, stop_id) => sum + (stopsParkingLotCount[stop_id] || 0), 0);
                    line.facilitiesCount = facilitiesSum;
                    if (facilitiesSum) {
                        linesIdToStops[line.id] = line.stops || [];
                    }

                    line.stops.forEach(stop_id => {
                        if (stopsIdToLineColors.has(stop_id)) {
                            if (stopsIdToLineColors.get(stop_id).indexOf(line.color) === -1) {
                                stopsIdToLineColors.get(stop_id).push(line.color);
                            }
                        } else {
                            stopsIdToLineColors.set(stop_id, [line.color]);
                        }
                    });
                });

                resolve();
            }))
            .then(() => new Promise(bubbleLoad));
    });

    Promise.all([parkingDataLoadPromise, mapLoadPromise])
        .then(function() {
            dataLoaded();
        });

    const paintLayers = function(options) {
        let filteredStops = [];
        options.lines.forEach(line => {
            (linesIdToStops[line] || []).forEach(stopId => {
                if (!filteredStops.includes(stopId)) {
                    filteredStops.push(stopId);
                }
            });
        });

        let layerFilter = ["all", ['in', ['get', 'stop_id'], ["literal", filteredStops]]];
        let layerFilterLambda = (props) => filteredStops.includes(props.stop_id);

        if (!options['include-lt-20-capacity']) {
            layerFilter.push([">=", ['get', 'capacity'], 20]);
            let clonedLayerFilterLambda = layerFilterLambda.bind({});
            layerFilterLambda = (props) => clonedLayerFilterLambda(props) && props.capacity >= 20;
        }
        if (!options['include-hourly-rate']) {
            layerFilter.push(['!', ["to-boolean", ['get', 'has_hourly_rate']]]);
            let clonedLayerFilterLambda = layerFilterLambda.bind({});
            layerFilterLambda = (props) => clonedLayerFilterLambda(props) && !props.has_hourly_rate;
        }

        if (map.getLayer('parking_lots')) {
            map.removeLayer('parking_lots');
        }
        if (map.getLayer('parking_lots_clusters')) {
            map.removeLayer('parking_lots_clusters');
        }
        if (map.getLayer('parking_lots_clusters_count')) {
            map.removeLayer('parking_lots_clusters_count');
        }
        if (map.getSource('parking_lots_clusters')) {
            map.removeSource('parking_lots_clusters');
        }

        map.addSource('parking_lots_clusters', {
            type: 'geojson',
            data: geoJson,
            filter: layerFilter,
            cluster: true,
            clusterRadius: 50,
            clusterProperties: {
                'sum_daily_rate_min': ["+", ["get", "daily_rate_min"]],
                'sum_daily_rate_max': ["+", ["get", "daily_rate_max"]],
                'capacity': ["+", ["get", "capacity"]],
            },
        });

        let colorValueList = [];
        let colorValueKey = false;
        let colorValueKeyClustered = false;
        let colorInterpolateArray = [];
        let colorInterpolateValueLambda = val => Math.round(val);
        let clusterLabelExp = false;
        let sizeValueExp = false;
        let markerLabelExp = [];
        if (options['cluster-color'] == 'daily_rate_max') {
            colorValueKey = 'daily_rate_max';
            colorValueKeyClustered = 'sum_daily_rate_max';
            colorValueList = geoJson.features.filter(f => layerFilterLambda(f.properties))
                .map(f => f.properties.daily_rate_max);
            colorValueList.sort((a,b) => a - b);
            colorInterpolateArray = getColorInterpolateArray(colorValueList, QUANTILE_STOPS_GTR);
            clusterLabelExp = ['concat', '$', ['number-format', [
                'case',
                ['has', 'point_count'], ['round', ['/', ['get', colorValueKeyClustered], ['get', 'point_count']]],
                ['get', colorValueKey]
            ], {}]];
            colorInterpolateValueLambda = val => '$' + Math.round(val);
            markerLabelExp = [
                'concat',
                '$',
                ['get', colorValueKey],
                ['case', ['get', 'has_hourly_rate'], '^', ''],
                ' | ',
                ['get', 'capacity'],
            ];
        }

        if (options['cluster-color'] == 'daily_rate_min') {
            colorValueKey = 'daily_rate_min';
            colorValueKeyClustered = 'sum_daily_rate_min';
            colorValueList = geoJson.features.filter(f => layerFilterLambda(f.properties))
                .map(f => f.properties.daily_rate_min);
            colorValueList.sort((a,b) => a - b);
            colorInterpolateArray = getColorInterpolateArray(colorValueList, QUANTILE_STOPS_GTR);
            clusterLabelExp = ['concat', '$', ['number-format', [
                'case',
                ['has', 'point_count'], ['round', ['/', ['get', colorValueKeyClustered], ['get', 'point_count']]],
                ['get', colorValueKey]
            ], {}]];
            colorInterpolateValueLambda = val => '$' + Math.round(val);
            markerLabelExp = [
                'concat',
                '$',
                ['get', colorValueKey],
                ['case', ['get', 'has_hourly_rate'], '^', ''],
                ' | ',
                ['get', 'capacity'],
            ];
        }

        if (options['cluster-color'] == 'capacity') {
            colorValueKey = 'capacity';
            colorValueKeyClustered = 'capacity';
            colorValueList = geoJson.features.filter(f => layerFilterLambda(f.properties))
                .map(f => f.properties.capacity);
            colorValueList.sort((a,b) => a - b);
            colorInterpolateArray = getColorInterpolateArray(colorValueList, QUANTILE_STOPS_RTG);
            clusterLabelExp = ['concat', ['number-format', [
                'case',
                ['has', 'point_count'], ['get', colorValueKeyClustered],
                ['get', colorValueKey]
            ], {}]];
            markerLabelExp = [
                'concat',
                ['get', 'capacity'],
            ];
        }

        if (options['cluster-size'] == 'capacity') {
            sizeValueExp = [
                "interpolate",
                ["linear"],
                ['get', 'capacity'],
                50, 15,
                2000, 40
            ]
        }

        if (options['cluster-size'] == 'daily_rate_max') {
            sizeValueExp = [
                "interpolate",
                ["linear"],
                [
                    'case',
                    ['has', 'point_count'], ['round', ['/', ['get', 'sum_daily_rate_max'], ['get', 'point_count']]],
                    ['get', 'daily_rate_max']
                ],
                0, 15,
                15, 40
            ]
        }

        if (options['cluster-size'] == 'daily_rate_min') {
            sizeValueExp = [
                "interpolate",
                ["linear"],
                [
                    'case',
                    ['has', 'point_count'], ['round', ['/', ['get', 'sum_daily_rate_min'], ['get', 'point_count']]],
                    ['get', 'daily_rate_min']
                ],
                0, 15,
                8, 40
            ]
        }

        const clusterColorBar = document.getElementById('cluster-color-bar');
        if (colorInterpolateArray.length) {
            // clusterColorBar.style.display = 'flex';
            clusterColorBar.style.backgroundImage = 'linear-gradient(90deg, ' + colorInterpolateArray.filter(s => (s + '').indexOf('#') === 0).join(', ') + ')';
            clusterColorBar.innerHTML = colorInterpolateArray
                .filter(s => (s + '').indexOf('#') !== 0)
                .map(val => '<div>'+colorInterpolateValueLambda(val)+'</div>')
                .join('');
        } else {
            clusterColorBar.style.backgroundImage = 'none';
            clusterColorBar.innerHTML = '';
        }

        document.getElementById('facilities-counter').textContent = colorValueList.length;

        if (colorValueList.length) {
            map.addLayer({
                id: 'parking_lots_clusters',
                type: 'circle',
                source: 'parking_lots_clusters',
                maxzoom: detailsMinZoom,
                paint: {
                    'circle-color': [
                        'case',
                        ['has', 'point_count'], [
                                "interpolate",
                                ["linear"],
                                ['/', ['get', colorValueKeyClustered], ['get', 'point_count']]
                            ].concat(colorInterpolateArray),
                        [
                            "interpolate",
                            ["linear"],
                            ['get', colorValueKey]
                        ].concat(colorInterpolateArray),
                    ],
                    'circle-radius': sizeValueExp,
                }
            });

            map.addLayer({
                id: 'parking_lots_clusters_count',
                type: 'symbol',
                source: 'parking_lots_clusters',
                maxzoom: detailsMinZoom,
                layout: {
                    'text-field': clusterLabelExp,
                    'text-font': ["Roboto Medium", "Arial Unicode MS Regular"],
                    'text-size': 12,
                    'text-allow-overlap': true,
                }
            });

            map.on('mouseenter', 'parking_lots_clusters', () => {
                map.getCanvas().style.cursor = 'pointer';
            });

            map.on('mouseleave', 'parking_lots_clusters', () => {
                map.getCanvas().style.cursor = '';
            });

            map.on('click', 'parking_lots_clusters', (e) => {
                const features = map.queryRenderedFeatures(e.point, {
                    layers: ['parking_lots_clusters']
                });
                const clusterId = features[0].properties.cluster_id;
                if (clusterId) {
                    map.getSource('parking_lots_clusters').getClusterExpansionZoom(
                        clusterId,
                        (err, zoom) => {
                            if (err) return;

                            map.easeTo({
                                center: features[0].geometry.coordinates,
                                zoom: zoom
                            });
                        }
                    );
                } else {
                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: detailsMinZoom,
                    });
                }
            });
        }

        map.addLayer({
            id: 'parking_lots',
            type: 'symbol',
            source: 'parking_lots',
            filter: layerFilter,
            minzoom: detailsMinZoom,
            layout: {
                'icon-image': ['get', 'bubble_image_id'],
                'text-field': markerLabelExp,
                'text-offset': [0, 1.25],
                'text-anchor': 'center',
                'text-size': 15,
                'text-font': ["Roboto Medium", "Arial Unicode MS Regular"],
                'icon-text-fit': 'both',
                'symbol-sort-key': ['-', 0, ['get', 'capacity']]
            },
            paint: {
                'icon-color': '#000',
                'text-color': '#FFF',
            }
        });

        map.on('click', 'parking_lots', (e) => {
            const popup = new mapboxgl.Popup()
                .setLngLat(e.features[0].geometry.coordinates)
                .setMaxWidth('min(30em, 90vw)')
                .setHTML("<p>" + e.features[0].properties.title + "</p>" +
                    "<p><strong>Daily fee</strong>: " + e.features[0].properties.daily_rate +
                    "<br><strong>Capacity</strong>: " + e.features[0].properties.capacity +
                    "<br><strong>Owner</strong>: " + e.features[0].properties.owner +
                    "</p>" +
                    '<p><a href="https://www.mbta.com/stops/'+ e.features[0].properties.stop_id + '" target="_blank">Stop Info</a></p>' +
                    '<p>Navigate: <a href="https://www.google.com/maps/search/?api=1&query=' +
                    encodeURIComponent(e.features[0].geometry.coordinates[1] + ',' + e.features[0].geometry.coordinates[0]) + '" target="_blank">Google Maps</a>, ' +
                    '<a href="https://maps.apple.com/?ll=' +
                    encodeURIComponent(e.features[0].geometry.coordinates[1] + ',' + e.features[0].geometry.coordinates[0]) + '&q=' +
                    encodeURIComponent(e.features[0].properties.title) + '" target="_blank">Apple Maps</a>, ' +
                    '<a href="geo:'+ e.features[0].geometry.coordinates[1] + ',' + e.features[0].geometry.coordinates[0] +'?q=' +
                    encodeURIComponent(e.features[0].properties.title) + '">Geo URI</a></p>')
            .addTo(map);

            popup.getElement().addEventListener('keydown', function(event) {
                if (event.key == 'Escape') {
                    event.preventDefault();
                    popup.remove();
                    map.getCanvas().focus();
                }
            });
        });

        map.on('mouseenter', 'parking_lots', () => {
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'parking_lots', () => {
            map.getCanvas().style.cursor = '';
        });
    };

    const formOptions = document.getElementById('form-options');
    const formOptionsChanged = function() {
        let formData = new FormData(formOptions);
        let formDataObj = {};
        for (const [key, value] of formData) {
            formDataObj[key] = value;
        }
        formDataObj['lines'] = [...document.getElementById('lines').options].filter(x => x.selected).map(x => x.value);

        paintLayers(formDataObj);
    };
    formOptions.addEventListener('change', formOptionsChanged);

    const dataLoaded = function() {
        map.addSource('parking_lots', {
            'type': 'geojson',
            'data': geoJson
        });

        document.getElementById('lines').innerHTML = linesJson
            .filter(line => linesIdToStops[line.id])
            .map(line => '<option value="' + line.id +'" style="background: ' + line.color +'; color: ' + line.textColor +';" selected>' + line.name + ' (' + line.facilitiesCount + ')</option>')
            .join("\n");

        formOptionsChanged();

        mapLoading.style.display = 'none';
        map.getCanvas().focus();
    };

    document.getElementById('panel').addEventListener('keydown', function(event) {
        if (event.key == 'Escape') {
            event.preventDefault();
            document.getElementById('panel-handle-button').click();
            map.getCanvas().focus();
        }
    });

    document.getElementById('lines-select-all').addEventListener('click', function(event) {
        event.preventDefault();
        Array.from(document.getElementById('lines').getElementsByTagName('option'))
            .forEach(elem => {elem.selected = true});

        document.getElementById('lines').focus();
        formOptionsChanged();
    });
});