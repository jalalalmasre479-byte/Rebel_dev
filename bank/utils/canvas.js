const path = require('path');
const fs   = require('fs');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

try { GlobalFonts.registerFromPath(path.join(__dirname, '../../img/Fonts/IBMBold.ttf'), 'Cairo-Bold'); } catch {}
try { GlobalFonts.registerFromPath(path.join(__dirname, '../../img/Fonts/IBMBold.ttf'), 'AppFont'); } catch {}
try { GlobalFonts.registerFromPath(path.join(__dirname, '../../img/Fonts/AppleColorEmoji@2x.ttf'), 'AppEmoji'); } catch {}
function fillMixed(ctx, text, x, y, textFont, emojiFont) {
  const emojiRe = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
  const segments = [];
  let last = 0, m;
  while ((m = emojiRe.exec(text)) !== null) {
    if (m.index > last) segments.push({ t: text.slice(last, m.index), emoji: false });
    segments.push({ t: m[0], emoji: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ t: text.slice(last), emoji: false });
  const savedFont = ctx.font;
  const savedAlign = ctx.textAlign;
  let curX = x;
  if (savedAlign === 'center' || savedAlign === 'right') {
    let totalW = 0;
    for (const s of segments) { ctx.font = s.emoji ? emojiFont : textFont; totalW += ctx.measureText(s.t).width; }
    curX = savedAlign === 'center' ? x - totalW / 2 : x - totalW;
  }
  ctx.textAlign = 'left';
  for (const s of segments) {
    ctx.font = s.emoji ? emojiFont : textFont;
    ctx.fillText(s.t, curX, y);
    curX += ctx.measureText(s.t).width;
  }
  ctx.textAlign = savedAlign;
  ctx.font = savedFont;
}

const { formatMoney, getExpNeededForNextLevel, getMaterialPrices } = require('./helpers');
const CONFIG = require('./canvas-config');
const { getGuild, getActiveGuild } = require('./guild-store');

function readBankConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../config/bank-config.json'), 'utf8')); }
  catch { return {}; }
}
function getCarsConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../config/cars-config.json'), 'utf8')); }
  catch { return {}; }
}

function resolveGuild(guildOrId) {
  if (!guildOrId) return getActiveGuild();
  if (typeof guildOrId === 'string') return getGuild(guildOrId) || getActiveGuild();
  if (typeof guildOrId === 'object' && guildOrId.id) return guildOrId;
  return getActiveGuild();
}

async function extractServerColors(guild) {
  try {
    const iconURL = guild?.iconURL({ extension: 'png', size: 64, forceStatic: true });
    if (!iconURL) return null;
    const img  = await loadImage(iconURL);
    const size = 32;
    const cv   = createCanvas(size, size);
    const cx   = cv.getContext('2d');
    cx.drawImage(img, 0, 0, size, size);
    const data    = cx.getImageData(0, 0, size, size).data;
    const buckets = {};
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const r = Math.round(data[i]     / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      const k = `${r},${g},${b}`;
      buckets[k] = (buckets[k] || 0) + 1;
    }
    const sorted = Object.entries(buckets)
      .sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([k]) => {
        const [r, g, b] = k.split(',').map(Number);
        return { r, g, b, hex: `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}` };
      });
    if (sorted.length < 2) return null;
    const luma      = ({ r, g, b }) => 0.299*r + 0.587*g + 0.114*b;
    const byLuma    = [...sorted].sort((a, b) => luma(a) - luma(b));
    const bgTop     = byLuma[0].hex;
    const bgBottom  = byLuma[Math.min(1, byLuma.length - 1)].hex;
    const border    = sorted[Math.min(2, sorted.length - 1)].hex;
    const textRaw   = byLuma[byLuma.length - 1];
    const textHex   = luma(textRaw) < 160 ? '#FFECEC' : textRaw.hex;
    const accent    = sorted[Math.min(1, sorted.length - 1)].hex;
    return { bgTop, bgBottom, border, text: textHex, textMuted: `${textHex}99`, green: '#4CD964', red: '#FF2B2B', cardBorder: border, iconBg: accent, logoBg: accent, line: `${accent}44` };
  } catch { return null; }
}

async function getActiveColors(guildOrId) {
  const cfg   = readBankConfig();
  const guild = resolveGuild(guildOrId);
  let base;
  if (cfg?.adminSettings?.useServerColors && guild) {
    const extracted = await extractServerColors(guild);
    base = extracted || CONFIG.colors;
  } else {
    base = CONFIG.colors;
  }
  const overrides = cfg?.adminSettings?.colorOverrides || {};
  if (Object.keys(overrides).length > 0) {
    return { ...base, ...overrides };
  }
  return base;
}

function getActiveBranding(guildOrId) {
  const cfg   = readBankConfig();
  const guild = resolveGuild(guildOrId);
  if (cfg?.adminSettings?.useServerBranding && guild) {
    return {
      name:    guild.name,
      iconURL: guild.iconURL({ extension: 'png', size: 128, forceStatic: true }) || null
    };
  }
  return { name: `${CONFIG.text.serverName} ${CONFIG.text.bank}`, iconURL: null };
}

function roundedRect(ctx, x, y, w, h, r) {
  if (w < 2*r) r = w/2;
  if (h < 2*r) r = h/2;
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

function drawTriangle(ctx, x, y, size, dir, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (dir === 'up') { ctx.moveTo(x, y-size/2); ctx.lineTo(x-size/2, y+size/2); ctx.lineTo(x+size/2, y+size/2); }
  else              { ctx.moveTo(x, y+size/2); ctx.lineTo(x-size/2, y-size/2); ctx.lineTo(x+size/2, y-size/2); }
  ctx.fill();
}

function drawCarDarkBg(ctx, width, height) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#1a1a2e'); g.addColorStop(1, '#16213e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, height*0.7); ctx.lineTo(width, height*0.2); ctx.lineTo(width, 0); ctx.lineTo(0, 0); ctx.closePath();
  const s = ctx.createLinearGradient(0, 0, width, height);
  s.addColorStop(0, 'rgba(255,255,255,0.05)'); s.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = s; ctx.fill(); ctx.restore();
}

