// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

let handleBankCommand = async () => false;
let handleBankInteraction = async () => {};

try {
  const bankPath = path.join(__dirname, 'bank', 'index.js');
  if (fs.existsSync(bankPath)) {
    const bankSystem = require('./bank/index.js');

    if (typeof bankSystem.handleBankCommand === 'function') {
      handleBankCommand = bankSystem.handleBankCommand;
      console.log('✅ handleBankCommand loaded successfully');
    } else {
      console.warn('⚠️ handleBankCommand is not a function in bank system');
    }

    if (typeof bankSystem.handleBankInteraction === 'function') {
      handleBankInteraction = bankSystem.handleBankInteraction;
      console.log('✅ handleBankInteraction loaded successfully');
    } else {
      console.warn('⚠️ handleBankInteraction is not a function in bank system');
    }

    if (bankSystem.bankCommands) {
      client.bankCommands = bankSystem.bankCommands;
      console.log('✅ client.bankCommands loaded successfully');
    } else {
      console.warn('⚠️ bankSystem.bankCommands not found or is empty');
    }

    console.log('✅ Bank system loaded successfully');
  }
} catch (error) {
  console.error('❌ Failed to load Bank System:', error);
}

const readAdminSettings = () => {
  try {
    const filePath = path.join(__dirname, 'admin_settings.json');
    if (!fs.existsSync(filePath)) return { adminRoles: [], eventRoles: [] };
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return { adminRoles: [], eventRoles: [] };
  }
};

const hasAdminPermission = (member) => {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const adminSettings = readAdminSettings();
  if (!adminSettings.adminRoles) return false;
  return member.roles.cache.some(role =>
    adminSettings.adminRoles.map(String).includes(role.id)
  );
};

const hasEventPermission = (member) => {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const adminSettings = readAdminSettings();
  if (!adminSettings.eventRoles) return false;
  return member.roles.cache.some(role =>
    adminSettings.eventRoles.map(String).includes(role.id)
  );
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB);
    console.log('\x1b[32m✅ Connected to MongoDB\x1b[0m');

    await client.login(process.env.TOKEN);
    console.log('\x1b[32m✅ Bot logged in successfully\x1b[0m');
  } catch (error) {
    console.error('❌ Startup error:', error);
  }
})();

client.on('ready', () => {
  console.log(`${client.user.username} is Online`);
  client.user.setActivity('Wick Studio', { type: 0 });
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const parts = message.content.trim().split(/ +/);
  const commandName = parts.shift()?.toLowerCase();
  const args = parts;

  if (typeof handleBankCommand === 'function' && commandName) {
    try {
      await handleBankCommand(message, commandName, args);
    } catch (error) {
      console.error('[Bank Command Error]:', error);
    }
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (typeof handleBankInteraction === 'function') {
      await handleBankInteraction(interaction);
    }
  } catch (error) {
    console.error('[Bank Interaction Error]:', error);
  }
});

module.exports = { client, hasAdminPermission, hasEventPermission, readAdminSettings };
