// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, checkCooldown, setCooldown, formatMoney, randomInt, readConfig, checkLevelUpAndJob } = require('../utils/helpers'); 
module.exports = {
  name: 'بخشيش',
  aliases: ['tip', 'اكرامية'],
  category: 'bank',
  execute: async (message) => {
    try {
      const config = readConfig(); 
      if (!config || !config.economy || !config.economy.experience || !config.economy.experience.tip) {
        return message.reply('❌ تعذر تحميل إعدادات البخشيش من البنك.');
      }
      const user = await getUser(message.author.id, message.guild.id);
      const cooldown = checkCooldown(user, 'tip');
      if (!cooldown.ready) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(`⏰ يجب الانتظار ${cooldown.remainingFormatted} لأخذ بخشيش آخر.`);
        return message.reply({ embeds: [embed] });
      }
      const tipAmount = randomInt(config.economy.tipMinAmount, config.economy.tipMaxAmount);
      user.balance += tipAmount;
      const xpAward = config.economy.experience.tip.xpAward || 0;
      user.experience += xpAward;
      const leveledUp = await checkLevelUpAndJob(user, config);
      await setCooldown(user, 'tip');
      await user.save();
      let description = `حصلت على بخشيش بقيمة ${formatMoney(tipAmount)}!`;
      description += `\nكسبت ${xpAward} نقطة خبرة.`;
      if (leveledUp) {
        description += `\n🎉 لقد وصلت إلى المستوى ${user.level} وحصلت على وظيفة **${user.job}** جديدة!`;
      }
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('💵 بخشيش')
        .setDescription(description)
        .addFields(
          { name: 'رصيدك الجديد', value: formatMoney(user.balance), inline: false }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in tip command:', error);
      await message.reply('❌ حدث خطأ أثناء أخذ البخشيش.');
    }
  }
};