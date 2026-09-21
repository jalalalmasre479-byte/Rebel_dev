// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, checkCooldown, formatTime } = require('../utils/helpers');
const config = require('../config/bank-config.json');
module.exports = {
  name: 'وقت',
  aliases: ['time', 'cooldowns', 'cd'],
  category: 'bank',
  execute: async (message) => {
    try {
      const user = await getUser(message.author.id, message.guild.id);
      const commands = [
        { name: 'نرد', key: 'dice' },
        { name: 'حظ', key: 'luck' },
        { name: 'فواكه', key: 'fruits' },
        { name: 'قمار', key: 'gamble' },
        { name: 'تداول', key: 'trade' },
        { name: 'بخشيش', key: 'tip' },
        { name: 'سرقة', key: 'rob' },
        { name: 'راتب', key: 'salary' },
        { name: 'قرض', key: 'loan' }
      ];
      const embed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('⏰ أوقات الانتظار')
        .setDescription('هذه هي أوقات الانتظار للأوامر المختلفة:')
        .setTimestamp();
      for (const cmd of commands) {
        const cooldown = checkCooldown(user, cmd.key);
        let status;
        if (cooldown.ready) {
          status = '✅ جاهز';
        } else {
          status = `⏳ ${cooldown.remainingFormatted}`;
        }
        embed.addFields({
          name: cmd.name,
          value: status,
          inline: true
        });
      }
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in time command:', error);
      await message.reply('❌ حدث خطأ أثناء عرض الأوقات.');
    }
  }
};