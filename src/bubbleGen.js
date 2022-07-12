const getColorsetHash = function(colorset) {
    return colorset.map(t => (t || '').replace('#', '')).join('-');
};

const getUniqueColorsets = (allColorsets) => {
    let uniqueColorsets = new Map();
    allColorsets.forEach(colorset => {
        uniqueColorsets.set(getColorsetHash(colorset), colorset);
    });
    return [...uniqueColorsets.values()];
};

module.exports = {getUniqueColorsets};