async function drawBankHeader(ctx, cfg, COLORS, guildOrId) {
  const branding = getActiveBranding(guildOrId);
  try {
    let logoImg;
    if (branding.iconURL) {
      logoImg = await loadImage(branding.iconURL);
    } else {
      logoImg = await loadImage(path.join(__dirname, CONFIG.images.logo));
    }
    const lx = cfg.header.logo.x, ly = cfg.header.logo.y - cfg.header.logo.size/2, ls = cfg.header.logo.size;
    if (branding.iconURL) {
      ctx.save(); ctx.beginPath(); ctx.arc(lx + ls/2, ly + ls/2, ls/2, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(logoImg, lx, ly, ls, ls); ctx.restore();
    } else {
      ctx.drawImage(logoImg, lx, ly, ls, ls);
    }
  } catch {
    roundedRect(ctx, cfg.header.logo.x, cfg.header.logo.y - cfg.header.logo.size/2, cfg.header.logo.size, cfg.header.logo.size, 8);
    ctx.fillStyle = COLORS.logoBg; ctx.fill();
  }
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const parts      = branding.name.split(' ');
  const firstPart  = parts.slice(0, -1).join(' ') + ' ';
  const lastPart   = parts[parts.length - 1];
  ctx.font = `700 ${cfg.header.text.fontSize}px Arial`;
  ctx.fillStyle = COLORS.textMuted; ctx.fillText(firstPart, cfg.header.text.x, cfg.header.text.y);
  const w1 = ctx.measureText(firstPart).width;
  ctx.font = `800 ${cfg.header.text.fontSize}px Arial`;
  ctx.fillStyle = COLORS.text; ctx.fillText(lastPart, cfg.header.text.x + w1, cfg.header.text.y);
}

function getRarityColor(rarity) {
  const cc = getCarsConfig();
  return (cc.rarityColors || { common:'#9E9E9E', rare:'#2196F3', epic:'#9C27B0', legendary:'#FF9800' })[rarity] || '#9E9E9E';
}
function getRarityLabel(rarity) {
  const cc = getCarsConfig();
  return (cc.rarityLabels || { common:'عادي', rare:'نادر', epic:'ملحمي', legendary:'أسطوري' })[rarity] || rarity;
}

async function createProfileImage(user, discordUser, guildOrId) {
  const cfg    = CONFIG.profile;
  const COLORS = await getActiveColors(guildOrId);
  const width  = cfg.canvas.width, height = cfg.canvas.height;
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');

  roundedRect(ctx, cfg.padding, cfg.padding, width-(cfg.padding*2), height-(cfg.padding*2), cfg.radius);
  ctx.save(); ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, COLORS.bgTop); bg.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, height*0.7); ctx.lineTo(width, height*0.2); ctx.lineTo(width, 0); ctx.lineTo(0, 0); ctx.closePath();
  const shine = ctx.createLinearGradient(0, 0, width, height);
  shine.addColorStop(0, 'rgba(255,255,255,0.1)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine; ctx.fill(); ctx.restore();

  ctx.beginPath(); ctx.moveTo(cfg.padding, cfg.header.lineY); ctx.lineTo(width-cfg.padding, cfg.header.lineY);
  ctx.lineWidth = 1; ctx.strokeStyle = COLORS.line; ctx.stroke();

  await drawBankHeader(ctx, cfg, COLORS, guildOrId);

  ctx.fillStyle = COLORS.text;
  roundedRect(ctx, cfg.header.menu.x, cfg.header.menu.y, cfg.header.menu.width, cfg.header.menu.height, 2); ctx.fill();
  roundedRect(ctx, cfg.header.menu.x, cfg.header.menu.y+cfg.header.menu.gap, cfg.header.menu.width, cfg.header.menu.height, 2); ctx.fill();

  try {
    const avatar = await loadImage(discordUser.displayAvatarURL({ extension:'png', size:128 }));
    ctx.save(); ctx.beginPath(); ctx.arc(cfg.avatar.x, cfg.avatar.y, cfg.avatar.radius, 0, Math.PI*2); ctx.clip();
    ctx.drawImage(avatar, cfg.avatar.x-cfg.avatar.radius, cfg.avatar.y-cfg.avatar.radius, cfg.avatar.radius*2, cfg.avatar.radius*2); ctx.restore();
    ctx.beginPath(); ctx.arc(cfg.avatar.x, cfg.avatar.y, cfg.avatar.radius, 0, Math.PI*2);
    ctx.strokeStyle = COLORS.text; ctx.lineWidth = 3; ctx.stroke();
  } catch {}

  ctx.textAlign = 'center'; ctx.fillStyle = COLORS.text;
  ctx.font = `bold ${cfg.username.fontSize}px AppFont`; ctx.fillText(discordUser.username, cfg.username.x, cfg.username.y);
  ctx.font = `bold ${cfg.level.fontSize}px AppFont`;    ctx.fillText(`Level: ${user.level}`, cfg.level.x, cfg.level.y);
  ctx.font = `${cfg.job.fontSize}px AppFont`;            ctx.fillText(`Job: ${user.job}`, cfg.job.x, cfg.job.y);

  const xpNeeded = getExpNeededForNextLevel(user.level);
  const xpPct    = Math.min(user.experience / xpNeeded, 1);
  ctx.fillStyle = cfg.xpBar.bgColor; roundedRect(ctx, cfg.xpBar.x, cfg.xpBar.y, cfg.xpBar.width, cfg.xpBar.height, cfg.xpBar.radius); ctx.fill();
  ctx.fillStyle = cfg.xpBar.fillColor; roundedRect(ctx, cfg.xpBar.x, cfg.xpBar.y, cfg.xpBar.width*xpPct, cfg.xpBar.height, cfg.xpBar.radius); ctx.fill();
  ctx.font = `bold ${cfg.xpBar.height*0.9}px AppFont`; ctx.fillStyle = COLORS.text;
  ctx.fillText(`${user.experience}/${xpNeeded} XP`, cfg.xpBar.x+cfg.xpBar.width/2, cfg.xpBar.y+cfg.xpBar.height/2+2);

  ctx.font = `bold ${cfg.balance.fontSize}px AppFont`; ctx.fillText(formatMoney(user.balance), cfg.balance.x, cfg.balance.y);

  try { const a = await loadImage(path.join(__dirname, CONFIG.images.arrowUp)); ctx.drawImage(a, cfg.stats.highestEarned.x-70, cfg.stats.highestEarned.y-10, cfg.stats.highestEarned.arrowSize, cfg.stats.highestEarned.arrowSize); } catch {}
  ctx.fillStyle = COLORS.green; ctx.font = `bold ${cfg.stats.highestEarned.fontSize}px AppFont`; ctx.fillText(formatMoney(user.stats?.highestEarned||0), cfg.stats.highestEarned.x, cfg.stats.highestEarned.y);
  try { const a = await loadImage(path.join(__dirname, CONFIG.images.arrowDown)); ctx.drawImage(a, cfg.stats.highestLost.x-70, cfg.stats.highestLost.y-10, cfg.stats.highestLost.arrowSize, cfg.stats.highestLost.arrowSize); } catch {}
  ctx.fillStyle = COLORS.red; ctx.fillText(formatMoney(user.stats?.highestLost||0), cfg.stats.highestLost.x, cfg.stats.highestLost.y);

  ctx.textAlign = 'left';
  try { const v = await loadImage(path.join(__dirname, CONFIG.images.visa)); ctx.drawImage(v, cfg.visa.x, cfg.visa.y, cfg.visa.width, cfg.visa.height); } catch { ctx.fillStyle = COLORS.text; ctx.font = 'bold 14px AppFont'; ctx.fillText('VISA', cfg.visa.x, cfg.visa.y+15); }
  ctx.fillStyle = COLORS.text; ctx.font = `${cfg.visaNumber.fontSize}px monospace`; ctx.fillText(user.visaNumber||'1959864300122737', cfg.visaNumber.x, cfg.visaNumber.y);

  ctx.restore();
  roundedRect(ctx, cfg.padding, cfg.padding, width-(cfg.padding*2), height-(cfg.padding*2), cfg.radius);
  ctx.lineWidth = 12; ctx.strokeStyle = COLORS.border; ctx.stroke();
  return canvas.toBuffer('image/png');
}

