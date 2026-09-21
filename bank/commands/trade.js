// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, checkCooldown, setCooldown, parseAmount, formatMoney } = require('../utils/helpers');
const config = require('../config/bank-config.json');
module.exports = {
  name: 'تداول',
  aliases: ['trade', 'invest'],
  category: 'bank',
  execute: async (message, args) => {
    try {
      if (args.length === 0) {
        return message.reply('❌ الاستخدام: `تداول <المبلغ>` أو `تداول كامل/نص/ربع`');
      }
      const user = await getUser(message.author.id, message.guild.id);
      const cooldown = checkCooldown(user, 'trade');
      if (!cooldown.ready) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(`⏰ يجب الانتظار ${cooldown.remainingFormatted} للتداول مرة أخرى.`);
        return message.reply({ embeds: [embed] });
      }
      const amount = parseAmount(args[0], user.balance);
      if (!amount || amount <= 0) {
        return message.reply('❌ المبلغ غير صالح!');
      }
      if (amount < config.games.trade.minBet) {
        return message.reply(`❌ الحد الأدنى للتداول هو ${formatMoney(config.games.trade.minBet)}`);
      }
      if (amount > user.balance) {
        return message.reply(`❌ ليس لديك رصيد كافٍ! رصيدك: ${formatMoney(user.balance)}`);
      }
      const percentages = config.games.trade.percentages;
      const percentage = percentages[Math.floor(Math.random() * percentages.length)];
      const change = Math.floor(amount * (percentage / 100));
      const newAmount = amount + change;
      user.balance = user.balance - amount + newAmount;
      user.stats.totalInvested += amount;
      if (change > 0 && change > user.stats.highestEarned) {
        user.stats.highestEarned = change;
      } else if (change < 0 && Math.abs(change) > user.stats.highestLost) {
        user.stats.highestLost = Math.abs(change);
      }
      await setCooldown(user, 'trade');
      let color, emoji, title;
      if (percentage > 0) {
        color = '#00FF00';
        emoji = '📈';
        title = 'ربح!';
      } else if (percentage < 0) {
        color = '#FF0000';
        emoji = '📉';
        title = 'خسارة!';
      } else {
        color = '#FFA500';
        emoji = '➡️';
        title = 'لا تغيير';
      }
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} تداول - ${title}`)
        .setDescription(`المبلغ المستثمر: ${formatMoney(amount)}`)
        .addFields(
          { name: 'نسبة التغيير', value: `${percentage > 0 ? '+' : ''}${percentage}%`, inline: true },
          { name: 'الربح/الخسارة', value: formatMoney(change), inline: true },
          { name: 'المبلغ النهائي', value: formatMoney(newAmount), inline: true },
          { name: 'رصيدك الجديد', value: formatMoney(user.balance), inline: false }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in trade command:', error);
      await message.reply('❌ حدث خطأ أثناء التداول.');
    }
  }
};