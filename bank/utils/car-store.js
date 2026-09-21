// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const auctionDataPath = path.join(dataDir, 'auction.json');
const harrajDataPath = path.join(dataDir, 'harraj.json');

function readJSON(filePath, defaultVal) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch { return defaultVal; }
}
function writeJSON(filePath, data) {
  try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8'); } catch {}
}

function getAuction() {
  const data = readJSON(auctionDataPath, { active: false, cars: [], bids: {}, startedAt: null, messageId: null, channelId: null });
  if (data.active && data.startedAt) {
    const cfg = (() => { try { return JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../config/cars-config.json'), 'utf8')); } catch { return {}; } })();
    const auctionTime = cfg.auction?.auctionTime || 720000;
    if (Date.now() - data.startedAt > auctionTime) {
      data.active = false;
      writeJSON(auctionDataPath, data);
    }
  }
  return data;
}
function saveAuction(data) { writeJSON(auctionDataPath, data); }

function getHarraj() { return readJSON(harrajDataPath, []); }
function saveHarraj(data) { writeJSON(harrajDataPath, data); }

module.exports = { getAuction, saveAuction, getHarraj, saveHarraj };