async function createMarketImage(user, discordUser, guildOrId) {
  const cfg    = CONFIG.market;
  const COLORS = await getActiveColors(guildOrId);
  const width  = cfg.canvas.width, height = cfg.canvas.height;
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');

  roundedRect(ctx, cfg.padding, cfg.padding, width-(cfg.padding*2), height-(cfg.padding*2), cfg.radius);
  ctx.save(); ctx.clip();
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, COLORS.bgTop); bg.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, height*0.8); ctx.lineTo(width, height*0.3); ctx.lineTo(width, 0); ctx.lineTo(0, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill(); ctx.restore();

  const branding = getActiveBranding(guildOrId);
  try {
    let logoImg = branding.iconURL ? await loadImage(branding.iconURL) : await loadImage(path.join(__dirname, CONFIG.images.logo));
    if (branding.iconURL) {
      ctx.save(); ctx.beginPath(); ctx.arc(cfg.header.logo.x+cfg.header.logo.size/2, cfg.header.logo.y+cfg.header.logo.size/2, cfg.header.logo.size/2, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(logoImg, cfg.header.logo.x, cfg.header.logo.y, cfg.header.logo.size, cfg.header.logo.size); ctx.restore();
    } else {
      ctx.drawImage(logoImg, cfg.header.logo.x, cfg.header.logo.y, cfg.header.logo.size, cfg.header.logo.size);
    }
  } catch {}

  ctx.font = `700 ${cfg.header.fontSize}px Arial`; ctx.textAlign = 'left';
  const nameParts = branding.name.split(' ');
  const p1 = nameParts.slice(0, -1).join(' ') + ' ', p2 = nameParts[nameParts.length-1];
  const w1 = ctx.measureText(p1).width, w2 = ctx.measureText(p2).width;
  const startX = (width/2) - ((w1+w2)/2);
  ctx.fillStyle = COLORS.textMuted; ctx.fillText(p1, startX, cfg.header.y);
  ctx.fillStyle = COLORS.text; ctx.fillText(p2, startX+w1, cfg.header.y);

  const bankConfig = require('../config/bank-config.json');
  const materials  = Object.keys(bankConfig.material_definitions);
  for (let idx = 0; idx < materials.length; idx++) {
    const mat = materials[idx], row = Math.floor(idx/2), col = idx%2;
    const x = cfg.grid.startX + col*(cfg.grid.cardW+cfg.grid.gapX), y = cfg.grid.startY + row*(cfg.grid.cardH+cfg.grid.gapY);
    ctx.strokeStyle = COLORS.cardBorder; ctx.lineWidth = 2; roundedRect(ctx, x, y, cfg.grid.cardW, cfg.grid.cardH, 15); ctx.stroke();
    ctx.fillStyle = COLORS.iconBg; roundedRect(ctx, x+cfg.grid.iconPad, y+10, cfg.grid.iconSize, cfg.grid.iconSize, 10); ctx.fill();
    try { const ic = await loadImage(path.join(__dirname, CONFIG.images.materials[mat])); ctx.drawImage(ic, x+cfg.grid.iconPad+5, y+15, cfg.grid.iconSize-10, cfg.grid.iconSize-10); } catch {}
    ctx.fillStyle = COLORS.text; ctx.font = '700 20px AppFont'; ctx.textAlign = 'center';
    ctx.fillText(bankConfig.material_definitions[mat].name, x+cfg.grid.iconPad+cfg.grid.iconSize/2, y+cfg.grid.iconSize+25);
    const prices = getMaterialPrices(mat), iW = 120, iH = 28, iX = x+100, iG = 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    roundedRect(ctx, iX, y+12, iW, iH, 14); ctx.stroke();
    drawTriangle(ctx, iX+20, y+12+iH/2, 10, 'up', COLORS.green);
    ctx.fillStyle = COLORS.text; ctx.font = 'bold 16px AppFont'; ctx.textAlign = 'left';
    ctx.fillText(formatMoney(prices.buyPrice), iX+35, y+12+iH/2+5);
    roundedRect(ctx, iX, y+12+iH+iG, iW, iH, 14); ctx.stroke();
    drawTriangle(ctx, iX+20, y+12+iH+iG+iH/2, 10, 'down', COLORS.red);
    ctx.fillText(formatMoney(prices.sellPrice), iX+35, y+12+iH+iG+iH/2+5);
  }

  ctx.beginPath(); ctx.moveTo(cfg.sidebar.lineX, 80); ctx.lineTo(cfg.sidebar.lineX, height-80);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke();

  try {
    const _avX = cfg.sidebar.x + 95, _avY = cfg.sidebar.avatar.y, _avR = cfg.sidebar.avatar.radius;
    const av = await loadImage(discordUser.displayAvatarURL({ extension:'png', size:128, forceStatic:true }));
    ctx.save(); ctx.beginPath(); ctx.arc(_avX, _avY, _avR, 0, Math.PI*2); ctx.clip();
    ctx.drawImage(av, _avX-_avR, _avY-_avR, _avR*2, _avR*2); ctx.restore();
    ctx.beginPath(); ctx.arc(_avX, _avY, _avR, 0, Math.PI*2);
    ctx.strokeStyle = COLORS.text; ctx.lineWidth = 3; ctx.stroke();
  } catch {}

  ctx.fillStyle = COLORS.text; ctx.font = `bold ${cfg.sidebar.username.fontSize}px AppFont`; ctx.textAlign = 'center';
  ctx.fillText(discordUser.username, cfg.sidebar.username.x, cfg.sidebar.username.y);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  roundedRect(ctx, cfg.sidebar.x-10, cfg.sidebar.money.y, cfg.sidebar.money.width, cfg.sidebar.money.height, 20); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fill();
  ctx.fillStyle = COLORS.text; ctx.font = 'bold 22px AppFont'; ctx.fillText(formatMoney(user.balance), cfg.sidebar.x+90, cfg.sidebar.money.y+cfg.sidebar.money.height/2+5);
  roundedRect(ctx, cfg.sidebar.x-10, cfg.sidebar.inventory.y, cfg.sidebar.inventory.width, cfg.sidebar.inventory.height, 15);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.stroke();
  ctx.font = '16px AppFont'; ctx.textAlign = 'left';
  for (let i = 0; i < materials.length; i++) {
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`x${user.materials[materials[i]]||0} ${bankConfig.material_definitions[materials[i]].name}`, cfg.sidebar.x+10, cfg.sidebar.inventory.y+20+i*CONFIG.market.sidebar.inventory.lineHeight);
  }

  ctx.restore();
  roundedRect(ctx, cfg.padding, cfg.padding, width-(cfg.padding*2), height-(cfg.padding*2), cfg.radius);
  ctx.lineWidth = 12; ctx.strokeStyle = COLORS.border; ctx.stroke();
  return canvas.toBuffer('image/png');
}

