const config = require('./config.js');
const fetch = require('node-fetch');
const {getGeoJson} = require('./data-converter.js');

const JSON_URL = "https://api-v3.mbta.com/facilities?filter%5Btype%5D=PARKING_AREA&page%5Blimit%5D=5000&include=stop";

// Based on https://httptoolkit.tech/blog/bundling-remote-scripts-with-webpack/
module.exports = function() {
    return fetch(JSON_URL, {headers: new fetch.Headers(config.commonHeader)})
        .then((response) => {
            if (!response.ok) {
                console.error(response);
                throw new Error('Could not download ' + JSON_URL);
            }
            return response.json();
        })
        .then(getGeoJson)
        .then((data) => ({code: JSON.stringify(data), cacheable: true}));
};
