// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------


const {
  AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
const { getUser, formatMoney } = require('../utils/helpers');
const { createAuctionImage }   = require('../utils/canvas');
const { getAuction, saveAuction } = require('../utils/car-store');

const carsConfigPath = path.join(__dirname, '../config/cars-config.json');
function getCarsConfig() {
  try { return JSON.parse(fs.readFileSync(carsConfigPath, 'utf8')); } catch { return {}; }
}
function getCarById(id) {
  return (getCarsConfig().cars || []).find(c => c.id === id);
}
function pickRandomCars(count) {
  const cfg = getCarsConfig();
  const allCars = cfg.cars || [];
  const rarityWeights = cfg.rarityWeights || {};
  const weights = allCars.map(c => rarityWeights[c.rarity] || 10);
  const picked = []; const used = new Set(); let attempts = 0;
  while (picked.length < count && attempts < 200) {
    attempts++;
    const total = weights.reduce((a, b, i) => used.has(i) ? a : a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < allCars.length; i++) {
      if (used.has(i)) continue;
      r -= weights[i];
      if (r <= 0) { picked.push(allCars[i]); used.add(i); break; }
    }
  }
  return picked;
}

function makeGuildActor(guild) {
  return {
    username: guild.name,
    displayAvatarURL: (opts) =>
      guild.iconURL({ extension: opts?.extension || 'png', size: opts?.size || 128, forceStatic: true }) || null
  };
}

const auctionTimers = new Map();

async function startAuction(client, guildId, channelId) {
  const cfg  = getCarsConfig();
  const cars = pickRandomCars(cfg.auction?.carsPerAuction || 3);
  const auctionTime = cfg.auction?.auctionTime || 720000;

  const auctionData = { active: true, cars, bids: {}, startedAt: Date.now(), channelId, messageId: null };
  saveAuction(auctionData);

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const guild      = channel.guild;
  const guildActor = makeGuildActor(guild);

  const imgBuffer  = await createAuctionImage(cars, {}, guildActor, guildId);
  const attachment = new AttachmentBuilder(imgBuffer, { name: 'auction.jpg' });

  const row = new ActionRowBuilder();
  for (const car of cars) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`auction_bid_${car.id}`)
        .setLabel(`زايد على ${car.name}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💰')
    );
  }

  const remaining = Math.floor(auctionTime / 60000);
  const msg = await channel.send({
    content: `🏎️ **المزاد مفتوح الآن!** ينتهي بعد ${remaining} دقيقة`,
    files: [attachment],
    components: [row]
  });

  auctionData.messageId = msg.id;
  saveAuction(auctionData);

  if (auctionTimers.has(guildId)) clearTimeout(auctionTimers.get(guildId));
  auctionTimers.set(guildId, setTimeout(() => endAuction(client, guildId, channelId), auctionTime));
}

async function endAuction(client, guildId, channelId) {
  const auction = getAuction();
  if (!auction.active) return;
  auction.active = false;
  saveAuction(auction);

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (channel && auction.messageId) {
    const msg = await channel.messages.fetch(auction.messageId).catch(() => null);
    if (msg) {
      const disabledRows = msg.components.map(row => {
        const nr = ActionRowBuilder.from(row);
        nr.components = nr.components.map(b => ButtonBuilder.from(b).setDisabled(true));
        return nr;
      });
      await msg.edit({ components: disabledRows }).catch(() => {});
    }
  }

  const results = [];
  const BU = require('../models/BankUser');
  for (const car of auction.cars) {
    const bid = auction.bids[car.id];
    if (!bid) { results.push(`❌ **${car.name}** — لا توجد عروض`); continue; }
    const winner = await BU.findOne({ userId: bid.userId, guildId }).catch(() => null);
    if (winner && winner.balance >= bid.amount) {
      winner.balance -= bid.amount;
      if (!winner.cars) winner.cars = [];
      const ex = winner.cars.find(c => c.carId === car.id);
      if (ex) ex.count++; else winner.cars.push({ carId: car.id, count: 1, damage: 0 });
      await winner.save().catch(() => {});
      results.push(`🏆 **${car.name}** — فاز <@${bid.userId}> بـ ${formatMoney(bid.amount)}`);
    } else {
      results.push(`❌ **${car.name}** — لم يستطع الفائز الدفع`);
    }
  }

  if (channel) {
    await channel.send({ embeds: [new EmbedBuilder().setColor('#FFD700').setTitle('🏁 انتهى المزاد!').setDescription(results.join('\n')).setTimestamp()] });
  }

  const openTime = getCarsConfig().auction?.auctionOpenTime || 240000;
  setTimeout(() => startAuction(client, guildId, channelId), openTime);
}

module.exports = {
  name: 'مزاد',
  aliases: ['auction'],
  category: 'bank',

  execute: async (message) => {
    const auction = getAuction();
    if (auction.active) {
      const cfg        = getCarsConfig();
      const rem        = Math.max(0, (cfg.auction?.auctionTime || 720000) - (Date.now() - auction.startedAt));
      const mins       = Math.floor(rem / 60000), secs = Math.floor((rem % 60000) / 1000);
      const guildActor = makeGuildActor(message.guild);
      const imgBuffer  = await createAuctionImage(auction.cars, auction.bids, guildActor, message.guild.id);
      const attachment = new AttachmentBuilder(imgBuffer, { name: 'auction.jpg' });
      const row        = new ActionRowBuilder();
      for (const car of auction.cars) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`auction_bid_${car.id}`)
            .setLabel(`زايد على ${car.name}`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💰')
        );
      }
      return message.reply({
        content: `🏎️ **المزاد نشط!** ينتهي بعد **${mins}:${String(secs).padStart(2,'0')}** دقيقة.`,
        files: [attachment],
        components: [row]
      });
    }
    await startAuction(message.client, message.guild.id, message.channel.id);
  },

  handleInteraction: async (interaction) => {
    if (!interaction.customId.startsWith('auction_')) return;

    if (interaction.isButton() && interaction.customId.startsWith('auction_bid_')) {
      const carId = interaction.customId.replace('auction_bid_', '');
      const car   = getCarById(carId);
      if (!car) return interaction.reply({ content: '❌ السيارة غير موجودة.', ephemeral: true });
      const auction = getAuction();
      if (!auction.active) return interaction.reply({ content: '❌ المزاد غير نشط.', ephemeral: true });

      const currentBid = auction.bids[carId];
      const minBid     = currentBid ? currentBid.amount + 1 : car.leastPrice;

      const modal = new ModalBuilder().setCustomId(`auction_modal_${carId}`).setTitle(`مزايدة على ${car.name}`);
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bid_amount')
          .setLabel(`اكتب سعرك (${formatMoney(minBid)} أو أكثر)`)
          .setStyle(TextInputStyle.Short).setPlaceholder(formatMoney(minBid)).setRequired(true)
      ));
      await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('auction_modal_')) {
      await interaction.deferReply({ ephemeral: true });
      const carId  = interaction.customId.replace('auction_modal_', '');
      const car    = getCarById(carId);
      const auction = getAuction();

      if (!auction.active) return interaction.editReply({ content: '❌ المزاد انتهى.' });

      const amount = parseInt(interaction.fields.getTextInputValue('bid_amount').replace(/[,\s]/g, ''));
      if (isNaN(amount) || amount <= 0) return interaction.editReply({ content: '❌ مبلغ غير صالح.' });

      const currentBid = auction.bids[carId];
      const minBid     = currentBid ? currentBid.amount + 1 : car.leastPrice;
      if (amount < minBid) return interaction.editReply({ content: `❌ المبلغ يجب أن يكون ${formatMoney(minBid)} على الأقل.` });

      const user = await getUser(interaction.user.id, interaction.guild.id);
      if (user.balance < amount) return interaction.editReply({ content: `❌ رصيدك غير كافٍ (${formatMoney(user.balance)}).` });

      auction.bids[carId] = {
        userId: interaction.user.id,
        username: interaction.user.username,
        amount,
        avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 64, forceStatic: true })
      };
      saveAuction(auction);
      try {
        const guild      = interaction.guild;
        const guildActor = makeGuildActor(guild);
        const msg = await interaction.channel.messages.fetch(auction.messageId).catch(() => null);
        if (msg) {
          const imgBuffer  = await createAuctionImage(auction.cars, auction.bids, guildActor, interaction.guild.id);
          const attachment = new AttachmentBuilder(imgBuffer, { name: 'auction.jpg' });
          await msg.edit({ files: [attachment] }).catch(() => {});
        }
      } catch {}

      await interaction.editReply({ content: `✅ تم تسجيل مزايدتك على **${car.name}** بـ **${formatMoney(amount)}**!` });
    }
  },

  startAuction,
  endAuction
};
  
