// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, formatMoney, getMaterialName, getMaterialEmoji, readConfig, checkLevelUpAndJob, getMaterialPrices } = require('../utils/helpers');
module.exports = {
  name: 'شراء',
  aliases: ['buy'],
  category: 'bank',
  execute: async (message, args) => {
    try {
      const config = readConfig(); 
      if (!config || !config.material_definitions || !config.economy || !config.economy.experience || !config.economy.experience.buy) {
        return message.reply('❌ تعذر تحميل إعدادات المواد أو الخبرة من البنك.');
      }
      if (args.length < 2) {
        return message.reply('❌ الاستخدام: `شراء <الكمية> <المادة>`\nمثال: `شراء 1000 خشب`');
      }
      const amount = parseInt(args[0].replace(/[,\s]/g, ''));
      const materialInput = args.slice(1).join(' ').toLowerCase();
      if (isNaN(amount) || amount <= 0) {
        return message.reply('❌ الكمية غير صالحة!');
      }
      let materialId = null;
      for (const [id, mat] of Object.entries(config.material_definitions)) { 
        if (mat.name.toLowerCase() === materialInput || id === materialInput) {
          materialId = id;
          break;
        }
      }
      if (!materialId) {
        return message.reply('❌ المادة غير موجودة! المواد المتاحة: ' + Object.values(config.material_definitions).map(m => m.name).join(', ')); 
      }
      const user = await getUser(message.author.id, message.guild.id);
      const material = config.material_definitions[materialId];
      const prices = getMaterialPrices(materialId); 
      const cost = prices.buyPrice * amount;
      if (cost > user.balance) {
        return message.reply(`❌ ليس لديك رصيد كافٍ! تحتاج ${formatMoney(cost)}`);
      }
      user.balance -= cost;
      user.materials[materialId] = (user.materials[materialId] || 0) + amount;
      const xpAward = config.economy.experience.buy.xpAward || 0;
      user.experience += xpAward;
      const leveledUp = await checkLevelUpAndJob(user, config);
      await user.save();
      let description = `تم شراء ${amount} ${material.emoji} ${material.name} بنجاح!`;
      description += `\nكسبت ${xpAward} نقطة خبرة.`;
      if (leveledUp) {
        description += `\n🎉 لقد وصلت إلى المستوى ${user.level} وحصلت على وظيفة **${user.job}** جديدة!`;
      }
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ تم الشراء')
        .setDescription(description)
        .addFields(
          { name: 'التكلفة', value: formatMoney(cost), inline: true },
          { name: 'لديك الآن', value: `${user.materials[materialId]} ${material.emoji}`, inline: true },
          { name: 'رصيدك الجديد', value: formatMoney(user.balance), inline: false }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in buy command:', error);
      await message.reply('❌ حدث خطأ أثناء الشراء.');
    }
  }
};