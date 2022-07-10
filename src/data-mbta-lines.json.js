const config = require('./config.js');
const fetch = require('node-fetch');
const {getGeoJson} = require('./converter.js');
const Bottleneck = require("bottleneck/es5");

const ROUTES_TYPE_LIST = [0, 1, 2];

const API_KEY = process.env.MBTA_API_KEY ? ('api_key=' + process.env.MBTA_API_KEY) : '';

const limiter = new Bottleneck({
    minTime: API_KEY ? 100 : 3100,
    maxConcurrent: 3,
});

const getRoutesUrl = (routesList) => "https://api-v3.mbta.com/routes?"+ API_KEY +"&page%5Blimit%5D=100&filter%5Btype%5D=" + encodeURIComponent(routesList.join(','));
const getStopsUrl = (route) => "https://api-v3.mbta.com/stops?"+ API_KEY +"&filter%5Broute%5D=" + encodeURIComponent(route);

// Based on https://httptoolkit.tech/blog/bundling-remote-scripts-with-webpack/
module.exports = function() {
    const routesUrl = getRoutesUrl(ROUTES_TYPE_LIST);
    return fetch(routesUrl, {headers: new fetch.Headers(config.commonHeader)})
        .then((response) => {
            if (!response.ok) {
                console.error(response);
                throw new Error('Could not download ' + routesUrl);
            }
            return response.json();
        })
        .then(response => {
            return Promise.all(
                response.data.map(route => {
                    let stopsUrl = getStopsUrl(route.id);

                    return limiter.schedule(
                            () => fetch(
                                stopsUrl,
                                {headers: new fetch.Headers(config.commonHeader)}))
                        .then((response) => {
                            console.log(response.headers.get('x-ratelimit-remaining'), limiter.counts());
                            if (!response.ok) {
                                console.error(response);
                                throw new Error('Could not download ' + routesUrl);
                            }
                            return response.json();
                        })
                        .then(stopsData => (
                            {
                                id: route.id,
                                name: route.attributes.long_name,
                                color: '#'+route.attributes.color,
                                textColor: '#'+route.attributes.text_color,
                                stops: stopsData.data.map(stop => (stop.id)),
                            }
                        ))
                        .catch((err) => {console.error(err);return limiter.stop();});
                })
            );
        })
        .then((data) => data.filter(route => route.stops.length))
        /*
        .then(data => {
            // TODO: bottleneck request stops
            let stopsUrl = getStopsUrl(data[0].id);

            return fetch(stopsUrl, {headers: new fetch.Headers({"accept": "application/vnd.api+json"})})
        })
        */
        .then((data) => ({code: JSON.stringify(data), cacheable: true}));
};
