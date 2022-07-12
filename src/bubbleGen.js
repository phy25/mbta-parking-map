const getColorsetHash = function(colorset) {
    return colorset.map(t => (t || '').replace('#', '')).join('-');
};

const getUniqueColorsets = function (allColorsets) {
    let uniqueColorsets = new Map();
    allColorsets.forEach(colorset => {
        uniqueColorsets.set(getColorsetHash(colorset), colorset);
    });
    return [...uniqueColorsets.values()];
};

const bubbleWidth = 100, bubbleHeight = 60, bubbleRadius = 29;

const generateBubble = function (colorset) {
    let canvas = document.createElement('canvas');
    canvas.width = bubbleWidth;
    canvas.height = bubbleHeight;

    let ctx = canvas.getContext('2d');
    // left
    ctx.beginPath();
    ctx.fillStyle = colorset[0];
    ctx.arc(bubbleHeight / 2, bubbleHeight / 2, bubbleRadius, 0.5 * Math.PI, 1.5 * Math.PI);
    ctx.closePath();
    ctx.fill();

    // blocks
    let currentX = bubbleHeight / 2;
    let currentY = bubbleHeight / 2 - bubbleRadius;
    let rectWidth = (bubbleWidth - bubbleHeight) / colorset.length;
    let rectHeight = bubbleRadius * 2;
    for (let i in colorset) {
        ctx.fillStyle = colorset[i];
        ctx.fillRect(currentX, currentY, rectWidth, rectHeight);
        currentX = currentX + rectWidth;
    }

    // right
    ctx.fillStyle = colorset[colorset.length - 1];
    ctx.beginPath();
    ctx.arc(bubbleWidth - bubbleHeight / 2, bubbleHeight / 2, bubbleRadius, 1.5 * Math.PI, 2.5 * Math.PI);
    ctx.closePath();
    ctx.fill();

    console.log(canvas.toDataURL());
}

module.exports = {getUniqueColorsets, generateBubble};
