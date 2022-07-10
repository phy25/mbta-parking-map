const rate_exp = /(?<=\$)[\d\.]+/g;
const restricted_exp = /permit|town|sticker/i;
const hourly_exp = /hour|hrs/i;

// https://color.adobe.com/SSA-gradient-color-theme-15656355/
const QUANTILE_STOPS_GTR = [
    [0, "#0DB312"],
    [0.25, "#9CDB16"],
    [0.5, "#FFE000"],
    [0.75, "#E8A00C"],
    [1, "#FF700D"]
];

const QUANTILE_STOPS_RTG = [
    [0, "#FF700D"],
    [0.25, "#E8A00C"],
    [0.5, "#FFE000"],
    [0.75, "#9CDB16"],
    [1, "#0DB312"]
];

const getGeoJson = function(facilitiesResponse) {
    let features_list = facilitiesResponse['data'].map(data => {
        let attributes = data['attributes'];
        let capacity_text = (attributes.properties
                .filter(it => it.name == 'capacity')
                .concat([{value: ''}]))[0].value;
        let owner = attributes.properties
            .filter(it => it.name == 'owner')
            .concat([{value: ''}])[0].value;
        let daily_rate_text = (attributes.properties.filter(it => it.name == 'fee-daily').concat([{value: ''}]))[0].value;
        let daily_rate_parsed = (daily_rate_text.match(rate_exp) || []).map(v => parseFloat(v)).sort((a, b) => a - b);

        if (daily_rate_text.toLowerCase().indexOf('free') >= 0) {
            daily_rate_parsed.unshift(0);
        }

        let daily_rate_max = daily_rate_parsed.length ? ('$' + daily_rate_parsed[daily_rate_parsed.length-1]) : 'N/A';
        let daily_rate_min = daily_rate_parsed.length ? ('$' + daily_rate_parsed[0]) : 'N/A';
        let has_hourly_rate = hourly_exp.test(daily_rate_text);

        if (restricted_exp.test(daily_rate_text) && daily_rate_parsed.filter(rate => rate != 0).length == 0) {
            daily_rate_min = 'Res';
            daily_rate_max = 'Res';
        }

        if (!daily_rate_max.startsWith('$')) {
            // either restricted, or unavailable (empty daily_rate_text)
            return null;
        }

        let daily_rate_min_value = parseFloat(daily_rate_min.slice(1));
        let daily_rate_max_value = parseFloat(daily_rate_max.slice(1));

        return ({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [
                    attributes.longitude, attributes.latitude
                ]
            },
            'properties': {
                'title': attributes.long_name,
                'owner': owner,
                'daily_rate': daily_rate_text,
                'daily_rate_min': daily_rate_min_value,
                'daily_rate_max': daily_rate_max_value,
                'capacity': parseInt(capacity_text),
                // 'marker_text': daily_rate_max + (has_hourly_rate ? '^' : '') + ' | ' + capacity_text,
                'has_hourly_rate': has_hourly_rate,
                'stop_id': data.relationships.stop.data.id,
            }
        });
    }).filter(f => !!f);

    return {
        'type': 'FeatureCollection',
        'features': features_list,
    };
};


const quantile = (sorted, q) => {
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
};

const getColorInterpolateArray = function(sortedValues, quantileStops) {
    let colorInterpolateArray = [];

    if (!sortedValues.length) {
        return colorInterpolateArray;
    }

    if (sortedValues.length > 3) {
        quantileStops.forEach(stop => {
            let stopAbs = quantile(sortedValues, stop[0]);
            if (colorInterpolateArray.length == 0 || stopAbs > colorInterpolateArray[colorInterpolateArray.length-2]) {
                colorInterpolateArray.push(stopAbs);
                colorInterpolateArray.push(stop[1]);
            }
        });
    } else {
        if (sortedValues.length == 3) {
            colorInterpolateArray.push(sortedValues[0]);
            colorInterpolateArray.push(quantileStops[0][1]);

            colorInterpolateArray.push(sortedValues[1]);
            colorInterpolateArray.push(quantileStops[2][1]);

            colorInterpolateArray.push(sortedValues[2]);
            colorInterpolateArray.push(quantileStops[4][1]);
        }
        if (sortedValues.length == 2) {
            colorInterpolateArray.push(sortedValues[0]);
            colorInterpolateArray.push(quantileStops[0][1]);

            colorInterpolateArray.push(sortedValues[1]);
            colorInterpolateArray.push(quantileStops[4][1]);
        }
        if (sortedValues.length == 1) {
            colorInterpolateArray.push(sortedValues[0]);
            colorInterpolateArray.push(quantileStops[2][1]);
        }
    }

    return colorInterpolateArray;
};

module.exports = {getGeoJson, getColorInterpolateArray, QUANTILE_STOPS_GTR, QUANTILE_STOPS_RTG};
