// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const { getUser } = require('../utils/helpers');
const { createGarageImage } = require('../utils/canvas');

const carsConfigPath = path.join(__dirname, '../config/cars-config.json');
function getCarsConfig() {
  try { return JSON.parse(fs.readFileSync(carsConfigPath, 'utf8')); } catch { return { cars: [] }; }
}

const PER_PAGE = 9;

module.exports = {
  name: 'كراج',
  aliases: ['garage', 'garag'],
  category: 'bank',

  execute: async (message) => {
    const user       = await getUser(message.author.id, message.guild.id);
    const cfg        = getCarsConfig();
    const allCars    = cfg.cars || [];
    const userCars   = user.cars || [];
    const totalPages = Math.max(1, Math.ceil(allCars.length / PER_PAGE));

    const imgBuffer  = await createGarageImage(allCars, userCars, 0, totalPages, message.author);
    const attachment = new AttachmentBuilder(imgBuffer, { name: 'garage.jpg' });
    const row        = new ActionRowBuilder();
    if (totalPages > 1) row.addComponents(new ButtonBuilder().setCustomId(`garage_next_${message.author.id}_0`).setLabel('التالي ▶').setStyle(ButtonStyle.Secondary));
    await message.reply({ files: [attachment], components: row.components.length ? [row] : [] });
  },

  handleInteraction: async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('garage_')) return;

    const parts       = interaction.customId.split('_');
    const dir         = parts[1];
    const userId      = parts[2];
    const currentPage = parseInt(parts[3]);

    if (interaction.user.id !== userId) return interaction.reply({ content: '❌ هذا ليس لك!', ephemeral: true });
    await interaction.deferUpdate();

    const user        = await getUser(userId, interaction.guild.id);
    const cfg         = getCarsConfig();
    const allCars     = cfg.cars || [];
    const userCars    = user.cars || [];
    const totalPages  = Math.max(1, Math.ceil(allCars.length / PER_PAGE));
    const newPage     = dir === 'prev' ? currentPage - 1 : currentPage + 1;
    const clampedPage = Math.max(0, Math.min(newPage, totalPages - 1));

    const imgBuffer  = await createGarageImage(allCars, userCars, clampedPage, totalPages, interaction.user);
    const attachment = new AttachmentBuilder(imgBuffer, { name: 'garage.jpg' });
    const row        = new ActionRowBuilder();
    if (clampedPage > 0)           row.addComponents(new ButtonBuilder().setCustomId(`garage_prev_${userId}_${clampedPage}`).setLabel('◀ السابق').setStyle(ButtonStyle.Secondary));
    if (clampedPage < totalPages-1) row.addComponents(new ButtonBuilder().setCustomId(`garage_next_${userId}_${clampedPage}`).setLabel('التالي ▶').setStyle(ButtonStyle.Secondary));
    await interaction.editReply({ files: [attachment], components: row.components.length ? [row] : [] });
  }
};
