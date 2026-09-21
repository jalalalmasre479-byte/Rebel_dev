// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const {
  AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, StringSelectMenuBuilder
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
const { getUser, formatMoney, randomInt } = require('../utils/helpers');
const { createHejolahImage } = require('../utils/canvas');

const carsConfigPath = path.join(__dirname, '../config/cars-config.json');
function getCarsConfig() {
  try { return JSON.parse(fs.readFileSync(carsConfigPath, 'utf8')); } catch { return {}; }
}

const activeGames   = new Map();
const CARS_PER_PAGE = 10;
const REWARD_PER_UNIT = 500;

function generateRow(cols, playerLane, obstacleChance = 0.3) {
  const obstacles = getCarsConfig().hejolah?.obstacles || ['🚧', '🪨', '🐓'];
  return Array.from({ length: cols }, (_, c) =>
    c !== playerLane && Math.random() < obstacleChance
      ? obstacles[Math.floor(Math.random() * obstacles.length)]
      : null
  );
}

function buildInitialGrid(rows, cols, playerLane) {
  return Array.from({ length: rows }, (_, r) =>
    r === rows - 1 ? Array(cols).fill(null) : generateRow(cols, playerLane, 0.25)
  );
}

function moveGrid(grid, cols, playerLane) {
  grid.pop();
  grid.unshift(generateRow(cols, playerLane, 0.3));
  return grid;
}

function checkCollision(grid, playerLane, rows) {
  return !!(grid[rows - 1] && grid[rows - 1][playerLane] !== null);
}

function buildCarSelectMenu(userCars, allCars, page, userId) {
  const start   = page * CARS_PER_PAGE;
  const slice   = userCars.slice(start, start + CARS_PER_PAGE);
  const options = slice.map((uc, sliceIdx) => {
    const globalIdx = start + sliceIdx;
    const car = allCars.find(c => c.id === uc.carId);
    if (!car) return null;
    const dmgLabel = uc.damage >= 100 ? ' ⚠️ معطّلة' : uc.damage > 0 ? ` | ضرر ${uc.damage}%` : '';
    return {
      label: `${car.name}${dmgLabel}`,
      description: `${car.rarity} | سرعة ${car.speed}`,
      value: `hj_${globalIdx}_${userId}`,
    };
  }).filter(Boolean);

  if (!options.length) return null;
  return new StringSelectMenuBuilder()
    .setCustomId(`hejolah_select_${userId}_${page}`)
    .setPlaceholder('اختر سيارة للانطلاق...')
    .addOptions(options);
}

function buildGameButtons(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`hejolah_left_${userId}`).setLabel('◀ يسار').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`hejolah_stay_${userId}`).setLabel('⬆ مستقيم').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`hejolah_right_${userId}`).setLabel('يمين ▶').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`hejolah_quit_${userId}`).setLabel('🏳 استسلام').setStyle(ButtonStyle.Danger)
  );
}

