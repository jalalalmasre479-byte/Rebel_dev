// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getUser, formatMoney } = require('../utils/helpers');

const carsConfigPath = path.join(__dirname, '../config/cars-config.json');
function getCarsConfig() {
  try { return JSON.parse(fs.readFileSync(carsConfigPath, 'utf8')); } catch { return {}; }
}

module.exports = {
  name: 'تصليح',
  aliases: ['repair', 'fix'],
  category: 'bank',

  execute: async (message, args) => {
    const user = await getUser(message.author.id, message.guild.id);
    const userCars = user.cars || [];
    const damagedCars = userCars.filter(c => c.damage && c.damage > 0);

    if (damagedCars.length === 0) return message.reply('✅ جميع سياراتك بحالة ممتازة!');

    const cfg = getCarsConfig();
    const allCars = cfg.cars || [];
    const costPerDmg = cfg.repair?.costPerDurability || 500;

    if (!args[0]) {
      const list = damagedCars.map(dc => {
        const carData = allCars.find(c => c.id === dc.carId);
        const repairCost = dc.damage * costPerDmg;
        return `🚗 **${carData?.name || dc.carId}** — ضرر: ${dc.damage}% | تكلفة الإصلاح: ${formatMoney(repairCost)}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#FF9800')
        .setTitle('🔧 السيارات المتضررة')
        .setDescription(list)
        .setFooter({ text: 'استخدم: تصليح <id_السيارة> لإصلاحها' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const carId = args[0];
    const ownedCar = userCars.find(c => c.carId === carId);
    if (!ownedCar) return message.reply('❌ لا تملك هذه السيارة.');
    if (!ownedCar.damage || ownedCar.damage === 0) return message.reply('✅ هذه السيارة لا تحتاج تصليحاً!');

    const carData = allCars.find(c => c.id === carId);
    const repairCost = ownedCar.damage * costPerDmg;

    if (user.balance < repairCost) {
      return message.reply(`❌ رصيدك غير كافٍ! تكلفة الإصلاح: **${formatMoney(repairCost)}** | رصيدك: **${formatMoney(user.balance)}**`);
    }

    user.balance -= repairCost;
    const oldDamage = ownedCar.damage;
    ownedCar.damage = 0;
    await user.save();

    const embed = new EmbedBuilder()
      .setColor('#4CD964')
      .setTitle('🔧 تم الإصلاح!')
      .addFields(
        { name: 'السيارة', value: carData?.name || carId, inline: true },
        { name: 'الضرر المُصلَح', value: `${oldDamage}%`, inline: true },
        { name: 'التكلفة', value: formatMoney(repairCost), inline: true },
        { name: 'رصيدك الجديد', value: formatMoney(user.balance), inline: false }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
