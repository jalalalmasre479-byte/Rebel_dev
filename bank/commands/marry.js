// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, checkCooldown, setCooldown, readConfig, checkLevelUpAndJob } = require('../utils/helpers');

module.exports = {
  name: 'زواج',
  aliases: ['marry', 'propose'],
  category: 'bank',
  
  execute: async (message, args) => {
    try {
      const config = readConfig();
      if (!config || !config.economy || !config.economy.experience || !config.economy.experience.marriage) {
        return message.reply('❌ تعذر تحميل إعدادات الزواج من البنك.');
      }
      
      const user = await getUser(message.author.id, message.guild.id);
      
      if (user.marriage.partnerId) {
        return message.reply('❌ أنت متزوج بالفعل! استخدم `طلاق` أولاً.');
      }

      if (args.length === 0) {
        return message.reply('❌ الاستخدام: `زواج <@المستخدم>`');
      }

      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        return message.reply('❌ يرجى الإشارة إلى المستخدم الذي تريد الزواج منه!');
      }

      if (targetUser.id === message.author.id) {
        return message.reply('❌ لا يمكنك الزواج من نفسك!');
      }

      if (targetUser.bot) {
        return message.reply('❌ لا يمكنك الزواج من بوت!');
      }

      const partner = await getUser(targetUser.id, message.guild.id);

      if (partner.marriage.partnerId) {
        return message.reply(`❌ ${targetUser.tag} متزوج بالفعل!`);
      }

      const cooldown = checkCooldown(user, 'marriage');
      if (!cooldown.ready) {
        return message.reply(`⏰ يجب الانتظار ${cooldown.remainingFormatted} لإرسال عرض زواج آخر.`);
      }

      await setCooldown(user, 'marriage');

      const acceptButton = new ButtonBuilder()
        .setCustomId(`marry_accept_${message.author.id}_${targetUser.id}`)
        .setLabel('موافق')
        .setStyle(ButtonStyle.Success);

      const declineButton = new ButtonBuilder()
        .setCustomId(`marry_decline_${message.author.id}_${targetUser.id}`)
        .setLabel('رفض')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('💖 عرض زواج')
        .setDescription(`${targetUser}, هل تقبل عرض الزواج من ${message.author.tag}؟`)
        .setFooter({ text: 'لديك 60 ثانية للرد.' })
        .setTimestamp();
      
      const reply = await message.reply({
        content: targetUser.toString(),
        embeds: [embed],
        components: [row]
      });

      const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === targetUser.id && i.customId.startsWith('marry_'),
        time: 60000,
        max: 1
      });

      collector.on('collect', async i => {
        if (i.customId.startsWith('marry_accept_')) {
          user.marriage.partnerId = targetUser.id;
          user.marriage.marriedAt = new Date();
          partner.marriage.partnerId = message.author.id;
          partner.marriage.marriedAt = new Date();

          const xpAward = config.economy.experience.marriage.xpAward || 0;
          user.experience += xpAward;
          partner.experience += xpAward;
          const userLeveledUp = await checkLevelUpAndJob(user, config);
          const partnerLeveledUp = await checkLevelUpAndJob(partner, config);

          await user.save();
          await partner.save();

          let acceptDescription = `🎉 ${message.author.tag} و ${targetUser.tag} متزوجان الآن!`;
          acceptDescription += `
كسب كل منكما ${xpAward} نقطة خبرة.`;
          if (userLeveledUp) {
            acceptDescription += `
${message.author.tag} وصل إلى المستوى ${user.level} وحصل على وظيفة **${user.job}** جديدة!`;
          }
          if (partnerLeveledUp) {
            acceptDescription += `
${targetUser.tag} وصل إلى المستوى ${partner.level} وحصل على وظيفة **${partner.job}** جديدة!`;
          }

          const acceptEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💖 زواج سعيد!')
            .setDescription(acceptDescription)
            .setTimestamp();

          await i.update({ embeds: [acceptEmbed], components: [] });
        } else if (i.customId.startsWith('marry_decline_')) {
          const declineEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('💔 عرض زواج مرفوض')
            .setDescription(`${targetUser.tag} رفض عرض الزواج من ${message.author.tag}.`)
            .setTimestamp();
          
          await i.update({ embeds: [declineEmbed], components: [] });
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#FF5733')
            .setTitle('⏰ انتهى الوقت')
            .setDescription(`لم يرد ${targetUser.tag} على عرض الزواج من ${message.author.tag} في الوقت المحدد.`)
            .setTimestamp();
          
          await reply.edit({ embeds: [timeoutEmbed], components: [] });
        }
      });
      
    } catch (error) {
      console.error('Error in marry command:', error);
      await message.reply('❌ حدث خطأ أثناء محاولة الزواج.');
    }
  }
};