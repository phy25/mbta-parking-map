// https://coolors.co/palette/7ddf64-c0df85-deb986-db6c79-ed4d6e
const QUANTILE_STOPS_GTR = [
    [0, "#7DDF64"],
    [0.25, "#C0DF85"],
    [0.5, "#DEB986"],
    [0.75, "#DB6C79"],
    [1, "#ED4D6E"]
];

const QUANTILE_STOPS_RTG = [
    [0, "#ED4D6E"],
    [0.25, "#DB6C79"],
    [0.5, "#DEB986"],
    [0.75, "#C0DF85"],
    [1, "#7DDF64"]
];

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

    let uniqueValues = [];
    sortedValues.reduce((previous, current) => {
        if (current !== previous) {
            uniqueValues.push(current);
        }
        return current;
    }, undefined);

    if (uniqueValues.length > 3) {
        quantileStops.forEach(stop => {
            let stopAbs = quantile(sortedValues, stop[0]);
            if (colorInterpolateArray.length == 0 || stopAbs > colorInterpolateArray[colorInterpolateArray.length-2]) {
                colorInterpolateArray.push(stopAbs);
                colorInterpolateArray.push(stop[1]);
            }
        });
    } else {
        if (uniqueValues.length == 3) {
            colorInterpolateArray.push(uniqueValues[0]);
            colorInterpolateArray.push(quantileStops[0][1]);

            colorInterpolateArray.push(uniqueValues[1]);
            colorInterpolateArray.push(quantileStops[2][1]);

            colorInterpolateArray.push(uniqueValues[2]);
            colorInterpolateArray.push(quantileStops[4][1]);
        }
        if (uniqueValues.length == 2) {
            colorInterpolateArray.push(uniqueValues[0]);
            colorInterpolateArray.push(quantileStops[0][1]);

            colorInterpolateArray.push(uniqueValues[1]);
            colorInterpolateArray.push(quantileStops[4][1]);
        }
        if (uniqueValues.length == 1) {
            colorInterpolateArray.push(uniqueValues[0]);
            colorInterpolateArray.push(quantileStops[2][1]);
        }
    }

    return colorInterpolateArray;
};

module.exports = {getColorInterpolateArray, QUANTILE_STOPS_GTR, QUANTILE_STOPS_RTG};
