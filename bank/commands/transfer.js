// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, formatMoney, parseAmount } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../config/bank-config.json');
function readConfigSafe() {
  try {
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading bank-config.json in transfer command:', err);
    return null;
  }
}
module.exports = {
  name: 'تحويل',
  aliases: ['transfer', 'pay'],
  category: 'bank',
  execute: async (message, args) => {
    try {
      const config = readConfigSafe();
      const adminSettings = config && config.adminSettings ? config.adminSettings : {};
      const transferEnabled = adminSettings.transferEnabled !== undefined ? adminSettings.transferEnabled : true;
      if (!transferEnabled) {
        return message.reply('❌ خاصية التحويل معطلة حالياً من قبل الإدارة.');
      }
      const senderUser = await getUser(message.author.id, message.guild.id);
      const recipient = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
      if (!recipient || recipient.bot || recipient.id === message.author.id) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ يرجى منشنة مستخدم صالح أو تقديم ID صحيح للتحويل إليه، ولا يمكنك التحويل لنفسك أو لبوت.');
        return message.reply({ embeds: [embed] });
      }
      const transferAmount = parseAmount(args[1], senderUser.balance);
      if (transferAmount === null || transferAmount <= 0) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ يرجى تحديد مبلغ صحيح للتحويل.');
        return message.reply({ embeds: [embed] });
      }
      if (senderUser.balance < transferAmount) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(`❌ ليس لديك رصيد كافٍ لتحويل ${formatMoney(transferAmount)}. رصيدك الحالي: ${formatMoney(senderUser.balance)}`);
        return message.reply({ embeds: [embed] });
      }
      const recipientUser = await getUser(recipient.id, message.guild.id);
      senderUser.balance -= transferAmount;
      recipientUser.balance += transferAmount;
      await senderUser.save();
      await recipientUser.save();
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ تحويل ناجح')
        .setDescription(`تم تحويل **${formatMoney(transferAmount)}** بنجاح من <@${message.author.id}> إلى <@${recipient.id}>.`)
        .addFields(
          { name: 'رصيدك الجديد', value: formatMoney(senderUser.balance), inline: true },
          { name: 'رصيد المستلم الجديد', value: formatMoney(recipientUser.balance), inline: true }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in transfer command:', error);
      await message.reply('❌ حدث خطأ أثناء عملية التحويل.');
    }
  }
};