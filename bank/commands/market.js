// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUser, formatMoney, getMaterialName, getMaterialEmoji, getMaterialPrices, checkLevelUpAndJob } = require('../utils/helpers');
const { createMarketImage } = require('../utils/canvas');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config/bank-config.json');
function readConfig() {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading bank-config.json:', error);
    return null;
  }
}
let config = readConfig();

module.exports = {
  name: 'سوق',
  aliases: ['market', 'shop'],
  category: 'bank',
  
  execute: async (message) => {
    try {
      config = readConfig();
      if (!config || !config.material_definitions) {
        return message.reply('❌ تعذر تحميل إعدادات السوق.');
      }

      const user = await getUser(message.author.id, message.guild.id);
      const imageBuffer = await createMarketImage(user, message.author);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'market.png' });
      const buyOptions = [];
      const sellOptions = [];
      for (const [matId, matDef] of Object.entries(config.material_definitions)) {
        const prices = getMaterialPrices(matId);
        buyOptions.push({
          label: `شراء ${matDef.name}`,
          description: `السعر: ${formatMoney(prices.buyPrice)}`,
          value: `buy_${matId}`,
          emoji: matDef.emoji
        });
        
        sellOptions.push({
          label: `بيع ${matDef.name}`,
          description: `السعر: ${formatMoney(prices.sellPrice)}`,
          value: `sell_${matId}`,
          emoji: matDef.emoji
        });
      }
      buyOptions.push({
        label: 'شراء كل المواد',
        description: 'شراء كمية من كل المواد',
        value: 'buy_all',
        emoji: '🛒'
      });
      
      sellOptions.push({
        label: 'بيع كل المواد',
        description: 'بيع كل المواد لديك',
        value: 'sell_all',
        emoji: '💰'
      });
      
      const buyMenu = new StringSelectMenuBuilder()
        .setCustomId(`market_buy_${message.author.id}`)
        .setPlaceholder('اختر مادة لشرائها')
        .addOptions(buyOptions);
      
      const sellMenu = new StringSelectMenuBuilder()
        .setCustomId(`market_sell_${message.author.id}`)
        .setPlaceholder('اختر مادة لبيعها')
        .addOptions(sellOptions);
      
      const row1 = new ActionRowBuilder().addComponents(buyMenu);
      const row2 = new ActionRowBuilder().addComponents(sellMenu);
      
      const embed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('🏪 السوق')
        .setDescription('اختر المادة التي تريد شراءها أو بيعها من القائمة أدناه.')
        .setImage('attachment://market.png')
        .setFooter({ text: 'للشراء/البيع: اختر من القائمة ثم أرسل الكمية' });
      
      await message.reply({
        files: [attachment],
        components: [row1, row2]
      });
      
    } catch (error) {
      console.error('Error in market command:', error);
      await message.reply('❌ حدث خطأ أثناء عرض السوق.');
    }
  },
  handleInteraction: async (interaction) => {
    try {
      if (!interaction.isStringSelectMenu()) return;
      if (!interaction.customId.startsWith('market_')) return;
      config = readConfig();
      if (!config || !config.material_definitions) {
        return interaction.reply({ content: '❌ تعذر تحميل إعدادات السوق.', ephemeral: true });
      }

      const [, action, userId] = interaction.customId.split('_');
      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: '❌ هذا ليس لك!',
          ephemeral: true
        });
      }
      
      const value = interaction.values[0];
      const [operation, materialId] = value.split('_');
      await interaction.reply({
        content: `كم عدد ${materialId === 'all' ? 'المواد' : getMaterialName(materialId)} تريد ${operation === 'buy' ? 'شراء' : 'بيع'}ها؟\nأرسل الكمية في الدردشة.`,
        ephemeral: true
      });
      const filter = m => m.author.id === userId && !isNaN(m.content.replace(/[,\s]/g, ''));
      const collected = await interaction.channel.awaitMessages({
        filter,
        max: 1,
        time: 30000,
        errors: ['time']
      }).catch(() => null);
      
      if (!collected) {
        return interaction.followUp({
          content: '⏰ انتهى الوقت!',
          ephemeral: true
        });
      }
      
      const amount = parseInt(collected.first().content.replace(/[,\s]/g, ''));
      const user = await getUser(userId, interaction.guild.id);
      
      if (materialId === 'all') {
        if (operation === 'buy') {
          let totalCost = 0;
          for (const matIdDef of Object.keys(config.material_definitions)) {
            const prices = getMaterialPrices(matIdDef);
            totalCost += prices.buyPrice * amount;
          }
          
          if (totalCost > user.balance) {
            return collected.first().reply(`❌ ليس لديك رصيد كافٍ! تحتاج ${formatMoney(totalCost)}`);
          }
          
          user.balance -= totalCost;
          for (const matIdDef of Object.keys(config.material_definitions)) {
            user.materials[matIdDef] = (user.materials[matIdDef] || 0) + amount;
          }

          const xpAward = config.economy.experience.buy.xpAward || 0;
          user.experience += xpAward;
          const leveledUp = await checkLevelUpAndJob(user, config);
          
          await user.save();
          
          let replyMessage = `✅ تم شراء ${amount} من كل المواد بنجاح!\nالتكلفة: ${formatMoney(totalCost)}\nرصيدك: ${formatMoney(user.balance)}`;
          replyMessage += `\nكسبت ${xpAward} نقطة خبرة.`;
          if (leveledUp) {
            replyMessage += `\n🎉 لقد وصلت إلى المستوى ${user.level} وحصلت على وظيفة **${user.job}** جديدة!`;
          }

          return collected.first().reply(replyMessage);
        } else {
          let totalEarned = 0;
          for (const matIdDef of Object.keys(config.material_definitions)) {
            const prices = getMaterialPrices(matIdDef);
            const userAmount = user.materials[matIdDef] || 0;
            totalEarned += prices.sellPrice * userAmount;
            user.materials[matIdDef] = 0;
          }
          
          user.balance += totalEarned;
          const xpAward = config.economy.experience.sell.xpAward || 0;
          user.experience += xpAward;
          const leveledUp = await checkLevelUpAndJob(user, config);

          await user.save();
          
          let replyMessage = `✅ تم بيع جميع موادك بنجاح!\nالربح: ${formatMoney(totalEarned)}\nرصيدك: ${formatMoney(user.balance)}`;
          replyMessage += `\nكسبت ${xpAward} نقطة خبرة.`;
          if (leveledUp) {
            replyMessage += `\n🎉 لقد وصلت إلى المستوى ${user.level} وحصلت على وظيفة **${user.job}** جديدة!`;
          }

          return collected.first().reply(replyMessage);
        }
      } else {
        const prices = getMaterialPrices(materialId);
        const matDef = config.material_definitions[materialId];
        
        if (operation === 'buy') {
          const cost = prices.buyPrice * amount;
          
          if (cost > user.balance) {
            return collected.first().reply(`❌ ليس لديك رصيد كافٍ! تحتاج ${formatMoney(cost)}`);
          }
          
          user.balance -= cost;
          user.materials[materialId] = (user.materials[materialId] || 0) + amount;

          const xpAward = config.economy.experience.buy.xpAward || 0;
          user.experience += xpAward;
          const leveledUp = await checkLevelUpAndJob(user, config);

          await user.save();
          
          let replyMessage = `✅ تم شراء ${amount} ${matDef.emoji} ${matDef.name} بنجاح!\nالتكلفة: ${formatMoney(cost)}\nرصيدك: ${formatMoney(user.balance)}`;
          replyMessage += `\nكسبت ${xpAward} نقطة خبرة.`;
          if (leveledUp) {
            replyMessage += `\n🎉 لقد وصلت إلى المستوى ${user.level} وحصلت على وظيفة **${user.job}** جديدة!`;
          }

          return collected.first().reply(replyMessage);
        } else {
          const userAmount = user.materials[materialId] || 0;
          
          if (amount > userAmount) {
            return collected.first().reply(`❌ ليس لديك هذه الكمية! لديك ${userAmount} فقط.`);
          }
          
          const earned = prices.sellPrice * amount;
          user.balance += earned;
          user.materials[materialId] -= amount;

          const xpAward = config.economy.experience.sell.xpAward || 0;
          user.experience += xpAward;
          const leveledUp = await checkLevelUpAndJob(user, config);

          await user.save();
          
          let replyMessage = `✅ تم بيع ${amount} ${matDef.emoji} ${matDef.name} بنجاح!\nالربح: ${formatMoney(earned)}\nرصيدك: ${formatMoney(user.balance)}`;
          replyMessage += `\nكسبت ${xpAward} نقطة خبرة.`;
          if (leveledUp) {
            replyMessage += `\n🎉 لقد وصلت إلى المستوى ${user.level} وحصلت على وظيفة **${user.job}** جديدة!`;
          }

          return collected.first().reply(replyMessage);
        }
      }
      
    } catch (error) {
      console.error('Error in market interaction:', error);
      await interaction.followUp({
        content: '❌ حدث خطأ!',
        ephemeral: true
      }).catch(() => {});
    }
  }
};