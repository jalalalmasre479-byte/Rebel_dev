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
const { getUser, formatMoney } = require('../utils/helpers');
const { createHarrajImage }    = require('../utils/canvas');
const { getHarraj, saveHarraj } = require('../utils/car-store');

const carsConfigPath = path.join(__dirname, '../config/cars-config.json');
function getCarsConfig() {
  try { return JSON.parse(fs.readFileSync(carsConfigPath, 'utf8')); } catch { return { cars: [] }; }
}

const PER_PAGE = 4;
const CARS_PER_PAGE = 10;

function buildSellCarMenu(userCars, allCars, page, userId) {
  const start = page * CARS_PER_PAGE;
  const slice = userCars.slice(start, start + CARS_PER_PAGE);

  const options = slice.map(uc => {
    const car = allCars.find(c => c.id === uc.carId);
    if (!car) return null;
    const dmg = uc.damage > 0 ? ` | ضرر ${uc.damage}%` : '';
    return {
      label: `${car.name} (x${uc.count})`,
      description: `${car.rarity}${dmg}`,
      value: `harraj_sell_pick_${uc.carId}_${userId}_${page}`
    };
  }).filter(Boolean);

  if (!options.length) return null;
  return new StringSelectMenuBuilder()
    .setCustomId(`harraj_sell_menu_${userId}_${page}`)
    .setPlaceholder('اختر سيارة للبيع...')
    .addOptions(options);
}

