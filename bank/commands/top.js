// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const BankUser = require('../models/BankUser');
const { createTopImage } = require('../utils/canvas');

module.exports = {
  name: 'توب',
  aliases: ['top', 'leaderboard'],
  category: 'bank',

  execute: async (message) => {
    try {
      await showTop(message, 'rich', message.author.id);
    } catch (error) {
      console.error('Error in top command:', error);
      await message.reply('❌ حدث خطأ أثناء عرض التوب.');
    }
  },

  handleInteraction: async (interaction) => {
    try {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('top_')) return;

      const [, category, userId] = interaction.customId.split('_');

      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: '❌ هذا ليس لك!',
          ephemeral: true
        });
      }

      await interaction.deferUpdate();
      await showTop(interaction, category, userId);

    } catch (error) {
      console.error('Error in top interaction:', error);
      await interaction.reply({
        content: '❌ حدث خطأ أثناء التفاعل مع لوحة المتصدرين.',
        ephemeral: true
      }).catch(() => {});
    }
  }
};


async function showTop(context, category, userId) {

  const message = context.message || context;
  const guildId = message.guild.id;

  let users;

  switch (category) {

    case 'rich':
      users = await BankUser.find({ guildId })
        .sort({ balance: -1 })
        .limit(10);
      break;

    case 'thieves':
      users = await BankUser.find({ guildId })
        .sort({ 'stats.totalStolen': -1 })
        .limit(10);
      break;

    case 'lands':
      users = await BankUser.find({ guildId })
        .sort({ lands: -1 })
        .limit(10);

      users = users.sort((a, b) => b.lands.length - a.lands.length);
      break;

    case 'investors':
      users = await BankUser.find({ guildId })
        .sort({ 'stats.totalInvested': -1 })
        .limit(10);
      break;

    case 'cars':

      users = await BankUser.find({
        guildId,
        'cars.0': { $exists: true }
      }).limit(50);

      users = users
        .map(u => ({
          ...u.toObject(),
          _carTotal: (u.cars || []).reduce((sum, car) => sum + car.count, 0)
        }))
        .sort((a, b) => b._carTotal - a._carTotal)
        .slice(0, 10);

      break;

    default:
      users = await BankUser.find({ guildId })
        .sort({ balance: -1 })
        .limit(10);

  }

  const imageBuffer = await createTopImage(users, category, context.client, message.guild);

  const attachment = new AttachmentBuilder(imageBuffer, {
    name: 'top.png'
  });


  const btnDefs = [
    { id: 'rich', label: 'توب أغنياء', emoji: '👑' },
    { id: 'thieves', label: 'توب حرامية', emoji: '🦹' },
    { id: 'lands', label: 'توب أراضي', emoji: '🏗️' },
    { id: 'investors', label: 'توب مستثمرين', emoji: '📈' },
    { id: 'cars', label: 'توب سيارات', emoji: '🚗' }
  ];


  const row = new ActionRowBuilder().addComponents(
    btnDefs.map(btn =>
      new ButtonBuilder()
        .setCustomId(`top_${btn.id}_${userId}`)
        .setLabel(btn.label)
        .setEmoji(btn.emoji)
        .setStyle(category === btn.id ? ButtonStyle.Success : ButtonStyle.Secondary)
    )
  );


  if (context.deferUpdate) {

    await context.editReply({
      files: [attachment],
      components: [row]
    });

  } else {

    await context.reply({
      files: [attachment],
      components: [row]
    });

  }
}