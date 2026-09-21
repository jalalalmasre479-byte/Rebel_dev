// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, formatTime } = require('../utils/helpers');
module.exports = {
  name: 'زواجي',
  aliases: ['mymarriage', 'marriageinfo'],
  category: 'bank',
  execute: async (message) => {
    try {
      const user = await getUser(message.author.id, message.guild.id);
      if (!user.marriage.partnerId) {
        return message.reply('❌ أنت لست متزوجاً!');
      }
      const partnerUser = await message.client.users.fetch(user.marriage.partnerId);
      const duration = Date.now() - user.marriage.marriedAt.getTime();
      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('💍 معلومات الزواج')
        .addFields(
          { name: 'الزوج/الزوجة', value: partnerUser.tag, inline: true },
          { name: 'تاريخ الزواج', value: user.marriage.marriedAt.toLocaleDateString('ar-EG'), inline: true },
          { name: 'مدة الزواج', value: formatTime(duration), inline: false }
        )
        .setThumbnail(partnerUser.displayAvatarURL())
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in marriage info command:', error);
      await message.reply('❌ حدث خطأ أثناء عرض معلومات الزواج.');
    }
  }
};