// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { getUser, checkCooldown, setCooldown, formatMoney, randomInt, readConfig, checkLevelUpAndJob } = require('../utils/helpers'); 
module.exports = {
  name: 'سرقة',
  aliases: ['rob', 'steal'],
  category: 'bank',
  execute: async (message, args) => {
    try {
      const config = readConfig(); 
      if (!config || !config.adminSettings || !config.economy || !config.economy.experience || !config.economy.experience.rob) {
        return message.reply('❌ تعذر تحميل إعدادات السرقة من البنك.');
      }
      const adminSettings = config.adminSettings;
      const economy = config.economy;
      if (args.length === 0) {
        return message.reply('❌ الاستخدام: `سرقة <@المستخدم>`');
      }
      const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
      if (!targetUser) {
        return message.reply('❌ لم يتم العثور على المستخدم!');
      }
      if (targetUser.id === message.author.id) {
        return message.reply('❌ لا يمكنك سرقة نفسك!');
      }
      if (targetUser.bot) {
        return message.reply('❌ لا يمكنك سرقة البوتات!');
      }
      const robber = await getUser(message.author.id, message.guild.id);
      const victim = await getUser(targetUser.id, message.guild.id);
      const cooldown = checkCooldown(robber, 'rob');
      if (!cooldown.ready) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(`⏰ يجب الانتظار ${cooldown.remainingFormatted} للسرقة مرة أخرى.`);
        return message.reply({ embeds: [embed] });
      }
      if (victim.protection.active && victim.protection.expiresAt > new Date()) {
        await setCooldown(robber, 'rob');
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('🛡️ محمي')
          .setDescription(`❌ ${targetUser.tag} محمي من السرقة!`)
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }
      if (adminSettings.voiceProtectionEnabled) {
        const victimMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (victimMember && victimMember.voice && victimMember.voice.channelId) {
          console.log(`Victim ${targetUser.tag} is in voice channel: ${victimMember.voice.channelId}`);
          console.log('Victim voice state:', victimMember.voice);
          await setCooldown(robber, 'rob');
          const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🛡️ حماية الروم الصوتي')
            .setDescription(`❌ لا يمكنك سرقة ${targetUser.tag} لأنه متواجد في روم صوتي حالياً حسب إعدادات الإدارة.`)
            .setTimestamp();
          return message.reply({ embeds: [embed] });
        }
      }
      if (victim.balance < economy.robMinAmount) {
        return message.reply(`❌ ${targetUser.tag} ليس لديه ما يكفي من المال للسرقة!`);
      }
      const success = Math.random() < (adminSettings.robSuccessRate ?? 0.4);
      await setCooldown(robber, 'rob');
      let embed;
      let xpGained = 0;
      if (success) {
        const stolenAmount = randomInt(
          economy.robMinAmount,
          Math.min(economy.robMaxAmount, victim.balance)
        );
        robber.balance += stolenAmount;
        victim.balance -= stolenAmount;
        robber.stats.totalStolen += stolenAmount;
        victim.stats.totalRobbed += stolenAmount;
        if (stolenAmount > robber.stats.highestEarned) {
          robber.stats.highestEarnest = stolenAmount;
        }
        if (stolenAmount > victim.stats.highestLost) {
          victim.stats.highestLost = stolenAmount;
        }
        xpGained = config.economy.experience.rob.xpAward || 0;
        await robber.save();
        await victim.save();
        embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🦹 سرقة ناجحة!')
          .setDescription(`نجحت في سرقة ${formatMoney(stolenAmount)} من ${targetUser.tag}!`)
          .addFields(
            { name: 'رصيدك الجديد', value: formatMoney(robber.balance), inline: false }
          )
          .setTimestamp();
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🚨 تمت سرقتك!')
            .setDescription(`${message.author.tag} سرق منك ${formatMoney(stolenAmount)}!`)
            .addFields(
              { name: 'رصيدك الجديد', value: formatMoney(victim.balance), inline: false }
            )
            .setTimestamp();
          await targetUser.send({ embeds: [dmEmbed] });
        } catch (err) {
        }
      } else {
        const fine = randomInt(5000, 20000);
        robber.balance -= fine;
        xpGained = config.economy.experience.rob.xpOnFailAward || 0;
        if (fine > robber.stats.highestLost) {
          robber.stats.highestLost = fine;
        }
        await robber.save();
        embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('👮 سرقة فاشلة!')
          .setDescription(`فشلت محاولة السرقة! تم تغريمك ${formatMoney(fine)}`)
          .addFields(
            { name: 'رصيدك الجديد', value: formatMoney(robber.balance), inline: false }
          )
          .setTimestamp();
      }
      robber.experience += xpGained;
      const leveledUp = await checkLevelUpAndJob(robber, config);
      let descriptionSuffix = `\nكسبت ${xpGained} نقطة خبرة.`;
      if (leveledUp) {
        descriptionSuffix += `\n🎉 لقد وصلت إلى المستوى ${robber.level} وحصلت على وظيفة **${robber.job}** جديدة!`;
      }
      embed.setDescription(embed.data.description + descriptionSuffix);
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in rob command:', error);
      await message.reply('❌ حدث خطأ أثناء السرقة.');
    }
  }
};