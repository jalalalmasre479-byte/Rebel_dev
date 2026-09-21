// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, formatMoney } = require('../utils/helpers');

module.exports = {
  name: 'مخالفة',
  aliases: ['ticket', 'fine'],
  category: 'bank',

  execute: async (message, args) => {
    const user = await getUser(message.author.id, message.guild.id);
    const tickets = user.tickets || [];
    if (!args[0]) {
      const unpaid = tickets.filter(t => !t.paid);
      if (unpaid.length === 0) return message.reply('✅ ليس لديك مخالفات غير مدفوعة!');
      const list = unpaid.map(t => `\`${t.ticketId}\` — ${formatMoney(t.amount)}`).join('\n');
      const embed = new EmbedBuilder()
        .setColor('#FF9800')
        .setTitle('🚓 مخالفاتك غير المدفوعة')
        .setDescription(list)
        .setFooter({ text: 'استخدم: مخالفة <رقم_المخالفة> لدفعها' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }
    const ticketId = args[0].toUpperCase();
    const ticketIndex = tickets.findIndex(t => t.ticketId === ticketId && !t.paid);
    if (ticketIndex === -1) return message.reply('❌ المخالفة غير موجودة أو تم دفعها بالفعل.');

    const ticket = tickets[ticketIndex];
    if (user.balance < ticket.amount) {
      return message.reply(`❌ رصيدك غير كافٍ! المطلوب: **${formatMoney(ticket.amount)}** | رصيدك: **${formatMoney(user.balance)}**`);
    }

    user.balance -= ticket.amount;
    user.tickets[ticketIndex].paid = true;
    user.tickets[ticketIndex].paidAt = new Date();
    await user.save();

    const embed = new EmbedBuilder()
      .setColor('#4CD964')
      .setTitle('✅ تم دفع المخالفة')
      .addFields(
        { name: 'رقم المخالفة', value: ticketId, inline: true },
        { name: 'المبلغ المدفوع', value: formatMoney(ticket.amount), inline: true },
        { name: 'رصيدك الجديد', value: formatMoney(user.balance), inline: false }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
