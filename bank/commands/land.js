// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, formatMoney, hasMaterials, getMaterialEmoji, getMaterialName, collectLandIncome, readConfig, checkLevelUpAndJob } = require('../utils/helpers');
const { createLandImage } = require('../utils/canvas');

module.exports = {
  name: 'أرض',
  aliases: ['land', 'lands', 'أراضي'],
  category: 'bank',
  
  execute: async (message) => {
    try {
      const config = readConfig();
      if (!config || !config.lands) {
        return message.reply('❌ تعذر تحميل إعدادات الأراضي من البنك.');
      }
      const user = await getUser(message.author.id, message.guild.id);
      const imageBuffer = await createLandImage(user, message.author);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'lands.png' });
      const landOptions = [];
      
      for (const [landId, landConfig] of Object.entries(config.lands)) {
        const userLand = user.lands.find(l => l.landId === landId);
        
        if (userLand) {
          const currentLevel = userLand.level;
          const nextLevel = landConfig.levels[currentLevel];
          
          if (nextLevel) {
            landOptions.push({
              label: `ترقية ${landConfig.name} (المستوى ${currentLevel + 1})`,
              description: `السعر: ${formatMoney(nextLevel.price)}`,
              value: `upgrade_${landId}`,
              emoji: landConfig.emoji
            });
          }
        } else {
          const level1 = landConfig.levels[0];
          landOptions.push({
            label: `شراء ${landConfig.name}`,
            description: `السعر: ${formatMoney(level1.price)}`,
            value: `buy_${landId}`,
            emoji: landConfig.emoji
          });
        }
      }
      
      if (landOptions.length === 0) {
        landOptions.push({
          label: 'لا توجد أراضي متاحة',
          description: 'لقد اشتريت كل الأراضي!',
          value: 'none'
        });
      }
      
      const landMenu = new StringSelectMenuBuilder()
        .setCustomId(`land_action_${message.author.id}`)
        .setPlaceholder('اختر أرض لشرائها أو ترقيتها')
        .addOptions(landOptions);
      const collectButton = new ButtonBuilder()
        .setCustomId(`land_collect_${message.author.id}`)
        .setLabel('جمع الأرباح')
        .setStyle(ButtonStyle.Success)
        .setEmoji('💰');
      
      const row1 = new ActionRowBuilder().addComponents(landMenu);
      const row2 = new ActionRowBuilder().addComponents(collectButton);
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🏗️ أراضيك')
        .setDescription('اختر أرضاً لشرائها أو ترقيتها، أو اجمع أرباحك!')
        .setImage('attachment://lands.png')
        .addFields(
          { name: 'رصيدك', value: formatMoney(user.balance), inline: true },
          { name: 'عدد الأراضي', value: user.lands.length.toString(), inline: true }
        );
      
      await message.reply({
        embeds: [embed],
        files: [attachment],
        components: [row1, row2]
      });
      
    } catch (error) {
      console.error('Error in land command:', error);
      await message.reply('❌ حدث خطأ أثناء عرض الأراضي.');
    }
  },
  handleInteraction: async (interaction) => {
    try {
      const config = readConfig();
      if (!config || !config.lands || !config.economy || !config.economy.experience || !config.economy.experience.land) {
        return interaction.reply({ content: '❌ تعذر تحميل إعدادات الأراضي من البنك.', ephemeral: true });
      }

      if (!interaction.customId.startsWith('land_')) return;
      
      const userId = interaction.customId.split('_')[2];
      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: '❌ هذا ليس لك!',
          ephemeral: true
        });
      }
      
      const user = await getUser(userId, interaction.guild.id);
      
      if (interaction.isButton() && interaction.customId.startsWith('land_collect_')) {
        const income = await collectLandIncome(user);
        
        if (income === 0) {
          return interaction.reply({
            content: '❌ لا توجد أرباح لجمعها حالياً! (أقل من دقيقة)',
            ephemeral: true
          });
        }
        
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('💰 جمع الأرباح')
          .setDescription(`تم جمع ${formatMoney(income)} من أراضيك!`)
          .addFields(
            { name: 'رصيدك الجديد', value: formatMoney(user.balance), inline: false }
          )
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
      }
      
      if (interaction.isStringSelectMenu()) {
        const value = interaction.values[0];
        
        if (value === 'none') {
          return interaction.reply({
            content: '🎉 لقد اشتريت كل الأراضي المتاحة!',
            ephemeral: true
          });
        }
        
        const [action, landId] = value.split('_');
        const landConfig = config.lands[landId];
        const userLand = user.lands.find(l => l.landId === landId);
        
        let level, levelData, isUpgrade;
        
        if (action === 'buy') {
          level = 1;
          levelData = landConfig.levels[0];
          isUpgrade = false;
        } else {
          level = userLand.level + 1;
          levelData = landConfig.levels[level - 1];
          isUpgrade = true;
        }
        if (user.balance < levelData.price) {
          const materialsText = Object.entries(levelData.materials)
            .map(([mat, amount]) => `${getMaterialEmoji(mat)} **${getMaterialName(mat)}** x${amount}`)
            .join('\n');
          
          return interaction.reply({
            content: `❌ **لا تملك الموارد أو الرصيد الكافي.**\n\n**رصيد** ${formatMoney(user.balance)}\n\n**الموارد المطلوبة:**\n${materialsText}`,
            ephemeral: true
          });
        }
        if (!hasMaterials(user, levelData.materials)) {
          const materialsText = Object.entries(levelData.materials)
            .map(([mat, amount]) => {
              const has = user.materials[mat] || 0;
              return `${getMaterialEmoji(mat)} **${getMaterialName(mat)}** x${amount} (لديك: ${has})`;
            })
            .join('\n');
          
          return interaction.reply({
            content: `❌ **لا تملك الموارد الكافية.**\n\n**رصيد** ${formatMoney(user.balance)}\n\n**الموارد المطلوبة:**\n${materialsText}`,
            ephemeral: true
          });
        }
        user.balance -= levelData.price;
        for (const [mat, amount] of Object.entries(levelData.materials)) {
          user.materials[mat] -= amount;
        }
        if (isUpgrade) {
          userLand.level = level;
        } else {
          user.lands.push({
            landId: landId,
            level: 1,
            lastCollected: new Date()
          });
        }
        
        const xpAward = config.economy.experience.land.xpAward || 0;
        user.experience += xpAward;
        const leveledUp = await checkLevelUpAndJob(user, config);

        await user.save();
        
        let description = `${isUpgrade ? 'تمت ترقية' : 'تم شراء'} ${landConfig.emoji} **${landConfig.name}** ${isUpgrade ? `إلى المستوى ${level}` : ''} بنجاح!`;
        description += `\nكسبت ${xpAward} نقطة خبرة.`;
        if (leveledUp) {
            description += `\n🎉 لقد وصلت إلى المستوى ${user.level} وحصلت على وظيفة **${user.job}** جديدة!`;
        }

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle(isUpgrade ? '⬆️ ترقية أرض' : '🎉 شراء أرض')
          .setDescription(description)
          .addFields(
            { name: 'التكلفة', value: formatMoney(levelData.price), inline: true },
            { name: 'الدخل/دقيقة', value: formatMoney(levelData.incomePerMinute), inline: true },
            { name: 'رصيدك الجديد', value: formatMoney(user.balance), inline: false }
          )
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      console.error('Error in land interaction:', error);
      await interaction.reply({
        content: '❌ حدث خطأ!',
        ephemeral: true
      }).catch(() => {});
    }
  }
};