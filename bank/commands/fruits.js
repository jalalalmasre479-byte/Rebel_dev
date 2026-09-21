// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, checkCooldown, setCooldown, formatMoney, randomInt } = require('../utils/helpers');
const config = require('../config/bank-config.json');
module.exports = {
  name: 'فواكه',
  aliases: ['fruits', 'fruit'],
  category: 'bank',
  execute: async (message) => {
    try {
      const user = await getUser(message.author.id, message.guild.id);
      const cooldown = checkCooldown(user, 'fruits');
      if (!cooldown.ready) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(`⏰ يجب الانتظار ${cooldown.remainingFormatted} للعب مرة أخرى.`);
        return message.reply({ embeds: [embed] });
      }
      const fruits = config.games.fruits.fruits;
      const buttonCount = config.games.fruits.buttonCount;
      const duration = config.games.fruits.duration;
      const buttonFruits = [];
      for (let i = 0; i < buttonCount; i++) {
        buttonFruits.push(fruits[randomInt(0, fruits.length - 1)]);
      }
      const targetIndex = randomInt(0, buttonCount - 1);
      const targetFruit = buttonFruits[targetIndex];
      const rows = [];
      for (let i = 0; i < 4; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 5; j++) {
          const index = i * 5 + j;
          if (index < buttonCount) {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`fruit_${message.author.id}_${index}`)
                .setEmoji(buttonFruits[index])
                .setStyle(ButtonStyle.Secondary)
            );
          }
        }
        rows.push(row);
      }
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🍎 لعبة الفواكه')
        .setDescription('انتظر حتى تظهر الفاكهة المطلوبة...')
        .setFooter({ text: 'تحضير اللعبة...' });
      const gameMessage = await message.reply({
        embeds: [embed],
        components: rows
      });
      await new Promise(resolve => setTimeout(resolve, duration));
      for (const row of rows) {
        for (const button of row.components) {
          button.setEmoji('❓');
        }
      }
      embed.setDescription(`اضغط على الزر الذي يحتوي على: ${targetFruit}`)
        .setFooter({ text: 'لديك 10 ثوانٍ!' })
        .setColor('#00FF00');
      await gameMessage.edit({
        embeds: [embed],
        components: rows
      });
      const gameData = {
        targetIndex,
        targetFruit,
        buttonFruits,
        userId: message.author.id,
        used: false
      };
      const filter = i => i.customId.startsWith(`fruit_${message.author.id}_`) && i.user.id === message.author.id;
      try {
        const interaction = await gameMessage.awaitMessageComponent({
          filter,
          time: 10000
        });
        if (gameData.used) {
          return interaction.reply({
            content: '❌ اللعبة انتهت بالفعل!',
            ephemeral: true
          });
        }
        gameData.used = true;
        const clickedIndex = parseInt(interaction.customId.split('_')[2]);
        for (const row of rows) {
          for (const button of row.components) {
            button.setDisabled(true);
            const idx = parseInt(button.data.custom_id.split('_')[2]);
            button.setEmoji(buttonFruits[idx]);
          }
        }
        if (clickedIndex === targetIndex) {
          const reward = randomInt(10000, 50000);
          user.balance += reward;
          if (reward > user.stats.highestEarned) {
            user.stats.highestEarned = reward;
          }
          await setCooldown(user, 'fruits');
          embed.setDescription(`✅ صحيح! حصلت على ${formatMoney(reward)}!`)
            .setColor('#00FF00')
            .setFields({ name: 'رصيدك الجديد', value: formatMoney(user.balance) });
          await interaction.update({
            embeds: [embed],
            components: rows
          });
        } else {
          await setCooldown(user, 'fruits');
          embed.setDescription(`❌ خطأ! الفاكهة الصحيحة كانت في الزر رقم ${targetIndex + 1}`)
            .setColor('#FF0000');
          await interaction.update({
            embeds: [embed],
            components: rows
          });
        }
      } catch (err) {
        if (!gameData.used) {
          gameData.used = true;
          for (const row of rows) {
            for (const button of row.components) {
              button.setDisabled(true);
              const idx = parseInt(button.data.custom_id.split('_')[2]);
              button.setEmoji(buttonFruits[idx]);
            }
          }
          await setCooldown(user, 'fruits');
          embed.setDescription(`⏰ انتهى الوقت! الفاكهة الصحيحة كانت في الزر رقم ${targetIndex + 1}`)
            .setColor('#FF0000');
          await gameMessage.edit({
            embeds: [embed],
            components: rows
          });
        }
      }
    } catch (error) {
      console.error('Error in fruits command:', error);
      await message.reply('❌ حدث خطأ أثناء اللعب.');
    }
  }
};