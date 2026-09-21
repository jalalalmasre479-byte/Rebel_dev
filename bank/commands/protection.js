// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, formatMoney, formatTime } = require('../utils/helpers');
const config = require('../config/bank-config.json');
module.exports = {
  name: 'حماية',
  aliases: ['protect', 'protection'],
  category: 'bank',
  execute: async (message) => {
    try {
      const user = await getUser(message.author.id, message.guild.id);
      if (user.protection.active && user.protection.expiresAt > new Date()) {
        const remaining = user.protection.expiresAt.getTime() - Date.now();
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🛡️ أنت محمي بالفعل')
          .setDescription(`الحماية نشطة لمدة ${formatTime(remaining)} أخرى.`)
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }
      const cost = config.economy.protectionCost;
      if (user.balance < cost) {
        return message.reply(`❌ ليس لديك رصيد كافٍ! تحتاج ${formatMoney(cost)}`);
      }
      user.balance -= cost;
      user.protection.active = true;
      user.protection.expiresAt = new Date(Date.now() + config.economy.protectionDuration);
      await user.save();
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🛡️ تم تفعيل الحماية')
        .setDescription(`أنت محمي الآن من السرقة لمدة ${formatTime(config.economy.protectionDuration)}!`)
        .addFields(
          { name: 'التكلفة', value: formatMoney(cost), inline: true },
          { name: 'رصيدك الجديد', value: formatMoney(user.balance), inline: true }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in protection command:', error);
      await message.reply('❌ حدث خطأ أثناء تفعيل الحماية.');
    }
  }
};