async function createDiceImage(playerRoll, botRoll, result, amount, playerName, playerAvatarURL, guildOrId) {
  const cfg    = CONFIG.dice;
  const COLORS = await getActiveColors(guildOrId);
  const width  = cfg.canvas.width, height = cfg.canvas.height;
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');

  roundedRect(ctx, cfg.padding, cfg.padding, width-(cfg.padding*2), height-(cfg.padding*2), cfg.radius);
  ctx.save(); ctx.clip();
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, COLORS.bgTop); bg.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  ctx.beginPath(); ctx.moveTo(0, height*0.7); ctx.lineTo(width, height*0.2); ctx.lineTo(width, 0); ctx.lineTo(0, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(cfg.padding, cfg.header.lineY); ctx.lineTo(width-cfg.padding, cfg.header.lineY);
  ctx.lineWidth = 1; ctx.strokeStyle = COLORS.line; ctx.stroke();

  await drawBankHeader(ctx, cfg, COLORS, guildOrId);

  ctx.fillStyle = COLORS.text;
  roundedRect(ctx, cfg.header.menu.x, cfg.header.menu.y, cfg.header.menu.width, cfg.header.menu.height, 2); ctx.fill();

  const centerY = height/2 + 30;
  ctx.textAlign = 'center'; ctx.font = `900 ${cfg.vs.fontSize}px Arial`; ctx.fillStyle = COLORS.text;
  ctx.fillText(CONFIG.text.vs, width/2, centerY+15);

  try {
  if (playerAvatarURL) {
      const av = await loadImage(playerAvatarURL);
      ctx.save(); ctx.beginPath(); ctx.arc(cfg.avatar.player.x, centerY, cfg.avatar.player.radius, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(av, cfg.avatar.player.x-cfg.avatar.player.radius, centerY-cfg.avatar.player.radius, cfg.avatar.player.radius*2, cfg.avatar.player.radius*2); ctx.restore();
      ctx.beginPath(); ctx.arc(cfg.avatar.player.x, centerY, cfg.avatar.player.radius, 0, Math.PI*2);
      ctx.strokeStyle = COLORS.text; ctx.lineWidth = 3; ctx.stroke();
    }
  } catch {}

  const branding   = getActiveBranding(guildOrId);
  const guild      = resolveGuild(guildOrId);
  const botLabel   = branding.iconURL ? (guild?.name || CONFIG.text.bank) : CONFIG.text.bank;

  try {
    let botAvImg;
    if (branding.iconURL) {
      botAvImg = await loadImage(branding.iconURL);
    } else {
      botAvImg = await loadImage(path.join(__dirname, CONFIG.images.botAvatar));
    }
    ctx.save(); ctx.beginPath(); ctx.arc(cfg.avatar.bot.x, centerY, cfg.avatar.bot.radius, 0, Math.PI*2); ctx.clip();
    ctx.drawImage(botAvImg, cfg.avatar.bot.x-cfg.avatar.bot.radius, centerY-cfg.avatar.bot.radius, cfg.avatar.bot.radius*2, cfg.avatar.bot.radius*2); ctx.restore();
    ctx.beginPath(); ctx.arc(cfg.avatar.bot.x, centerY, cfg.avatar.bot.radius, 0, Math.PI*2);
    ctx.strokeStyle = COLORS.text; ctx.lineWidth = 3; ctx.stroke();
  } catch {}

  ctx.font = `bold ${cfg.username.fontSize}px AppFont`; ctx.fillStyle = COLORS.text; ctx.textAlign = 'center';
  ctx.fillText(playerName||'Player', cfg.avatar.player.x, centerY+cfg.username.offsetY);
  ctx.fillText(botLabel, cfg.avatar.bot.x, centerY+cfg.username.offsetY);

  try { const d = await loadImage(path.join(__dirname, CONFIG.images.dice[playerRoll])); ctx.drawImage(d, cfg.dicePosition.player.x, centerY+cfg.dicePosition.offsetY, cfg.dicePosition.size, cfg.dicePosition.size); } catch { ctx.font = 'bold 40px AppFont'; ctx.fillText(playerRoll, cfg.dicePosition.player.x+30, centerY+10); }
  try { const d = await loadImage(path.join(__dirname, CONFIG.images.dice[botRoll]));    ctx.drawImage(d, cfg.dicePosition.bot.x,    centerY+cfg.dicePosition.offsetY, cfg.dicePosition.size, cfg.dicePosition.size); } catch { ctx.font = 'bold 40px AppFont'; ctx.fillText(botRoll, cfg.dicePosition.bot.x+30, centerY+10); }

  ctx.font = `bold ${cfg.amount.fontSize}px AppFont`;
  if (result === 'win') {
    ctx.fillStyle = COLORS.green; ctx.fillText(`+${formatMoney(amount)}`, cfg.avatar.player.x, centerY+cfg.amount.offsetY);
    ctx.fillStyle = COLORS.red;   ctx.fillText(`-${formatMoney(amount)}`, cfg.avatar.bot.x,    centerY+cfg.amount.offsetY);
    try { const w = await loadImage(path.join(__dirname, CONFIG.images.emojis.win)), l = await loadImage(path.join(__dirname, CONFIG.images.emojis.lose)); ctx.drawImage(w, cfg.avatar.player.x-cfg.emoji.size/2, centerY+cfg.emoji.offsetY, cfg.emoji.size, cfg.emoji.size); ctx.drawImage(l, cfg.avatar.bot.x-cfg.emoji.size/2, centerY+cfg.emoji.offsetY, cfg.emoji.size, cfg.emoji.size); } catch {}
  } else if (result === 'lose') {
    ctx.fillStyle = COLORS.red;   ctx.fillText(`-${formatMoney(amount)}`, cfg.avatar.player.x, centerY+cfg.amount.offsetY);
    ctx.fillStyle = COLORS.green; ctx.fillText(`+${formatMoney(amount)}`, cfg.avatar.bot.x,    centerY+cfg.amount.offsetY);
    try { const l = await loadImage(path.join(__dirname, CONFIG.images.emojis.lose)), w = await loadImage(path.join(__dirname, CONFIG.images.emojis.win)); ctx.drawImage(l, cfg.avatar.player.x-cfg.emoji.size/2, centerY+cfg.emoji.offsetY, cfg.emoji.size, cfg.emoji.size); ctx.drawImage(w, cfg.avatar.bot.x-cfg.emoji.size/2, centerY+cfg.emoji.offsetY, cfg.emoji.size, cfg.emoji.size); } catch {}
  } else {
    try { const t = await loadImage(path.join(__dirname, CONFIG.images.emojis.tie)); ctx.drawImage(t, cfg.avatar.player.x-cfg.emoji.size/2, centerY+cfg.emoji.offsetY, cfg.emoji.size, cfg.emoji.size); ctx.drawImage(t, cfg.avatar.bot.x-cfg.emoji.size/2, centerY+cfg.emoji.offsetY, cfg.emoji.size, cfg.emoji.size); } catch {}
  }

  ctx.fillStyle = 'rgba(255,255,255,0.8)'; roundedRect(ctx, width/2-cfg.indicator.width/2, height-cfg.indicator.offsetY, cfg.indicator.width, cfg.indicator.height, 3); ctx.fill();
  ctx.restore();
  roundedRect(ctx, cfg.padding, cfg.padding, width-(cfg.padding*2), height-(cfg.padding*2), cfg.radius);
  ctx.lineWidth = 14; ctx.strokeStyle = COLORS.border; ctx.stroke();
  return canvas.toBuffer('image/png');
}

async function createLandImage(user, discordUser, guildOrId) {
  const cfg    = CONFIG.land;
  const COLORS = await getActiveColors(guildOrId);
  const canvas = createCanvas(cfg.canvas.width, cfg.canvas.height);
  const ctx    = canvas.getContext('2d');
  const baseImage = await loadImage(path.join(__dirname, CONFIG.images.landBase));
  ctx.drawImage(baseImage, 0, 0, cfg.canvas.width, cfg.canvas.height);
  const bankConfig = require('../config/bank-config.json');
  let totalIncome = 0, totalAssets = user.balance;
  for (const land of user.lands) { const lc = bankConfig.lands[land.landId]; if (lc) { const lv = lc.levels[land.level-1]; if (lv) { totalIncome += lv.incomePerMinute; totalAssets += lv.price||0; } } }
  const { x:cx, y:cy, width:cw, height:ch, borderRadius:cr, borderWidth:cbw, outerShadowOffset:co } = cfg.card;
  ctx.fillStyle = COLORS.bgBottom; roundedRect(ctx, cx, cy, cw, ch, cr); ctx.fill();
  ctx.strokeStyle = COLORS.border; ctx.lineWidth = cbw; roundedRect(ctx, cx, cy, cw, ch, cr); ctx.stroke();
  ctx.strokeStyle = COLORS.cardBorder; ctx.lineWidth = co*2; roundedRect(ctx, cx+co, cy+co, cw-co*2, ch-co*2, cr-co); ctx.stroke();
  const ax = cx+cfg.card.profileCircle.xOffset, ay = cy+cfg.card.profileCircle.yOffset, ar = cfg.card.profileCircle.radius;
  try { const av = await loadImage(discordUser.displayAvatarURL({ extension:'png', size:128 })); ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI*2); ctx.clip(); ctx.drawImage(av, ax-ar, ay-ar, ar*2, ar*2); ctx.restore(); } catch {}
  ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI*2); ctx.strokeStyle = COLORS.text; ctx.lineWidth = 3; ctx.stroke();
  const ml = cfg.card.menuList, mlX = cx+ml.x, mlY = cy+ml.y, mlW = cw-(ml.x*2);
  let itemY = mlY;
  for (const item of ml.items) {
    let val = '';
    switch (item.key) { case 'balance': val = formatMoney(user.balance); break; case 'assets': val = formatMoney(totalAssets); break; case 'income': val = formatMoney(totalIncome)+(item.suffix||''); break; case 'properties': val = `${user.lands.length}/11`+(item.suffix||''); break; default: val = 'N/A'; }
    ctx.strokeStyle = COLORS.cardBorder; ctx.lineWidth = ml.itemBorderWidth; roundedRect(ctx, mlX, itemY, mlW, ml.itemHeight, ml.itemBorderRadius); ctx.stroke();
    ctx.fillStyle = COLORS.iconBg; ctx.font = `bold ${ml.iconSize}px AppFont`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(item.icon, mlX+ml.itemPaddingLeft+ml.iconOffsetX, itemY+ml.iconOffsetY);
    ctx.fillStyle = COLORS.text; ctx.font = `bold ${ml.textFontSize}px AppFont`; ctx.textAlign = 'left';
    ctx.fillText(val, mlX+ml.itemPaddingLeft+ml.textOffsetX, itemY+ml.itemHeight/2);
    itemY += ml.itemHeight + ml.itemGap;
  }
  for (const land of user.lands) {
    const pos = cfg.buildings[land.landId]; if (!pos) continue;
    const ps = pos.size, ss = ps*cfg.levelSquareRatio, sx = pos.x+ps-ss, sy = pos.y+ps-ss;
    ctx.fillStyle = COLORS.logoBg; ctx.fillRect(sx, sy, ss, ss);
    ctx.strokeStyle = COLORS.text; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, ss, ss);
    ctx.fillStyle = COLORS.text; ctx.font = `bold ${ss*0.5}px AppFont`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(land.level.toString(), sx+ss/2, sy+ss/2);
  }
  return canvas.toBuffer('image/png');
}

