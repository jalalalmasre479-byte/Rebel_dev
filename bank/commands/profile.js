// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { AttachmentBuilder } = require('discord.js');
const { getUser } = require('../utils/helpers');
const { createProfileImage } = require('../utils/canvas');
module.exports = {
  name: 'بروفايل',
  aliases: ['profile', 'me'],
  category: 'bank',
  execute: async (message) => {
    try {
      const user = await getUser(message.author.id, message.guild.id);
      const imageBuffer = await createProfileImage(user, message.author);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'profile.png' });
      await message.reply({ files: [attachment] });
    } catch (error) {
      console.error('Error in profile command:', error);
      await message.reply('❌ حدث خطأ أثناء عرض البروفايل.');
    }
  }
};