module.exports = {
  name: 'هجولة',
  aliases: ['drift', 'race'],
  category: 'bank',

  execute: async (message) => {
    const userId = message.author.id;
    if (activeGames.has(userId)) return message.reply('❌ لديك لعبة جارية بالفعل!');

    const user     = await getUser(userId, message.guild.id);
    const userCars = (user.cars || []).filter(c => c.count > 0);
    if (!userCars.length) return message.reply('❌ ليس لديك سيارات! احصل على واحدة من المزاد أو الحراج.');

    const allCars    = getCarsConfig().cars || [];
    const totalPages = Math.ceil(userCars.length / CARS_PER_PAGE);
    const menu       = buildCarSelectMenu(userCars, allCars, 0, userId);
    if (!menu) return message.reply('❌ تعذّر تحميل سياراتك.');

    const rows = [new ActionRowBuilder().addComponents(menu)];
    if (totalPages > 1) {
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`hejolah_carpage_${userId}_0_next`).setLabel('التالي ▶').setStyle(ButtonStyle.Secondary)
      ));
    }
    await message.reply({ content: '🏎️ **هجولة** — اختر سيارتك للانطلاق:', components: rows });
  },

  handleInteraction: async (interaction) => {

    if (interaction.isButton() && interaction.customId.startsWith('hejolah_carpage_')) {
      await interaction.deferUpdate();
      const parts  = interaction.customId.split('_');
      const dir    = parts[parts.length - 1];
      let page     = parseInt(parts[parts.length - 2]);
      const userId = parts[parts.length - 3];
      if (interaction.user.id !== userId) return;
      if (dir === 'next') page++; else page--;

      const user     = await getUser(userId, interaction.guild.id);
      const userCars = (user.cars || []).filter(c => c.count > 0);
      const allCars  = getCarsConfig().cars || [];
      const total    = Math.ceil(userCars.length / CARS_PER_PAGE);
      page = Math.max(0, Math.min(page, total - 1));

      const menu = buildCarSelectMenu(userCars, allCars, page, userId);
      if (!menu) return;
      const rows   = [new ActionRowBuilder().addComponents(menu)];
      const navRow = new ActionRowBuilder();
      if (page > 0)       navRow.addComponents(new ButtonBuilder().setCustomId(`hejolah_carpage_${userId}_${page}_prev`).setLabel('◀ السابق').setStyle(ButtonStyle.Secondary));
      if (page < total-1) navRow.addComponents(new ButtonBuilder().setCustomId(`hejolah_carpage_${userId}_${page}_next`).setLabel('التالي ▶').setStyle(ButtonStyle.Secondary));
      if (navRow.components.length) rows.push(navRow);
      return interaction.editReply({ content: `🏎️ **هجولة** — اختر سيارتك (صفحة ${page+1}/${total}):`, components: rows });
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('hejolah_select_')) {
      const val   = interaction.values[0];
      const parts = val.split('_');
      const carIdx = parseInt(parts[1]);
      const userId = parts[2];

      if (interaction.user.id !== userId)
        return interaction.reply({ content: '❌ هذا ليس لك!', ephemeral: true });
      if (activeGames.has(userId))
        return interaction.reply({ content: '❌ لديك لعبة جارية بالفعل!', ephemeral: true });

      await interaction.deferUpdate();

      const user     = await getUser(userId, interaction.guild.id);
      const userCars = (user.cars || []).filter(c => c.count > 0);

      if (carIdx < 0 || carIdx >= userCars.length)
        return interaction.followUp({ content: '❌ سيارة غير صالحة.', ephemeral: true });

      const ownedEntry = userCars[carIdx];
      if (!ownedEntry || ownedEntry.count < 1)
        return interaction.followUp({ content: '❌ لا تملك هذه السيارة.', ephemeral: true });
      if (ownedEntry.damage >= 100)
        return interaction.followUp({ content: '❌ هذه السيارة معطّلة! استخدم `تصليح` أولاً.', ephemeral: true });

      const cfg = getCarsConfig();
      const car = (cfg.cars || []).find(c => c.id === ownedEntry.carId);
      if (!car) return interaction.followUp({ content: '❌ بيانات السيارة غير موجودة.', ephemeral: true });

      const gameRows = cfg.hejolah?.gameRows  || 6;
      const gameCols = cfg.hejolah?.gameCols  || 5;
      const initLane = cfg.hejolah?.playerLane || 2;

      const gameState = {
        guildId: interaction.guild.id,
        lane: initLane, lives: 3, distance: 0,
        grid: buildInitialGrid(gameRows, gameCols, initLane),
        rows: gameRows, cols: gameCols, carId: car.id
      };
      activeGames.set(userId, gameState);

      const imgBuffer  = await createHejolahImage(gameState, car);
      const attachment = new AttachmentBuilder(imgBuffer, { name: 'hejolah.jpg' });
      return interaction.editReply({
        content: `🏎️ **هجولة** — تحرك وتجنب العوائق! حياتك: ❤️❤️❤️`,
        files: [attachment],
        components: [buildGameButtons(userId)]
      });
    }

    if (interaction.isButton() && interaction.customId.startsWith('hejolah_')) {
      const parts  = interaction.customId.split('_');
      const action = parts[1];
      const userId = parts[2];

      if (interaction.user.id !== userId)
        return interaction.reply({ content: '❌ هذه اللعبة ليست لك!', ephemeral: true });

      await interaction.deferUpdate();

      const gameState = activeGames.get(userId);
      if (!gameState)
        return interaction.editReply({ content: '❌ لا توجد لعبة نشطة.', components: [] });

      const cfg = getCarsConfig();
      const car = (cfg.cars || []).find(c => c.id === gameState.carId);

      if (action === 'quit') {
        activeGames.delete(userId);
        const earned = Math.floor(gameState.distance / 10) * REWARD_PER_UNIT;
        let rewardMsg = '';
        if (earned > 0) {
          const user = await getUser(userId, gameState.guildId);
          user.balance += earned;
          await user.save();
          rewardMsg = `\n💰 حصلت على **${formatMoney(earned)}** مكافأة على **${gameState.distance}م** مسافة!`;
        }
        return interaction.editReply({ content: `🏳 استسلمت! قطعت **${gameState.distance}م**.${rewardMsg}`, files: [], components: [] });
      }

      if (action === 'left'  && gameState.lane > 0)                   gameState.lane--;
      if (action === 'right' && gameState.lane < gameState.cols - 1)  gameState.lane++;

      gameState.grid = moveGrid(gameState.grid, gameState.cols, gameState.lane);
      gameState.distance += 10;

      if (checkCollision(gameState.grid, gameState.lane, gameState.rows)) {
        gameState.lives--;
        gameState.grid[gameState.rows - 1][gameState.lane] = null;
      }

      if (gameState.lives <= 0) {
        activeGames.delete(userId);
        const user      = await getUser(userId, gameState.guildId);
        const ticketAmt = randomInt(cfg.hejolah?.ticketMinAmount||5000, cfg.hejolah?.ticketMaxAmount||100000);
        const dmgProb   = cfg.hejolah?.damageProbability || 0.4;

        if (!user.tickets) user.tickets = [];
        const ticketId = Date.now().toString(36).toUpperCase();
        user.tickets.push({ ticketId, amount: ticketAmt, issuedAt: new Date(), paid: false });

        let damageMsg = '';
        const ownedCar = (user.cars || []).find(c => c.carId === gameState.carId);
        if (ownedCar && Math.random() < dmgProb) {
          const dmgAmt = randomInt(10, 40);
          ownedCar.damage = Math.min(100, (ownedCar.damage || 0) + dmgAmt);
          damageMsg = `\n🔧 سيارتك تضررت! الضرر: **${ownedCar.damage}%** — استخدم \`تصليح\` لإصلاحها.`;
          if (ownedCar.damage >= 100) damageMsg += ' ⚠️ السيارة متوقفة حتى تُصلَّح!';
        }
        await user.save();

        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor('#FF0000').setTitle('💥 انتهت اللعبة!')
            .setDescription(`قطعت **${gameState.distance}م** قبل أن تتعطل!\n\n🚓 مخالفة بقيمة **${formatMoney(ticketAmt)}** | رقم: \`${ticketId}\`\nاستخدم \`مخالفة ${ticketId}\` لدفعها.${damageMsg}`)
            .setTimestamp()],
          files: [], components: []
        });
      }

      activeGames.set(userId, gameState);
      const imgBuffer  = await createHejolahImage(gameState, car);
      const attachment = new AttachmentBuilder(imgBuffer, { name: 'hejolah.jpg' });
      const livesStr   = '❤️'.repeat(gameState.lives) + '🖤'.repeat(3 - gameState.lives);
      return interaction.editReply({
        content: `🏎️ **هجولة** — المسافة: **${gameState.distance}م** | الحياة: ${livesStr}`,
        files: [attachment],
        components: [buildGameButtons(userId)]
      });
    }
  }
};
