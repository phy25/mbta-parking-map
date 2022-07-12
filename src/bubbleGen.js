const getColorsetHash = function(colorset) {
    return 'bubble-' + colorset.map(t => (t || '').replace('#', '')).join('-');
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
    const canvas = document.createElement('canvas');
    canvas.width = bubbleWidth;
    canvas.height = bubbleHeight;

    const ctx = canvas.getContext('2d');
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

    return ctx.getImageData(0, 0, bubbleWidth, bubbleHeight);
}

const bubbleStretchYAdjustment = 4, bubbleContentYBaselineAddition = 10, bubblePaddingX = 20, bubblePaddingY = 12;

const getMapboxImageOption = function(){
    return {
        // radius = 14px *2
        stretchX: [[bubbleHeight / 2, bubbleWidth - bubbleHeight / 2]],
        stretchY: [[bubbleHeight / 2 - bubbleStretchYAdjustment, bubbleHeight / 2 + bubbleStretchYAdjustment]],
        // This part of the image that can contain text ([x1, y1, x2, y2]):
        content: [bubblePaddingX, bubblePaddingY, bubbleWidth - bubblePaddingX, bubbleHeight - bubblePaddingY + bubbleContentYBaselineAddition],
        // 56 rather than 50 to deal with Roboto's hidden padding under baseline
        pixelRatio: 2,
        // sdf: true,
    };
};

module.exports = {getUniqueColorsets, getColorsetHash, generateBubble, getMapboxImageOption};
