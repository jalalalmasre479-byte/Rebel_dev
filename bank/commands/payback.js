// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, formatMoney, readConfig, checkLevelUpAndJob } = require('../utils/helpers'); 
module.exports = {
  name: 'سداد',
  aliases: ['payback', 'repay'],
  category: 'bank',
  execute: async (message) => {
    try {
      const config = readConfig(); 
      if (!config || !config.economy || !config.economy.experience || !config.economy.experience.payback) {
        return message.reply('❌ تعذر تحميل إعدادات سداد القرض أو الخبرة من البنك.');
      }
      const user = await getUser(message.author.id, message.guild.id);
      if (user.loan.amount === 0) {
        return message.reply('❌ ليس لديك قرض لسداده!');
      }
      const loanAmount = user.loan.amount;
      if (user.balance < loanAmount) {
        return message.reply(`❌ ليس لديك رصيد كافٍ لسداد القرض!\nتحتاج: ${formatMoney(loanAmount)}\nلديك: ${formatMoney(user.balance)}`);
      }
      user.balance -= loanAmount;
      user.loan.amount = 0;
      user.loan.takenAt = null;
      const xpAward = config.economy.experience.payback.xpAward || 0;
      user.experience += xpAward;
      const leveledUp = await checkLevelUpAndJob(user, config);
      await user.save();
      let description = `تم سداد القرض بقيمة ${formatMoney(loanAmount)} بنجاح!`;
      description += `\nكسبت ${xpAward} نقطة خبرة.`;
      if (leveledUp) {
        description += `\n🎉 لقد وصلت إلى المستوى ${user.level} وحصلت على وظيفة **${user.job}** جديدة!`;
      }
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ تم سداد القرض')
        .setDescription(description)
        .addFields(
          { name: 'رصيدك الجديد', value: formatMoney(user.balance), inline: false }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in payback command:', error);
      await message.reply('❌ حدث خطأ أثناء سداد القرض.');
    }
  }
};