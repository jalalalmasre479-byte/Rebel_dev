// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { loadImage } = require('canvas');
const { join, dirname } = require('path');
const { fileURLToPath } = require('url');
const { existsSync } = require('fs');
const assetCache = new Map();
const svgCache = new Map();
async function loadAvatarImage(url) {
  try {
    return await loadImage(url);
  } catch (e) {
    console.error('Failed to load avatar image:', e);
    return null;
  }
}
async function svgToImage(svgString, cacheKey = null) {
  if (cacheKey && svgCache.has(cacheKey)) {
    return svgCache.get(cacheKey);
  }
  const buffer = Buffer.from(svgString);
  const image = await loadImage(buffer);
  if (cacheKey) {
    svgCache.set(cacheKey, image);
  }
  return image;
}
async function renderSVG(ctx, svgString, x, y, width, height, cacheKey = null) {
  const image = await svgToImage(svgString, cacheKey);
  ctx.drawImage(image, x, y, width, height);
}
module.exports = {
  loadAvatarImage,
  svgToImage,
  renderSVG,
};
