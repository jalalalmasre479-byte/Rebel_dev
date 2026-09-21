// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, readConfig, checkLevelUpAndJob } = require('../utils/helpers'); 
module.exports = {
  name: 'طلاق',
  aliases: ['divorce'],
  category: 'bank',
  execute: async (message) => {
    try {
      const config = readConfig(); 
      if (!config || !config.economy || !config.economy.experience || !config.economy.experience.divorce) {
        return message.reply('❌ تعذر تحميل إعدادات الطلاق من البنك.');
      }
      const user = await getUser(message.author.id, message.guild.id);
      if (!user.marriage.partnerId) {
        return message.reply('❌ أنت لست متزوجاً!');
      }
      const partnerId = user.marriage.partnerId;
      const partner = await getUser(partnerId, message.guild.id);
      user.marriage.partnerId = null;
      user.marriage.marriedAt = null;
      partner.marriage.partnerId = null;
      partner.marriage.marriedAt = null;
      const xpAward = config.economy.experience.divorce.xpAward || 0;
      user.experience += xpAward;
      const leveledUp = await checkLevelUpAndJob(user, config);
      await user.save();
      await partner.save();
      const partnerUser = await message.client.users.fetch(partnerId);
      let description = `تم الطلاق من ${partnerUser}.`;
      description += `\nكسبت ${xpAward} نقطة خبرة.`;
      if (leveledUp) {
        description += `\n🎉 لقد وصلت إلى المستوى ${user.level} وحصلت على وظيفة **${user.job}** جديدة!`;
      }
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💔 طلاق')
        .setDescription(description)
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('💔 طلاق')
          .setDescription(`${message.author.tag} طلقك.`)
          .setTimestamp();
        await partnerUser.send({ embeds: [dmEmbed] });
      } catch (err) {
      }
    } catch (error) {
      console.error('Error in divorce command:', error);
      await message.reply('❌ حدث خطأ أثناء الطلاق.');
    }
  }
};