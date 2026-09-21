// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------


const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const { setClient, setActiveGuild } = require('./utils/guild-store');

const bankCommands = new Collection();
const bankConfigPath = path.join(__dirname, 'config', 'bank-config.json');

function readBankConfigSafe() {
    try {
        if (!fs.existsSync(bankConfigPath)) return null;
        return JSON.parse(fs.readFileSync(bankConfigPath, 'utf8'));
    } catch (err) {
        console.error(err);
        return null;
    }
}

const commandsPath = path.join(__dirname, 'commands');
try {
    if (!fs.existsSync(commandsPath)) {
        console.error(`Bank commands directory not found: ${commandsPath}`);
        fs.mkdirSync(commandsPath, { recursive: true });
    }
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            const command = require(path.join(commandsPath, file));
            if (!command.name || typeof command.execute !== 'function') continue;
            bankCommands.set(command.name, command);
            if (Array.isArray(command.aliases)) {
                for (const alias of command.aliases) bankCommands.set(alias, command);
            }
            console.log(`Loaded bank command: ${command.name}`);
        } catch (err) {
            console.error(`Error loading ${file}:`, err.message);
        }
    }
} catch (err) {
    console.error(err);
}

const { startPriceUpdater } = require('./utils/helpers');
startPriceUpdater();

async function handleBankCommand(message, commandName, args) {
    setClient(message.client);
    setActiveGuild(message.guild?.id || null);

    const config = readBankConfigSafe();
    const adminSettings = config?.adminSettings || {};
    const bankChannels = Array.isArray(adminSettings.bankChannels) ? adminSettings.bankChannels : [];

    if (Array.isArray(adminSettings.blacklistedUsers) && adminSettings.blacklistedUsers.includes(message.author.id)) {
        try { await message.reply('❌ | أنت ممنوع من استخدام أوامر البنك!'); } catch {}
        return true;
    }
    if (bankChannels.length > 0 && !bankChannels.includes(message.channel.id)) {
        try { await message.reply(''); } catch {}
        return false;
    }

    const command = bankCommands.get(commandName);
    if (!command) return false;

    try {
        await command.execute(message, args);
        return true;
    } catch (err) {
        console.error(`Error executing bank command '${commandName}':`, err);
        try { await message.reply('❌ حدث خطأ أثناء تنفيذ الأمر.'); } catch {}
        return true;
    }
}

async function handleBankInteraction(interaction) {
    setClient(interaction.client);
    setActiveGuild(interaction.guild?.id || null);

    try {
        const customId = interaction.customId;
        let handled = false;

        if (customId.startsWith('land_')) { 
            const c = bankCommands.get('أرض'); 
            if (c?.handleInteraction) { await c.handleInteraction(interaction); handled = true; } 
        } else if (customId.startsWith('market_')) { 
            const c = bankCommands.get('سوق'); 
            if (c?.handleInteraction) { await c.handleInteraction(interaction); handled = true; } 
        } else if (customId.startsWith('top_')) { 
            const c = bankCommands.get('توب'); 
            if (c?.handleInteraction) { await c.handleInteraction(interaction); handled = true; } 
        } else if (customId.startsWith('admin_select_') || customId.startsWith('car_admin_') || customId.startsWith('acp_p_') || customId.startsWith('acp_b_') || customId.startsWith('color_apply_modal_')) { 
            const c = bankCommands.get('اعداد'); 
            if (c?.handleInteraction) { await c.handleInteraction(interaction); handled = true; } 
        } else if (customId.startsWith('fruit_')) { 
            handled = true; 
        } else if (customId.startsWith('auction_')) { 
            const c = bankCommands.get('مزاد'); 
            if (c?.handleInteraction) { await c.handleInteraction(interaction); handled = true; } 
        } else if (customId.startsWith('garage_')) { 
            const c = bankCommands.get('كراج'); 
            if (c?.handleInteraction) { await c.handleInteraction(interaction); handled = true; } 
        } else if (customId.startsWith('harraj_')) { 
            const c = bankCommands.get('حراج'); 
            if (c?.handleInteraction) { await c.handleInteraction(interaction); handled = true; } 
        } else if (customId.startsWith('hejolah_')) { 
            const c = bankCommands.get('هجولة'); 
            if (c?.handleInteraction) { await c.handleInteraction(interaction); handled = true; } 
        } else if (customId.startsWith('bankhelp_')) {
            handled = true;
        }

        if (!handled && interaction.isMessageComponent()) { 
            if (!interaction.deferred && !interaction.replied) { 
                await interaction.reply({ content: '❌ هذا التفاعل غير مدعوم.', ephemeral: true }).catch(() => {}); 
            } 
        } 

    } catch (err) {
        console.error(err);
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({ content: `❌ حدث خطأ: ${err.message}`, ephemeral: true }).catch(() => {});
        }
    }
}

module.exports = { bankCommands, handleBankCommand, handleBankInteraction };
      
