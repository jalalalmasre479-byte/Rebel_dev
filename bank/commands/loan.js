// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, checkCooldown, setCooldown, formatMoney } = require('../utils/helpers');
const config = require('../config/bank-config.json');
module.exports = {
  name: 'قرض',
  aliases: ['loan', 'borrow'],
  category: 'bank',
  execute: async (message, args) => {
    try {
      if (args.length === 0) {
        return message.reply(`❌ الاستخدام: \`قرض <المبلغ>\`\nالحد الأقصى: ${formatMoney(config.economy.loanMaxAmount)}`);
      }
      const user = await getUser(message.author.id, message.guild.id);
      const cooldown = checkCooldown(user, 'loan');
      if (!cooldown.ready) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(`⏰ يجب الانتظار ${cooldown.remainingFormatted} لأخذ قرض آخر.`);
        return message.reply({ embeds: [embed] });
      }
      if (user.loan.amount > 0) {
        return message.reply(`❌ لديك قرض قائم بقيمة ${formatMoney(user.loan.amount)}! قم بسداده أولاً.`);
      }
      const amount = parseInt(args[0].replace(/[,\s]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        return message.reply('❌ المبلغ غير صالح!');
      }
      if (amount > config.economy.loanMaxAmount) {
        return message.reply(`❌ الحد الأقصى للقرض هو ${formatMoney(config.economy.loanMaxAmount)}`);
      }
      const interest = Math.floor(amount * config.economy.loanInterestRate);
      const totalDue = amount + interest;
      user.balance += amount;
      user.loan.amount = totalDue;
      user.loan.takenAt = new Date();
      await setCooldown(user, 'loan');
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('💰 قرض')
        .setDescription(`تم إضافة ${formatMoney(amount)} إلى رصيدك!`)
        .addFields(
          { name: 'المبلغ المستلم', value: formatMoney(amount), inline: true },
          { name: 'الفائدة', value: formatMoney(interest), inline: true },
          { name: 'المبلغ المطلوب سداده', value: formatMoney(totalDue), inline: false },
          { name: 'رصيدك الجديد', value: formatMoney(user.balance), inline: false }
        )
        .setFooter({ text: 'استخدم "سداد" لسداد القرض' })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in loan command:', error);
      await message.reply('❌ حدث خطأ أثناء أخذ القرض.');
    }
  }
};