// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getUser, checkCooldown, setCooldown, formatMoney, weightedRandom, getMaterialEmoji, getMaterialName } = require('../utils/helpers');
const config = require('../config/bank-config.json');
const { createRouletteImage } = require('../utils/canvas');
module.exports = {
  name: 'حظ',
  aliases: ['luck', 'fortune'],
  category: 'bank',
  execute: async (message) => {
    try {
      const user = await getUser(message.author.id, message.guild.id);
      const cooldown = checkCooldown(user, 'luck');
      if (!cooldown.ready) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(`⏰ يجب الانتظار ${cooldown.remainingFormatted} لتجربة حظك مرة أخرى.`);
        return message.reply({ embeds: [embed] });
      }
      const { item: reward, index: rewardIndex } = weightedRandom(config.games.luck.rewards);
      let resultText = '';
      let color = '#FFA500';
      if (reward.type === 'money') {
        user.balance += reward.amount;
        resultText = `💰 حصلت على ${formatMoney(reward.amount)}!`;
        color = '#00FF00';
        if (reward.amount > user.stats.highestEarned) {
          user.stats.highestEarned = reward.amount;
        }
      } else if (reward.type === 'material') {
        user.materials[reward.material] = (user.materials[reward.material] || 0) + reward.amount;
        resultText = `${getMaterialEmoji(reward.material)} حصلت على ${reward.amount} ${getMaterialName(reward.material)}!`;
        color = '#00FFFF';
      } else {
        resultText = '😢 للأسف، لم تحصل على شيء هذه المرة!';
        color = '#FF0000';
      }
      await setCooldown(user, 'luck');
      await user.save();
      const imageBuffer = await createRouletteImage(rewardIndex, config.games.luck.rewards, message.author);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'roulette.png' });
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🎰 اختبار الحظ')
        .setDescription(resultText)
        .addFields(
          { name: 'رصيدك', value: formatMoney(user.balance), inline: false }
        )
        .setTimestamp();
      await message.reply({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error('Error in luck command:', error);
      await message.reply('❌ حدث خطأ أثناء اختبار الحظ.');
    }
  }
};