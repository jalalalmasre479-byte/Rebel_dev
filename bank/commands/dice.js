// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getUser, checkCooldown, setCooldown, parseAmount, formatMoney, randomInt, readConfig, checkLevelUpAndJob } = require('../utils/helpers');
const { createDiceImage } = require('../utils/canvas');

module.exports = {
  name: 'نرد',
  aliases: ['dice'],
  category: 'bank',
  
  execute: async (message, args) => {
    try {
      const config = readConfig();
      if (!config || !config.economy || !config.economy.experience || !config.economy.experience.dice) {
        return message.reply('❌ تعذر تحميل إعدادات النرد من البنك.');
      }

      if (args.length === 0) {
        return message.reply('❌ الاستخدام: `نرد <المبلغ>` أو `نرد كامل/نص/ربع`');
      }
      
      const user = await getUser(message.author.id, message.guild.id);
      const cooldown = checkCooldown(user, 'dice');
      if (!cooldown.ready) {
        return message.reply(`⏰ يجب الانتظار ${cooldown.remainingFormatted} للعب مرة أخرى.`);
      }
      const amount = parseAmount(args[0], user.balance);
      
      if (!amount || amount <= 0) {
        return message.reply('❌ المبلغ غير صالح!');
      }
      
      if (amount < config.games.dice.minBet) {
        return message.reply(`❌ الحد الأدنى للمراهنة هو ${formatMoney(config.games.dice.minBet)}`);
      }
      
      if (amount > user.balance) {
        return message.reply(`❌ ليس لديك رصيد كافٍ! رصيدك: ${formatMoney(user.balance)}`);
      }
      
      const playerWins = Math.random() < config.adminSettings.winRate;
      let playerRoll;
      let botRoll;
      let result;

      if (playerWins) {
        result = 'win';
        playerRoll = randomInt(4, 6);
        botRoll = randomInt(1, playerRoll - 1);
      } else {
        result = 'lose';
        botRoll = randomInt(4, 6);
        playerRoll = randomInt(1, botRoll - 1);
      }
      if (Math.random() < 0.1) {
        result = 'tie';
        playerRoll = randomInt(1, 6);
        botRoll = playerRoll;
      }
      
      let newBalance = user.balance;
      let xpGained = 0;
      
      if (result === 'win') {
        newBalance += amount;
        xpGained = config.economy.experience.dice.xpAward || 0;
        if (amount > user.stats.highestEarned) {
          user.stats.highestEarned = amount;
        }
      } else if (result === 'lose') {
        newBalance -= amount;
        xpGained = config.economy.experience.dice.xpOnFailAward || 0;
        if (amount > user.stats.highestLost) {
          user.stats.highestLost = amount;
        }
      } else { 
        xpGained = config.economy.experience.dice.xpOnFailAward || 0;
      }
      
      user.balance = newBalance;
      user.experience += xpGained;
      const leveledUp = await checkLevelUpAndJob(user, config);

      await setCooldown(user, 'dice');
      await user.save();
      
      const playerAvatarURL = message.author.displayAvatarURL({ extension: 'png', size: 128 });
      const imageBuffer = await createDiceImage(playerRoll, botRoll, result, amount, message.author.username, playerAvatarURL);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'dice.png' });
      
      let description = '';
      if (leveledUp) {
        description += `🎉 لقد وصلت إلى المستوى ${user.level} وحصلت على وظيفة **${user.job}** جديدة!\n`;
      }
      description += `كسبت ${xpGained} نقطة خبرة.`;

      const embed = new EmbedBuilder()
        .setColor(result === 'win' ? '#00FF00' : result === 'lose' ? '#FF0000' : '#FFA500')
        .setTitle('🎲 لعبة النرد')
        .setDescription(description)
        .addFields(
          { name: 'أنت', value: `🎲 ${playerRoll}`, inline: true },
          { name: 'البوت', value: `🎲 ${botRoll}`, inline: true },
          { name: 'النتيجة', value: result === 'win' ? '🎉 فزت!' : result === 'lose' ? '😢 خسرت!' : '🤝 تعادل!', inline: true },
          { name: 'رصيدك الجديد', value: formatMoney(user.balance), inline: false }
        )
        .setImage('attachment://dice.png')
        .setTimestamp();
      
      await message.reply({ files: [attachment] });
      
    } catch (error) {
      console.error('Error in dice command:', error);
      await message.reply('❌ حدث خطأ أثناء لعب النرد.');
    }
  }
};