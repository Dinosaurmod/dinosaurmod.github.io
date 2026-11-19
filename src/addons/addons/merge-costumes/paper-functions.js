const _getLayer = function (layerString) {
    for (const layer of paper.project.layers) {
        if (layer.data && layer.data[layerString]) {
            return layer;
        }
    }
};

const getRaster = function () {
    const layer = _getLayer('isRasterLayer');
    // Generate blank raster
    if (layer.children.length === 0) {
        clearRaster();
    }
    return _getLayer('isRasterLayer').children[0];
};

const rowBlank_ = function (imageData, width, y) {
    for (let x = 0; x < width; ++x) {
        if (imageData.data[(y * width << 2) + (x << 2) + 3] !== 0) return false;
    }
    return true;
};

const columnBlank_ = function (imageData, width, x, top, bottom) {
    for (let y = top; y < bottom; ++y) {
        if (imageData.data[(y * width << 2) + (x << 2) + 3] !== 0) return false;
    }
    return true;
};

/**
 * Get bounds around the contents of a raster, trimming transparent pixels from edges.
 * Adapted from Tim Down's https://gist.github.com/timdown/021d9c8f2aabc7092df564996f5afbbf
 * @param {paper.Raster} raster The raster to get the bounds around
 * @param {paper.Rectangle} [rect] Optionally, an alternative bounding rectangle to limit the check to.
 * @returns {paper.Rectangle} The bounds around the opaque area of the passed raster
 * (or opaque within the passed rectangle)
 */
const getHitBounds = function (raster, rect) {
    const bounds = rect || raster.bounds;
    const width = bounds.width;
    const imageData = raster.getImageData(bounds);
    let top = 0;
    let bottom = imageData.height;
    let left = 0;
    let right = imageData.width;

    while (top < bottom && rowBlank_(imageData, width, top)) ++top;
    while (bottom - 1 > top && rowBlank_(imageData, width, bottom - 1)) --bottom;
    while (left < right && columnBlank_(imageData, width, left, top, bottom)) ++left;
    while (right - 1 > left && columnBlank_(imageData, width, right - 1, top, bottom)) --right;

    // Center an empty bitmap
    if (top === bottom) {
        top = bottom = imageData.height / 2;
    }
    if (left === right) {
        left = right = imageData.width / 2;
    }

    return new paper.Rectangle(left + bounds.left, top + bounds.top, right - left, bottom - top);
};

const trim_ = function (raster) {
    const hitBounds = getHitBounds(raster);
    if (hitBounds.width && hitBounds.height) {
        return raster.getSubRaster(getHitBounds(raster));
    }
    return null;
};

/**
 * @param {boolean} shouldInsert True if the trimmed raster should be added to the active layer.
 * @returns {paper.Raster} raster layer with whitespace trimmed from ends, or null if there is
 * nothing on the raster layer.
 */
const getTrimmedRaster = function (shouldInsert) {
    const trimmedRaster = trim_(getRaster());
    if (!trimmedRaster) return null;
    if (shouldInsert) {
        paper.project.activeLayer.addChild(trimmedRaster);
    } else {
        trimmedRaster.remove();
    }
    return trimmedRaster;
};

/**
 * @param {boolean} includeGuides True if guide layer items like the bounding box should
 *     be included in the returned items.
 * @return {Array<paper.item>} all top-level (direct descendants of a paper.Layer) items
 */
const getAllRootItems = function (includeGuides) {
    includeGuides = includeGuides || false;
    const allItems = [];
        for (const layer of paper.project.layers) {
            for (const child of layer.children) {
                // don't give guides back
                if (!includeGuides && child.guide) {
                    continue;
                }
            allItems.push(child);
        }
    }
    return allItems;
};

const onUpdateImage = function () {
    const tool = paper.tool;

    if (typeof tool.onUpdateImage === "function") {
        tool.onUpdateImage();
    }
}

export {
    _getLayer,
    getRaster,
    rowBlank_,
    columnBlank_,
    getHitBounds,
    trim_,
    getTrimmedRaster,
    getAllRootItems,
    onUpdateImage
}