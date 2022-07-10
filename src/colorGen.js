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

module.exports = {getColorInterpolateArray, QUANTILE_STOPS_GTR, QUANTILE_STOPS_RTG};