module.exports = {
  name: 'حراج',
  aliases: ['harraj', 'market-cars'],
  category: 'bank',

  execute: async (message, args) => {
    const subcmd = (args[0] || '').toLowerCase();
    if (subcmd === 'بيع' || subcmd === 'sell') {
      const user     = await getUser(message.author.id, message.guild.id);
      const userCars = (user.cars || []).filter(c => c.count > 0);
      if (!userCars.length) return message.reply('❌ ليس لديك سيارات لبيعها.');

      const cfg     = getCarsConfig();
      const allCars = cfg.cars || [];
      const totalPages = Math.ceil(userCars.length / CARS_PER_PAGE);
      const menu    = buildSellCarMenu(userCars, allCars, 0, message.author.id);
      if (!menu) return message.reply('❌ لم يتم العثور على سياراتك في قاعدة البيانات.');

      const rows = [new ActionRowBuilder().addComponents(menu)];
      if (totalPages > 1) {
        const navRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`harraj_sell_page_${message.author.id}_0_next`).setLabel('التالي ▶').setStyle(ButtonStyle.Secondary).setDisabled(false)
        );
        rows.push(navRow);
      }

      return message.reply({
        content: `🚗 **اختر سيارة للبيع** (صفحة 1/${totalPages}):`,
        components: rows
      });
    }
    if (subcmd === 'سحب' || subcmd === 'remove') {
      const listingId = args[1];
      if (!listingId) return message.reply('❌ الاستخدام: `حراج سحب <رقم_الإعلان>`');
      const listings = getHarraj();
      const idx = listings.findIndex(l => l.listingId === listingId && l.sellerId === message.author.id);
      if (idx === -1) return message.reply('❌ لم يُعثر على إعلانك.');
      listings.splice(idx, 1);
      saveHarraj(listings);
      return message.reply('✅ تم سحب إعلانك.');
    }

    if (subcmd === 'شراء' || subcmd === 'buy') {
      const listingId = args[1];
      if (!listingId) return message.reply('❌ الاستخدام: `حراج شراء <رقم_الإعلان>` أو مع سعر تفاوضي');
      const listings = getHarraj();
      const listing  = listings.find(l => l.listingId === listingId);
      if (!listing) return message.reply('❌ الإعلان غير موجود.');
      if (listing.sellerId === message.author.id) return message.reply('❌ لا يمكنك شراء سيارتك.');

      const customPrice = args[2] ? parseInt(args[2].replace(/[,\s]/g, '')) : null;
      const buyer = await getUser(message.author.id, message.guild.id);

      if (!customPrice) {
        if (buyer.balance < listing.price) return message.reply(`❌ رصيدك غير كافٍ (${formatMoney(buyer.balance)}).`);
        buyer.balance -= listing.price;
        if (!buyer.cars) buyer.cars = [];
        const ex = buyer.cars.find(c => c.carId === listing.carId);
        if (ex) ex.count++; else buyer.cars.push({ carId: listing.carId, count: 1, damage: 0 });
        await buyer.save();
        const sellerUser = await getUser(listing.sellerId, message.guild.id);
        sellerUser.balance += listing.price;
        await sellerUser.save();
        const idx = listings.findIndex(l => l.listingId === listingId);
        listings.splice(idx, 1);
        saveHarraj(listings);
        return message.reply(`✅ اشتريت **${listing.carName}** بـ **${formatMoney(listing.price)}**!`);
      } else {
        if (isNaN(customPrice) || customPrice <= 0) return message.reply('❌ سعر غير صالح.');
        if (buyer.balance < customPrice) return message.reply('❌ رصيدك غير كافٍ.');
        const cfg     = getCarsConfig();
        const timeout = cfg.harraj?.negotiationTimeout || 60000;
        const embed   = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('💬 عرض تفاوض')
          .setDescription(`<@${message.author.id}> يريد شراء **${listing.carName}** منك بـ **${formatMoney(customPrice)}** (سعرك: ${formatMoney(listing.price)})\nلديك ${timeout / 1000} ثانية للرد.`)
          .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`harraj_accept_${listingId}_${message.author.id}_${customPrice}`).setLabel('✅ قبول').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`harraj_decline_${listingId}_${message.author.id}`).setLabel('❌ رفض').setStyle(ButtonStyle.Danger)
        );
        try {
          const seller = await message.guild.members.fetch(listing.sellerId);
          await seller.send({ embeds: [embed], components: [row] });
          return message.reply(`✅ تم إرسال عرضك إلى ${seller.user.username}. بانتظار رده.`);
        } catch {
          return message.reply('❌ لا يمكن إرسال رسالة للبائع (ربما أغلق الرسائل الخاصة).');
        }
      }
    }

    const listings = getHarraj();
    const cfg = getCarsConfig();
    const allCars = cfg.cars || [];
    const totalPages = Math.max(1, Math.ceil(listings.length / PER_PAGE));
    const imgBuffer  = await createHarrajImage(listings, allCars, 0, totalPages, message.guild.id);
    const attachment = new AttachmentBuilder(imgBuffer, { name: 'harraj.jpg' });

    const row = new ActionRowBuilder();
    if (totalPages > 1)
      row.addComponents(new ButtonBuilder().setCustomId(`harraj_page_${message.author.id}_0_next`).setLabel('التالي ▶').setStyle(ButtonStyle.Secondary));
    row.addComponents(new ButtonBuilder().setCustomId(`harraj_refresh_${message.author.id}`).setLabel('🔄 تحديث').setStyle(ButtonStyle.Secondary));

    await message.reply({
      content: '🏪 **الحراج** — اشترِ أو بع سياراتك!\n`حراج بيع` | `حراج شراء <رقم>` | `حراج سحب <رقم>`',
      files: [attachment],
      components: row.components.length ? [row] : []
    });
  },

  handleInteraction: async (interaction) => {
    if (!interaction.customId.startsWith('harraj_')) return;
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('harraj_sell_menu_')) {
      await interaction.deferUpdate();
      const picked = interaction.values[0];
      const parts  = picked.split('_');
      const page   = parseInt(parts[parts.length - 1]);
      const userId = parts[parts.length - 2];
      const carId  = parts.slice(3, parts.length - 2).join('_');

      if (interaction.user.id !== userId)
        return interaction.followUp({ content: '❌ هذا ليس لك!', ephemeral: true });
      await interaction.followUp({ content: `💰 **كم تريد بيع سيارتك؟**\nأرسل السعر الآن (لديك 60 ثانية):`, ephemeral: true });

      const priceMsg = await interaction.channel.awaitMessages({
        filter: m => m.author.id === userId && !isNaN(parseInt(m.content.replace(/[,\s]/g, ''))),
        max: 1, time: 60000
      }).catch(() => null);

      if (!priceMsg) return interaction.followUp({ content: '⏰ انتهى الوقت.', ephemeral: true });

      const price = parseInt(priceMsg.first().content.replace(/[,\s]/g, ''));
      if (isNaN(price) || price <= 0) return interaction.followUp({ content: '❌ سعر غير صالح.', ephemeral: true });

      const cfg     = getCarsConfig();
      const car     = (cfg.cars || []).find(c => c.id === carId);
      if (!car) return interaction.followUp({ content: '❌ السيارة غير موجودة.', ephemeral: true });

      const user   = await getUser(userId, interaction.guild.id);
      const owned  = (user.cars || []).find(c => c.carId === carId);
      if (!owned || owned.count < 1) return interaction.followUp({ content: `❌ لا تملك **${car.name}**.`, ephemeral: true });

      const listings  = getHarraj();
      const listingId = Date.now().toString(36).toUpperCase();
      listings.push({ listingId, sellerId: userId, sellerName: interaction.user.username, carId, carName: car.name, price, listedAt: Date.now() });
      saveHarraj(listings);

      return interaction.followUp({ content: `✅ تم عرض **${car.name}** بسعر **${formatMoney(price)}**!\nرقم الإعلان: \`${listingId}\``, ephemeral: true });
    }
    if (interaction.isButton() && interaction.customId.startsWith('harraj_sell_page_')) {
      await interaction.deferUpdate();
      const parts  = interaction.customId.split('_');
      const dir    = parts[parts.length - 1];
      let page     = parseInt(parts[parts.length - 2]);
      const userId = parts[parts.length - 3];
      if (interaction.user.id !== userId) return;
      if (dir === 'next') page++; else page--;

      const user     = await getUser(userId, interaction.guild.id);
      const userCars = (user.cars || []).filter(c => c.count > 0);
      const cfg      = getCarsConfig();
      const allCars  = cfg.cars || [];
      const totalPages = Math.ceil(userCars.length / CARS_PER_PAGE);
      page = Math.max(0, Math.min(page, totalPages - 1));

      const menu = buildSellCarMenu(userCars, allCars, page, userId);
      if (!menu) return;

      const rows = [new ActionRowBuilder().addComponents(menu)];
      const navRow = new ActionRowBuilder();
      if (page > 0) navRow.addComponents(new ButtonBuilder().setCustomId(`harraj_sell_page_${userId}_${page}_prev`).setLabel('◀ السابق').setStyle(ButtonStyle.Secondary));
      if (page < totalPages - 1) navRow.addComponents(new ButtonBuilder().setCustomId(`harraj_sell_page_${userId}_${page}_next`).setLabel('التالي ▶').setStyle(ButtonStyle.Secondary));
      if (navRow.components.length) rows.push(navRow);

      await interaction.editReply({ content: `🚗 **اختر سيارة للبيع** (صفحة ${page + 1}/${totalPages}):`, components: rows });
      return;
    }
    if (interaction.isButton() && interaction.customId.startsWith('harraj_accept_')) {
      await interaction.deferUpdate();
      const parts      = interaction.customId.split('_');
      const listingId  = parts[2], buyerId = parts[3], customPrice = parseInt(parts[4]);
      const listings   = getHarraj();
      const listing    = listings.find(l => l.listingId === listingId);
      if (!listing) return interaction.followUp({ content: '❌ الإعلان لم يعد متاحاً.', ephemeral: true });
      const buyer = await getUser(buyerId, interaction.guild.id);
      if (buyer.balance < customPrice) return interaction.followUp({ content: '❌ المشتري لا يملك الرصيد.', ephemeral: true });
      buyer.balance -= customPrice;
      if (!buyer.cars) buyer.cars = [];
      const ex = buyer.cars.find(c => c.carId === listing.carId);
      if (ex) ex.count++; else buyer.cars.push({ carId: listing.carId, count: 1, damage: 0 });
      await buyer.save();
      const sellerUser = await getUser(listing.sellerId, interaction.guild.id);
      sellerUser.balance += customPrice;
      await sellerUser.save();
      listings.splice(listings.findIndex(l => l.listingId === listingId), 1);
      saveHarraj(listings);
      return interaction.editReply({ content: `✅ تم البيع! **${listing.carName}** → <@${buyerId}> بـ **${formatMoney(customPrice)}**.`, components: [] });
    }
    if (interaction.isButton() && interaction.customId.startsWith('harraj_decline_')) {
      await interaction.deferUpdate();
      return interaction.editReply({ content: '❌ تم رفض العرض.', components: [] });
    }
    if (interaction.isButton() && (interaction.customId.startsWith('harraj_page_') || interaction.customId.startsWith('harraj_refresh_'))) {
      await interaction.deferUpdate();
      const listings = getHarraj();
      const cfg      = getCarsConfig();
      const allCars  = cfg.cars || [];
      const totalPages = Math.max(1, Math.ceil(listings.length / PER_PAGE));

      let page = 0;
      if (interaction.customId.startsWith('harraj_page_')) {
        const parts = interaction.customId.split('_');
        const dir   = parts[parts.length - 1];
        page = parseInt(parts[parts.length - 2]) || 0;
        if (dir === 'next') page++; else page--;
      }
      page = Math.max(0, Math.min(page, totalPages - 1));

      const userId     = interaction.customId.split('_')[3] || interaction.user.id;
      const imgBuffer  = await createHarrajImage(listings, allCars, page, totalPages, interaction.guild.id);
      const attachment = new AttachmentBuilder(imgBuffer, { name: 'harraj.jpg' });
      const row = new ActionRowBuilder();
      if (page > 0)           row.addComponents(new ButtonBuilder().setCustomId(`harraj_page_${userId}_${page}_prev`).setLabel('◀ السابق').setStyle(ButtonStyle.Secondary));
      if (page < totalPages - 1) row.addComponents(new ButtonBuilder().setCustomId(`harraj_page_${userId}_${page}_next`).setLabel('التالي ▶').setStyle(ButtonStyle.Secondary));
      row.addComponents(new ButtonBuilder().setCustomId(`harraj_refresh_${userId}`).setLabel('🔄 تحديث').setStyle(ButtonStyle.Secondary));

      return interaction.editReply({ files: [attachment], components: row.components.length ? [row] : [] });
    }
  }
};
