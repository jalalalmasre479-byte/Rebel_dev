// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const BankUser = require('../models/BankUser');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../config/bank-config.json');
function readConfig() {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading bank-config.json:', error);
    return null;
  }
}
let currentMarketPrices = {};
const marketPricesPath = path.join(__dirname, '../data/marketPrices.json');
function loadMarketPrices() {
  try {
    const data = fs.readFileSync(marketPricesPath, 'utf8');
    currentMarketPrices = JSON.parse(data);
  } catch (err) {
    console.error('Error loading market prices, initializing defaults:', err);
    const config = readConfig(); 
    currentMarketPrices = {};
    if (config && config.material_definitions) {
      for (const matId in config.material_definitions) {
        currentMarketPrices[matId] = {
          buyPrice: config.material_definitions[matId].buyPrice,
          sellPrice: config.material_definitions[matId].sellPrice
        };
      }
    } else {
      console.warn('Could not initialize market prices from config.material_definitions. Using hardcoded defaults.');
      currentMarketPrices = {
        "wood": { "buyPrice": 100, "sellPrice": 80 },
        "brick": { "buyPrice": 150, "sellPrice": 120 },
        "stone": { "buyPrice": 200, "sellPrice": 160 },
        "steel": { "buyPrice": 500, "sellPrice": 400 },
        "iron": { "buyPrice": 300, "sellPrice": 240 },
        "gold": { "buyPrice": 1000, "sellPrice": 800 }
      };
    }
    saveMarketPrices();
  }
}
function saveMarketPrices() {
  try {
    fs.writeFileSync(marketPricesPath, JSON.stringify(currentMarketPrices, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving market prices:', err);
  }
}
function updateMaterialPrices() {
  const config = readConfig(); 
  if (!config || !config.material_definitions) {
    console.error('Cannot update material prices: config or material_definitions is undefined.');
    return;
  }
  const materials = Object.keys(config.material_definitions); 
  const priceChangeFactor = 0.1; 
  for (const material of materials) {
    let buyPrice = currentMarketPrices[material]?.buyPrice || config.material_definitions[material]?.buyPrice || 100; 
    let sellPrice = currentMarketPrices[material]?.sellPrice || config.material_definitions[material]?.sellPrice || 80; 
    let change = buyPrice * priceChangeFactor * (Math.random() * 2 - 1); 
    buyPrice = Math.max(1, Math.round(buyPrice + change)); 
    sellPrice = Math.round(buyPrice * 0.8);
    currentMarketPrices[material] = { buyPrice, sellPrice };
  }
  saveMarketPrices();
  console.log('Market prices updated:', currentMarketPrices);
}
loadMarketPrices();
function startPriceUpdater() {
  if (global.marketPriceInterval) {
    clearInterval(global.marketPriceInterval);
  }
  global.marketPriceInterval = setInterval(updateMaterialPrices, 3 * 60 * 1000); 
  console.log('Market price updater started, updating every 3 minutes.');
}
function getMaterialPrices(material) {
  return currentMarketPrices[material];
}
function formatMoney(amount) {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const units = [
    { value: 1e100, suffix: 'C' },
    { value: 1e99, suffix: 'DTg' },
    { value: 1e96, suffix: 'UTg' },
    { value: 1e93, suffix: 'Tg' },
    { value: 1e90, suffix: 'NVg' },
    { value: 1e87, suffix: 'OVg' },
    { value: 1e84, suffix: 'SpVg' },
    { value: 1e81, suffix: 'SVg' },
    { value: 1e78, suffix: 'QiVg' },
    { value: 1e75, suffix: 'QaVg' },
    { value: 1e72, suffix: 'TVg' },
    { value: 1e69, suffix: 'DVg' },
    { value: 1e66, suffix: 'UVg' },
    { value: 1e63, suffix: 'Vg' },
    { value: 1e60, suffix: 'Nd' },
    { value: 1e57, suffix: 'Od' },
    { value: 1e54, suffix: 'Sptd' },
    { value: 1e51, suffix: 'Sd' },
    { value: 1e48, suffix: 'Qid' },
    { value: 1e45, suffix: 'Qad' },
    { value: 1e42, suffix: 'Td' },
    { value: 1e39, suffix: 'Dd' },
    { value: 1e36, suffix: 'Ud' },
    { value: 1e33, suffix: 'Dc' },
    { value: 1e30, suffix: 'No' },
    { value: 1e27, suffix: 'Oc' },
    { value: 1e24, suffix: 'Sp' },
    { value: 1e21, suffix: 'Sx' },
    { value: 1e18, suffix: 'Qi' },
    { value: 1e15, suffix: 'Qa' },
    { value: 1e12, suffix: 'T' },
    { value: 1e9, suffix: 'B' },
    { value: 1e6, suffix: 'M' },
    { value: 1e3, suffix: 'K' }
  ];
  for (const unit of units) {
    if (absAmount >= unit.value) {
      const scaledValue = absAmount / unit.value;
      let formattedValue;
      if (scaledValue % 1 === 0) {
        formattedValue = scaledValue.toFixed(0);
      } else {
        formattedValue = scaledValue.toFixed(2).replace(/\.00$/, '');
      }
      return `${sign}$${formattedValue}${unit.suffix}`;
    }
  }
  let formattedSmallAmount;
  if (absAmount % 1 === 0) {
    formattedSmallAmount = absAmount.toFixed(0);
  } else {
    formattedSmallAmount = absAmount.toFixed(2).replace(/\.00$/, '');
  }
  return `${sign}$${formattedSmallAmount}`;
}
function parseAmount(input, userBalance) {
  const normalized = input.toLowerCase().trim();
  if (normalized === 'كامل' || normalized === 'all') {
    return userBalance;
  } else if (normalized === 'نص' || normalized === 'half') {
    return Math.floor(userBalance / 2);
  } else if (normalized === 'ربع' || normalized === 'quarter') {
    return Math.floor(userBalance / 4);
  }
  const num = parseInt(input.replace(/[,\s]/g, ''));
  return isNaN(num) ? null : num;
}
async function getUser(userId, guildId) {
  let user = await BankUser.findOne({ userId, guildId });
  const config = readConfig(); 
  if (!user) {
    user = new BankUser({
      userId,
      guildId,
      balance: config.economy.startingBalance
    });
    await user.save();
  }
  return user;
}
function checkCooldown(user, command) {
  const config = readConfig(); 
  if (!config || !config.cooldowns) {
    console.error('Config or config.cooldowns is undefined in checkCooldown.');
    return { ready: true };
  }
  const cooldownTime = config.cooldowns[command];
  if (!cooldownTime) return { ready: true };
  const lastUsed = user.cooldowns[command];
  if (!lastUsed) return { ready: true };
  const now = Date.now();
  const diff = now - lastUsed.getTime();
  if (diff < cooldownTime) {
    const remaining = cooldownTime - diff;
    return {
      ready: false,
      remaining: remaining,
      remainingFormatted: formatTime(remaining)
    };
  }
  return { ready: true };
}
async function setCooldown(user, command) {
  user.cooldowns[command] = new Date();
  await user.save();
}
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} يوم${days > 1 ? '' : ''} و ${hours % 24} ساعة`;
  if (hours > 0) return `${hours} ساعة و ${minutes % 60} دقيقة`;
  if (minutes > 0) return `${minutes} دقيقة و ${seconds % 60} ثانية`;
  return `${seconds} ثانية`;
}
function calculateLandIncome(user) {
  const config = readConfig(); 
  if (!config || !config.lands) {
    console.error('Config or config.lands is undefined in calculateLandIncome.');
    return 0;
  }
  let totalIncome = 0;
  const now = Date.now();
  for (const land of user.lands) {
    const landConfig = config.lands[land.landId];
    if (!landConfig) continue;
    const levelData = landConfig.levels[land.level - 1];
    if (!levelData) continue;
    const minutesPassed = Math.floor((now - land.lastCollected.getTime()) / 60000);
    totalIncome += levelData.incomePerMinute * minutesPassed;
  }
  return totalIncome;
}
async function collectLandIncome(user) {
  const income = calculateLandIncome(user);
  if (income > 0) {
    user.balance += income;
    for (const land of user.lands) {
      land.lastCollected = new Date();
    }
    if (income > user.stats.highestEarned) {
      user.stats.highestEarned = income;
    }
    await user.save();
  }
  return income;
}
function hasMaterials(user, required) {
  for (const [material, amount] of Object.entries(required)) {
    if (!user.materials[material] || user.materials[material] < amount) {
      return false;
    }
  }
  return true;
}
function getMaterialName(material) {
  const config = readConfig(); 
  return config?.material_definitions[material]?.name || material; 
}
function getMaterialEmoji(material) {
  const config = readConfig(); 
  return config?.material_definitions[material]?.emoji || '📦'; 
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    random -= (item.weight || 1);
    if (random <= 0) {
      return { item, index: i };
    }
  }
  return { item: items[items.length - 1], index: items.length - 1 };
}
function getExpNeededForNextLevel(level) {
  if (level < 1) return 0; 
  return 100 + (level * 50) + Math.pow(level - 1, 2) * 10;
}
function assignJobByLevel(user, config) {
  if (!config || !config.economy || !config.economy.jobs) {
    console.error('Config or config.economy.jobs is undefined in assignJobByLevel.');
    return;
  }
  const jobs = config.economy.jobs;
  let newJob = user.job;
  let maxLevelJob = 'Unemployed';
  for (const jobName in jobs) {
    if (jobs.hasOwnProperty(jobName)) {
      if (user.level >= jobs[jobName].levelRequired) {
        if (jobs[jobName].levelRequired >= (jobs[maxLevelJob]?.levelRequired || 0)) { 
          maxLevelJob = jobName;
        }
      }
    }
  }
  user.job = maxLevelJob;
}
async function checkLevelUpAndJob(user, config) {
  if (!config || !config.economy || !config.economy.jobs) {
    console.error('Config or config.economy.jobs is undefined in checkLevelUpAndJob.');
    return false;
  }
  let leveledUp = false;
  let xpNeeded = getExpNeededForNextLevel(user.level);
  while (user.experience >= xpNeeded) {
    user.level += 1;
    user.experience -= xpNeeded; 
    assignJobByLevel(user, config); 
    xpNeeded = getExpNeededForNextLevel(user.level); 
    leveledUp = true;
  }
  return leveledUp;
}
module.exports = {
  formatMoney,
  parseAmount,
  getUser,
  checkCooldown,
  setCooldown,
  formatTime,
  calculateLandIncome,
  collectLandIncome,
  hasMaterials,
  getMaterialName,
  getMaterialEmoji,
  randomInt,
  weightedRandom,
  getExpNeededForNextLevel, 
  assignJobByLevel,
  checkLevelUpAndJob,
  getMaterialPrices,
  updateMaterialPrices,
  startPriceUpdater,
  readConfig 
};