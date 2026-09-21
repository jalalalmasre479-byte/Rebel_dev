// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const { AttachmentBuilder } = require("discord.js");
const { getUser, checkCooldown, setCooldown, parseAmount, formatMoney } = require('../utils/helpers');
const canvasUtils = require('../utils/canvas');
const path = require('path');
module.exports = {
  name: "قمار",
  aliases: ['gamble'],
  category: 'bank',
  description: "للمشاركة في لعبة القمار",
  execute: async (message, args) => {
    const config = require('../config/bank-config.json'); 
    const adminSettings = config.adminSettings;
    const bankChannels = Array.isArray(adminSettings.bankChannels) ? adminSettings.bankChannels : [];
    if (bankChannels.length > 0 && !bankChannels.includes(message.channel.id)) {
        return; 
    }
    const user = await getUser(message.author.id, message.guild.id);
    const cooldown = checkCooldown(user, 'gamble'); 
    if (!cooldown.ready) {
      return message.reply(`⌛ بيب تعال بعد \`${cooldown.remainingFormatted}\``);
    }
    if (adminSettings.blacklistedUsers && adminSettings.blacklistedUsers.includes(message.author.id)) {
      return message.react("🔒");
    }
    let amount = 0;
    const userBalance = user.balance;
    if (!args[0]) {
      return message.reply("اقل مبلغ للعب هو **1000$**"); 
    }
    amount = parseAmount(args[0], userBalance);
    const minBet = config.games.gamble.minBet || 1000;
    if (isNaN(amount) || amount < minBet) {
        return message.reply(`اقل مبلغ للعب هو **${formatMoney(minBet)}**`);
    }
    if (userBalance < amount) {
        return message.reply("هديها ما معك هالمبلغ");
    }
    const canvasConfig = require('../utils/canvas-config.js'); 
    const fruitImagePaths = canvasConfig.images.gamble.fruits;
    const fruitKeys = Object.keys(fruitImagePaths);
    const getRandomFruitPath = () => path.join('..', 'utils', fruitImagePaths[fruitKeys[Math.floor(Math.random() * fruitKeys.length)]]);
    const result1Path = getRandomFruitPath();
    const result2Path = getRandomFruitPath();
    const result3Path = getRandomFruitPath();
    const fruitList = Object.values(fruitImagePaths).map(p => path.join(__dirname, '..', 'utils', p)); 
    const fruits = await Promise.all(fruitList.map(p => canvasUtils.loadImage(p)));
    const result1Img = fruits[Math.floor(Math.random() * fruits.length)];
    const result2Img = fruits[Math.floor(Math.random() * fruits.length)];
    const result3Img = fruits[Math.floor(Math.random() * fruits.length)];
    let winnings = 0;
    let condition = "خاسر";
    const results = [result1Img, result2Img, result3Img];
    const matchedFruits = new Set(results); 
    if (matchedFruits.size <= 2) { 
      winnings = amount * 1.5; 
      condition = "فائز";
    }
    const finalBalance = userBalance - amount + winnings;
    user.balance = finalBalance;
    await setCooldown(user, 'gamble'); 
    await user.save(); 
    const imageBuffer = await canvasUtils.createGambleImage(
      result1Img, result2Img, result3Img,
      condition,
      winnings,
      amount,
      message.author, 
      message.guild.name 
    );
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'gamble.png' });
    const updatedBalance = user.balance; 
    const content = condition === "فائز" 
      ? `**↗️ ${formatMoney(winnings)}\n💵 ${formatMoney(updatedBalance)}**` 
      : `**↙️ ${formatMoney(amount)}\n💵 ${formatMoney(updatedBalance)}**`;
    message.reply({ content, files: [attachment] });
  },
};
