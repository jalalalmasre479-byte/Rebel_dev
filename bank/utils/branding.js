// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config/bank-config.json');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch { return {}; }
}

function getServerBranding(guild, CONFIG) {
  const cfg = readConfig();
  const useServerBranding = cfg?.adminSettings?.useServerBranding === true;
  if (useServerBranding && guild) {
    return {
      name: guild.name,
      iconURL: guild.iconURL({ extension: 'png', size: 128, forceStatic: true }) || null,
      enabled: true
    };
  }
  return {
    name: (CONFIG?.text?.serverName || 'Anime Orbit') + ' ' + (CONFIG?.text?.bank || 'Bank'),
    iconURL: null,
    enabled: false
  };
}

async function extractServerColors(guild) {
  try {
    const { loadImage, createCanvas } = require('canvas');
    const iconURL = guild?.iconURL({ extension: 'png', size: 64, forceStatic: true });
    if (!iconURL) return null;

    const img = await loadImage(iconURL);
    const size = 32;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const buckets = {};
    for (let i = 0; i < data.length; i += 4) {
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      const a = data[i + 3];
      if (a < 128) continue; // skip transparent
      const key = `${r},${g},${b}`;
      buckets[key] = (buckets[key] || 0) + 1;
    }
    const sorted = Object.entries(buckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([key]) => {
        const [r, g, b] = key.split(',').map(Number);
        return { r, g, b, hex: `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}` };
      });

    if (sorted.length < 2) return null;
    const brightness = ({ r, g, b }) => 0.299 * r + 0.587 * g + 0.114 * b;
    const bySortedBrightness = [...sorted].sort((a, b) => brightness(a) - brightness(b));

    const bgTop    = bySortedBrightness[0].hex;
    const bgBottom = bySortedBrightness[Math.min(1, bySortedBrightness.length - 1)].hex;
    const border   = sorted[Math.min(2, sorted.length - 1)].hex;
    const text     = bySortedBrightness[bySortedBrightness.length - 1].hex;
    const accent   = sorted[Math.min(1, sorted.length - 1)].hex;
    const textFinal = brightness(bySortedBrightness[bySortedBrightness.length - 1]) < 160
      ? '#FFECEC'
      : bySortedBrightness[bySortedBrightness.length - 1].hex;

    return {
      bgTop,
      bgBottom,
      border,
      text: textFinal,
      textMuted: `${textFinal}99`,
      green: '#4CD964',
      red: '#FF2B2B',
      cardBorder: border,
      iconBg: accent,
      logoBg: accent,
      line: `${accent}44`
    };
  } catch (err) {
    console.error('extractServerColors error:', err);
    return null;
  }
}

async function getActiveColors(guild, CONFIG) {
  const cfg = readConfig();
  const useServerColors = cfg?.adminSettings?.useServerColors === true;
  if (useServerColors && guild) {
    const extracted = await extractServerColors(guild);
    if (extracted) return extracted;
  }
  return CONFIG.colors;
}

module.exports = { getServerBranding, getActiveColors, extractServerColors };
    
