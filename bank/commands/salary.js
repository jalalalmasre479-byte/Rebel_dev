// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, checkCooldown, setCooldown, formatMoney, checkLevelUpAndJob, readConfig } = require('../utils/helpers'); 
module.exports = {
  name: 'راتب',
  aliases: ['salary', 'wage'],
  category: 'bank',
  execute: async (message) => {
    try {
      const config = readConfig(); 
      if (!config || !config.economy || !config.economy.experience || !config.economy.experience.salary) {
        return message.reply('❌ تعذر تحميل إعدادات الراتب من البنك.');
      }
      const user = await getUser(message.author.id, message.guild.id);
      const cooldown = checkCooldown(user, 'salary');
      if (!cooldown.ready) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(`⏰ يجب الانتظار ${cooldown.remainingFormatted} لأخذ الراتب مرة أخرى.`);
        return message.reply({ embeds: [embed] });
      }
      const userJob = user.job || 'Unemployed'; 
      const jobConfig = config.economy.jobs[userJob];
      let salaryAmount = 0;
      if (jobConfig) {
        salaryAmount = jobConfig.salary;
      } else {
        salaryAmount = config.economy.jobs.Unemployed.salary;
      }
      user.balance += salaryAmount;
      if (salaryAmount > user.stats.highestEarned) {
        user.stats.highestEarned = salaryAmount;
      }
      const xpAward = config.economy.experience.salary.xpAward || 0;
      user.experience += xpAward; 
      const leveledUp = await checkLevelUpAndJob(user, config); 
      await setCooldown(user, 'salary');
      await user.save(); 
      let description = `لقد تلقيت راتبك كـ **${user.job}** بقيمة ${formatMoney(salaryAmount)}!`;
      if (leveledUp) {
        description += `\n🎉 لقد وصلت إلى المستوى ${user.level} وحصلت على وظيفة **${user.job}** جديدة!`;
      }
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('💰 راتب')
        .setDescription(description)
        .addFields(
          { name: 'رصيدك الجديد', value: formatMoney(user.balance), inline: false }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in salary command:', error);
      await message.reply('❌ حدث خطأ أثناء محاولة أخذ الراتب.');
    }
  }
};