async function createTopImage(users, category, client, guildOrId) {
  const cfg    = CONFIG.top;
  const COLORS = await getActiveColors(guildOrId);
  const canvas = createCanvas(cfg.canvas.width, cfg.canvas.height);
  const ctx    = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, cfg.canvas.width, cfg.canvas.height);
  g.addColorStop(0, COLORS.bgTop); g.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cfg.canvas.width, cfg.canvas.height);
  ctx.strokeStyle = COLORS.border; ctx.lineWidth = 8; roundedRect(ctx, cfg.padding, cfg.padding, cfg.canvas.width-(cfg.padding*2), cfg.canvas.height-(cfg.padding*2), cfg.radius); ctx.stroke();
  const titles = { rich:'👑 توب الأغنياء', thieves:'🦹 توب الحرامية', lands:'🏗️ توب الأراضي', investors:'📈 توب المستثمرين', cars:'🚗 توب السيارات' };
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = ctx.shadowOffsetY = 3;
  ctx.fillStyle = COLORS.text; ctx.font = `bold ${cfg.title.fontSize}px AppFont`; ctx.textAlign = 'center';
  fillMixed(ctx, titles[category]||'توب', cfg.canvas.width/2, cfg.title.y, `bold ${cfg.title.fontSize}px AppFont`, `bold ${cfg.title.fontSize}px AppEmoji`);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
  ctx.font = `${cfg.list.fontSize}px AppFont`; ctx.textAlign = 'right';
  let y = cfg.list.startY;
  for (let i = 0; i < Math.min(users.length, 10); i++) {
    const u = users[i]; let du; try { du = await client.users.fetch(u.userId); } catch { du = { username:'Unknown', displayAvatarURL: () => null }; }
    const medal = i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}.`;
    let val;
    switch (category) { case 'rich': val = formatMoney(u.balance); break; case 'thieves': val = formatMoney(u.stats.totalStolen); break; case 'lands': val = `${u.lands.length} أرض`; break; case 'investors': val = formatMoney(u.stats.totalInvested); break; case 'cars': val = `${(u.cars||[]).reduce((s,c)=>s+c.count,0)} سيارة`; break; default: val = formatMoney(u.balance); }
    ctx.fillStyle = i%2===0 ? 'rgba(255,236,236,0.1)' : 'rgba(255,236,236,0.05)'; ctx.fillRect(50, y-40, 800, 56);
    const _avSize = 44, _avX = 58, _avY = y - _avSize + 2;
    try {
      const _topAv = await loadImage(du.displayAvatarURL({ extension:'png', size:64, forceStatic:true }));
      ctx.save(); ctx.beginPath(); ctx.arc(_avX + _avSize/2, _avY + _avSize/2, _avSize/2, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(_topAv, _avX, _avY, _avSize, _avSize); ctx.restore();
    } catch {}
    ctx.fillStyle = COLORS.text; ctx.textAlign = 'right'; fillMixed(ctx, `${medal} ${du.username} - ${val}`, 830, y, `${cfg.list.fontSize}px AppFont`, `${cfg.list.fontSize}px AppEmoji`);
    y += cfg.list.spacing;
  }
  if (!users.length) { ctx.fillStyle = COLORS.textMuted; ctx.font = 'italic 32px AppFont'; ctx.textAlign = 'center'; ctx.fillText('لا توجد بيانات بعد', cfg.canvas.width/2, 380); }
  return canvas.toBuffer('image/png');
}

async function createRouletteImage(resultIndex, rewards, discordUser) {
  const cfg = CONFIG.roulette;
  const canvas = createCanvas(cfg.canvas.width, cfg.canvas.height);
  const ctx    = canvas.getContext('2d');
  const cx = cfg.wheel.x, cy = cfg.wheel.y, r = cfg.wheel.radius;
  ctx.beginPath(); ctx.arc(cx, cy, r+cfg.wheel.borderWidth, 0, Math.PI*2); ctx.fillStyle = cfg.wheel.borderColor; ctx.fill();
  const total = rewards.reduce((s, rw) => s+rw.weight, 0); let sa = 0;
  for (let i = 0; i < rewards.length; i++) {
    const rw = rewards[i], seg = (rw.weight/total)*(Math.PI*2), sc = cfg.segments[i%cfg.segments.length];
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, sa, sa+seg); ctx.closePath(); ctx.fillStyle = sc.color; ctx.fill();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(sa+seg/2); ctx.textAlign = 'right'; ctx.fillStyle = sc.textColor; ctx.font = 'bold 20px AppFont';
    let t = ''; if (rw.type==='money') t = formatMoney(rw.amount); else if (rw.type==='material') t = `${rw.amount} ${rw.material}`; else t = 'لا شيء';
    ctx.fillText(t, r-10, 0); ctx.restore(); sa += seg;
  }
  ctx.beginPath(); ctx.moveTo(cx+r+cfg.pointer.size, cy); ctx.lineTo(cx+r, cy-cfg.pointer.size/2); ctx.lineTo(cx+r, cy+cfg.pointer.size/2); ctx.closePath(); ctx.fillStyle = cfg.pointer.color; ctx.fill();
  if (resultIndex !== -1) {
    const w = rewards[resultIndex]; let t = '';
    if (w.type==='money') t = `فزت بـ ${formatMoney(w.amount)}!`; else if (w.type==='material') t = `فزت بـ ${w.amount} ${w.material}!`; else t = 'لم تفز بأي شيء!';
    ctx.textAlign = 'center'; ctx.fillStyle = cfg.resultText.color; ctx.font = `bold ${cfg.resultText.fontSize}px AppFont`;
    ctx.fillText(t, cfg.resultText.x, cfg.resultText.y+r+50);
  }
  return canvas.toBuffer('image/png');
}

async function createGambleImage(result1, result2, result3, condition, winnings, amount, discordUser, guildName, guildOrId) {
  const cfg    = CONFIG.gamble;
  const COLORS = await getActiveColors(guildOrId);
  const canvas = createCanvas(cfg.canvas.width, cfg.canvas.height);
  const ctx    = canvas.getContext('2d');
  const _gambleBg = ctx.createLinearGradient(0, 0, cfg.canvas.width, cfg.canvas.height);
  _gambleBg.addColorStop(0, COLORS.bgTop); _gambleBg.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = _gambleBg; ctx.fillRect(0, 0, cfg.canvas.width, cfg.canvas.height);
  for (const p of [cfg.spots.pos1, cfg.spots.pos2, cfg.spots.pos3]) {
    ctx.fillStyle = cfg.spots.color; roundedRect(ctx, p.x, p.y, cfg.fruits.size, cfg.fruits.size, cfg.spots.borderRadius); ctx.fill();
    ctx.strokeStyle = cfg.spots.borderColor; ctx.lineWidth = cfg.spots.borderWidth; roundedRect(ctx, p.x, p.y, cfg.fruits.size, cfg.fruits.size, cfg.spots.borderRadius); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = cfg.overlayColor; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(result1, cfg.spots.pos1.x, cfg.spots.pos1.y, cfg.fruits.size, cfg.fruits.size);
  ctx.drawImage(result2, cfg.spots.pos2.x, cfg.spots.pos2.y, cfg.fruits.size, cfg.fruits.size);
  ctx.drawImage(result3, cfg.spots.pos3.x, cfg.spots.pos3.y, cfg.fruits.size, cfg.fruits.size);
  ctx.font = `${cfg.resultText.fontSize}px ${cfg.resultText.fontFamily}`; ctx.fillStyle = cfg.resultText.color; ctx.textAlign = 'center';
  fillMixed(ctx, condition === 'فائز' ? '🏆 قمار رابح' : ' قمار خاسر', cfg.resultText.x, cfg.resultText.y, `bold ${cfg.resultText.fontSize}px AppFont`, `bold ${cfg.resultText.fontSize}px AppEmoji`);
  const av = await loadImage(discordUser.displayAvatarURL({ extension:'png', size:128 }));
  ctx.save(); ctx.beginPath(); ctx.arc(cfg.avatar.x+cfg.avatar.size/2, cfg.avatar.y+cfg.avatar.size/2, cfg.avatar.size/2, 0, Math.PI*2, true);
  ctx.strokeStyle = cfg.avatar.borderColor; ctx.lineWidth = cfg.avatar.borderWidth; ctx.stroke(); ctx.closePath(); ctx.clip();
  ctx.drawImage(av, cfg.avatar.x, cfg.avatar.y, cfg.avatar.size, cfg.avatar.size); ctx.restore();
  ctx.font = `${cfg.bankName.fontSize}px ${cfg.bankName.fontFamily}`; ctx.fillStyle = cfg.bankName.color;
  const _gambleBranding = getActiveBranding(guildOrId);
  ctx.fillText(_gambleBranding.iconURL ? _gambleBranding.name : `${guildName} Bank`, cfg.bankName.x, cfg.bankName.y);
  return canvas.toBuffer('image/png');
}

async function createAuctionImage(auctionCars, bids, guildActor, guildOrId) {
  const width = 900, height = 520;
  const COLORS = await getActiveColors(guildOrId);
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');
  roundedRect(ctx, 10, 10, width-20, height-20, 30); ctx.save(); ctx.clip();
  if (COLORS !== CONFIG.colors) {
    const _bg = ctx.createLinearGradient(0, 0, 0, height); _bg.addColorStop(0, COLORS.bgTop); _bg.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = _bg; ctx.fillRect(0, 0, width, height);
  } else { drawCarDarkBg(ctx, width, height); }

  ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px Cairo-Bold, Arial';
  fillMixed(ctx, '🏎️ مزاد السيارات', width/2, 46, 'bold 24px AppFont', 'bold 24px AppEmoji');
  ctx.beginPath(); ctx.moveTo(40, 62); ctx.lineTo(width-40, 62); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.stroke();

  try {
    const iconURL = guildActor?.displayAvatarURL?.({ extension:'png', size:64, forceStatic:true });
    if (iconURL) {
      const av = await loadImage(iconURL);
      ctx.save(); ctx.beginPath(); ctx.arc(50, 38, 20, 0, Math.PI*2); ctx.clip(); ctx.drawImage(av, 30, 18, 40, 40); ctx.restore();
      ctx.beginPath(); ctx.arc(50, 38, 20, 0, Math.PI*2); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  } catch {}
  ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '13px AppFont';
  ctx.fillText(guildActor?.username || '', 78, 42);

  const cardW = 250, cardH = 360, startX = 50, startY = 90, gap = 25;
  for (let i = 0; i < Math.min(auctionCars.length, 3); i++) {
    const car = auctionCars[i], cx2 = startX+i*(cardW+gap), cy2 = startY, rc = getRarityColor(car.rarity);
    roundedRect(ctx, cx2, cy2, cardW, cardH, 16); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();
    ctx.strokeStyle = rc; ctx.lineWidth = 2; ctx.stroke();
    roundedRect(ctx, cx2+8, cy2+8, 70, 22, 11); ctx.fillStyle = rc; ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 11px AppFont'; ctx.fillText(getRarityLabel(car.rarity), cx2+43, cy2+22);
    try { const ci = await loadImage(path.join(__dirname, car.image)); ctx.drawImage(ci, cx2+25, cy2+38, 200, 120); }
    catch { roundedRect(ctx, cx2+25, cy2+38, 200, 120, 8); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); ctx.font = '40px AppEmoji'; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillText('🚗', cx2+125, cy2+103); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Cairo-Bold, Arial'; ctx.fillText(car.name, cx2+cardW/2, cy2+175);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px AppFont'; ctx.fillText('أقل سعر', cx2+cardW/2, cy2+195);
    ctx.fillStyle = '#4CD964'; ctx.font = 'bold 14px AppFont'; ctx.fillText(formatMoney(car.leastPrice), cx2+cardW/2, cy2+213);
    ctx.beginPath(); ctx.moveTo(cx2+20, cy2+228); ctx.lineTo(cx2+cardW-20, cy2+228); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.stroke();
    const bid = bids && bids[car.id];
    if (bid) {
      try { const ba = await loadImage(bid.avatarURL); ctx.save(); ctx.beginPath(); ctx.arc(cx2+45, cy2+258, 15, 0, Math.PI*2); ctx.clip(); ctx.drawImage(ba, cx2+30, cy2+243, 30, 30); ctx.restore(); ctx.beginPath(); ctx.arc(cx2+45, cy2+258, 15, 0, Math.PI*2); ctx.strokeStyle = rc; ctx.lineWidth = 1.5; ctx.stroke(); } catch {}
      const uname = bid.username.length > 10 ? bid.username.substring(0,10)+'..' : bid.username;
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 12px AppFont'; ctx.fillText(uname, cx2+65, cy2+253);
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px AppFont'; ctx.fillText(formatMoney(bid.amount), cx2+65, cy2+270);
    } else {
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '12px AppFont'; ctx.fillText('لا توجد عروض بعد', cx2+cardW/2, cy2+258);
    }
    roundedRect(ctx, cx2+20, cy2+298, cardW-40, 34, 10); ctx.fillStyle = `${rc}33`; ctx.fill(); ctx.strokeStyle = rc; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = rc; ctx.font = 'bold 12px Cairo-Bold, Arial'; ctx.fillText(`زايد على ${car.name}`, cx2+cardW/2, cy2+318);
  }

  ctx.restore();
  roundedRect(ctx, 10, 10, width-20, height-20, 30); ctx.strokeStyle = 'rgba(255,200,100,0.3)'; ctx.lineWidth = 2; ctx.stroke();
  return canvas.toBuffer('image/jpeg', 92);
}

async function createGarageImage(allCars, userCars, page, totalPages, discordUser, guildOrId) {
  const cols = 3, rows = 3, perPage = cols*rows, cardW = 200, cardH = 210, padX = 40, padY = 100, gap = 20;
  const width = cols*cardW+(cols-1)*gap+padX*2, height = rows*cardH+(rows-1)*gap+padY+80;
  const COLORS = await getActiveColors(guildOrId);
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getCo
  ntext('2d');
  roundedRect(ctx, 10, 10, width-20, height-20, 30); ctx.save(); ctx.clip();
  if (COLORS !== CONFIG.colors) {
    const _bg = ctx.createLinearGradient(0, 0, 0, height); _bg.addColorStop(0, COLORS.bgTop); _bg.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = _bg; ctx.fillRect(0, 0, width, height);
  } else { drawCarDarkBg(ctx, width, height); }

  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 26px Cairo-Bold, Arial';
  fillMixed(ctx, '🚗 كراجي', width/2, 48, 'bold 26px AppFont', 'bold 26px AppEmoji');
  try { const av = await loadImage(discordUser.displayAvatarURL({ extension:'png', size:64, forceStatic:true })); ctx.save(); ctx.beginPath(); ctx.arc(50, 38, 18, 0, Math.PI*2); ctx.clip(); ctx.drawImage(av, 32, 20, 36, 36); ctx.restore(); ctx.beginPath(); ctx.arc(50, 38, 18, 0, Math.PI*2); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke(); } catch {}
  ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '13px AppFont'; ctx.fillText(discordUser.username, 76, 42);
  ctx.beginPath(); ctx.moveTo(40, 62); ctx.lineTo(width-40, 62); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.stroke();

  const pageCars = allCars.slice(page*perPage, (page+1)*perPage);
  for (let i = 0; i < pageCars.length; i++) {
    const car = pageCars[i], col = i%cols, row2 = Math.floor(i/cols), cx2 = padX+col*(cardW+gap), cy2 = padY+row2*(cardH+gap);
    const owned = userCars.find(c => c.carId===car.id), count = owned?owned.count:0, rc = getRarityColor(car.rarity), locked = count===0;
    roundedRect(ctx, cx2, cy2, cardW, cardH, 14); ctx.fillStyle = locked ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.08)'; ctx.fill();
    ctx.strokeStyle = locked ? 'rgba(255,255,255,0.1)' : rc; ctx.lineWidth = locked ? 1 : 2; ctx.stroke();
    try { const ci = await loadImage(path.join(__dirname, car.image)); ctx.save(); if (locked) ctx.globalAlpha = 0.15; ctx.drawImage(ci, cx2+15, cy2+20, 170, 100); ctx.restore(); } catch {}
    if (locked) { ctx.textAlign = 'center'; ctx.font = '28px AppEmoji'; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText('🔒', cx2+cardW/2, cy2+78); }
    ctx.textAlign = 'center'; ctx.fillStyle = locked ? 'rgba(255,255,255,0.25)' : '#fff'; ctx.font = 'bold 13px Cairo-Bold, Arial';
    ctx.fillText(locked ? '???' : car.name, cx2+cardW/2, cy2+136);
    roundedRect(ctx, cx2+cardW/2-28, cy2+147, 56, 18, 9); ctx.fillStyle = locked ? 'rgba(255,255,255,0.1)' : `${rc}55`; ctx.fill();
    ctx.strokeStyle = locked ? 'rgba(255,255,255,0.15)' : rc; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = locked ? 'rgba(255,255,255,0.3)' : rc; ctx.font = '10px AppFont'; ctx.fillText(locked ? '???' : getRarityLabel(car.rarity), cx2+cardW/2, cy2+158);
    ctx.font = 'bold 18px AppFont'; ctx.fillStyle = locked ? 'rgba(255,255,255,0.2)' : '#FFD700'; ctx.fillText(`x${count}`, cx2+cardW/2, cy2+193);
  }

  const rarityStats = {};
  for (const uc of userCars) { const c = allCars.find(x => x.id===uc.carId); if (c) rarityStats[c.rarity] = (rarityStats[c.rarity]||0)+uc.count; }
  const total = userCars.reduce((s, c) => s+c.count, 0);
  const fy = height-52;
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px AppFont';
  const rl = Object.entries(rarityStats).map(([r, c]) => `${getRarityLabel(r)}: ${c}`).join(' | ');
  ctx.fillText(`إجمالي: ${total} | ${rl||'لا توجد سيارات'}`, width/2, fy);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillText(`صفحة ${page+1} / ${totalPages}`, width/2, fy+18);
  ctx.restore();
  roundedRect(ctx, 10, 10, width-20, height-20, 30); ctx.strokeStyle = COLORS.border; ctx.lineWidth = 2; ctx.stroke();
  return canvas.toBuffer('image/jpeg', 90);
}

async function createHarrajImage(listings, allCars, page, totalPages, guildOrId) {
  const width = 800, height = 500;
  const COLORS = await getActiveColors(guildOrId);
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');
  roundedRect(ctx, 10, 10, width-20, height-20, 30); ctx.save(); ctx.clip();
  if (COLORS !== CONFIG.colors) {
    const _bg = ctx.createLinearGradient(0, 0, 0, height); _bg.addColorStop(0, COLORS.bgTop); _bg.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = _bg; ctx.fillRect(0, 0, width, height);
  } else { drawCarDarkBg(ctx, width, height); }
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 24px AppFont'; fillMixed(ctx, '🏪 الحراج', width/2, 46, 'bold 24px AppFont', 'bold 24px AppEmoji');
  ctx.beginPath(); ctx.moveTo(40, 62); ctx.lineTo(width-40, 62); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.stroke();
  if (!listings || !listings.length) {
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '22px Cairo-Bold, Arial'; ctx.fillText('لا توجد سيارات معروضة حالياً', width/2, height/2);
  } else {
    const perPage = 4, pl = listings.slice(page*perPage, (page+1)*perPage), cardH = 90, startY = 80, gap2 = 12;
    for (let i = 0; i < pl.length; i++) {
      const listing = pl[i], car = allCars.find(c => c.id===listing.carId); if (!car) continue;
      const cy2 = startY+i*(cardH+gap2), rc = getRarityColor(car.rarity);
      roundedRect(ctx, 30, cy2, width-60, cardH, 12); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill(); ctx.strokeStyle = rc; ctx.lineWidth = 1.5; ctx.stroke();
      try { const ci = await loadImage(path.join(__dirname, car.image)); ctx.drawImage(ci, 45, cy2+10, 100, 70); } catch { ctx.font = '36px AppEmoji'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillText('🚗', 60, cy2+55); }
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Cairo-Bold, Arial'; ctx.fillText(car.name, 160, cy2+28);
      ctx.fillStyle = rc; ctx.font = '12px AppFont'; ctx.fillText(getRarityLabel(car.rarity), 160, cy2+46);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText(`البائع: ${listing.sellerName}`, 160, cy2+63);
      ctx.textAlign = 'right'; ctx.fillStyle = '#4CD964'; ctx.font = 'bold 17px AppFont'; ctx.fillText(formatMoney(listing.price), width-50, cy2+36);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '11px AppFont'; ctx.fillText(`#${listing.listingId}`, width-50, cy2+56);
    }
  }
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '12px AppFont'; ctx.fillText(`صفحة ${page+1} / ${Math.max(1, totalPages)}`, width/2, height-22);
  ctx.restore();
  roundedRect(ctx, 10, 10, width-20, height-20, 30); ctx.strokeStyle = COLORS.border; ctx.lineWidth = 2; ctx.stroke();
  return canvas.toBuffer('image/jpeg', 90);
}

async function createHejolahImage(gameState, car) {
  const cellSize = 70, cols = 5, rows = 7;
  const width = cols*cellSize+80, height = rows*cellSize+120;
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');
  roundedRect(ctx, 10, 10, width-20, height-20, 20); ctx.save(); ctx.clip();
  drawCarDarkBg(ctx, width, height);

  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Cairo-Bold, Arial';
  ctx.fillText(car.name, width/2, 32);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '13px AppFont';
  fillMixed(ctx, `المسافة: ${gameState.distance||0}م  |  الحياة: ${'❤️'.repeat(gameState.lives||3)}`, width/2, 52, '13px AppFont', '13px AppEmoji');

  const roadX = 40, roadY = 70;
  roundedRect(ctx, roadX, roadY, cols*cellSize, rows*cellSize, 8); ctx.fillStyle = '#2d3436'; ctx.fill();
  ctx.setLineDash([14, 10]);
  for (let lane = 1; lane < cols; lane++) {
    ctx.beginPath(); ctx.moveTo(roadX+lane*cellSize, roadY); ctx.lineTo(roadX+lane*cellSize, roadY+rows*cellSize);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.setLineDash([]);

  const emojiFont = 'AppEmoji';

  if (gameState.grid) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = gameState.grid[r] && gameState.grid[r][c];
        if (cell) {
          ctx.font = `30px ${emojiFont}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(cell, roadX+c*cellSize+cellSize/2, roadY+r*cellSize+cellSize/2);
        }
      }
    }
  }

  const playerRow = rows-1, playerCol = gameState.lane !== undefined ? gameState.lane : 2;
  ctx.font = `32px AppEmoji`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🚗', roadX+playerCol*cellSize+cellSize/2, roadY+playerRow*cellSize+cellSize/2);

  ctx.restore();
  roundedRect(ctx, 10, 10, width-20, height-20, 20); ctx.strokeStyle = 'rgba(255,200,100,0.3)'; ctx.lineWidth = 2; ctx.stroke();
  return canvas.toBuffer('image/jpeg', 90);
}

module.exports = {
  createProfileImage,
  createMarketImage,
  createLandImage,
  createDiceImage,
  createTopImage,
  createRouletteImage,
  createGambleImage,
  loadImage,
  createAuctionImage,
  createGarageImage,
  createHarrajImage,
  createHejolahImage,
  getActiveColors,
  getActiveBranding,
  extractServerColors
};
