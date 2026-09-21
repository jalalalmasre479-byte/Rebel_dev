// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    name: 'اوامر',
    aliases: ['بنك-اوامر', 'مساعدة-بنك'],
    description: 'يعرض جميع أوامر البنك المتاحة',

    async execute(message, args, client) {
        const commands = [];
        const commandFiles = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.js') && file !== 'commands.js' && file !== 'admin.js');

        for (const file of commandFiles) {
            const command = require(path.join(__dirname, file));
            const commandName = command.name || file.replace('.js', '');
            const commandDescription = command.description || 'لا يوجد وصف.';
            commands.push({ name: commandName, description: commandDescription });
        }

        if (!commands.length) return message.channel.send('لا توجد أوامر بنكية حالياً.');

        const commandsPerPage = 25;
        const totalPages = Math.ceil(commands.length / commandsPerPage);
        let page = 0;
        
        function generateEmbed(pageIndex) {
            const start = pageIndex * commandsPerPage;
            const current = commands.slice(start, start + commandsPerPage);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('قائمة أوامر البنك')
                .setDescription(`الصفحة ${pageIndex + 1} من ${totalPages}`)
                .setTimestamp()
                .setFooter({ text: `طلب بواسطة ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

            current.forEach(cmd => {
                embed.addFields({ name: `/${cmd.name}`, value: cmd.description, inline: true });
            });

            return embed;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bankhelp_first').setLabel('⏮').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('bankhelp_prev').setLabel('◀').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bankhelp_next').setLabel('▶').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bankhelp_last').setLabel('⏭').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('bankhelp_close').setLabel('❌').setStyle(ButtonStyle.Danger)
        );
        
        const msg = await message.channel.send({ embeds: [generateEmbed(page)], components: totalPages > 1 ? [row] : [] });

        if (totalPages <= 1) return;

        const collector = msg.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: '❌ هذا الزر ليس لك.', ephemeral: true });
            }

            try {
                if (interaction.customId === 'bankhelp_next') {
                    page = (page + 1) % totalPages;
                    await interaction.update({ embeds: [generateEmbed(page)], components: [row] });
                } else if (interaction.customId === 'bankhelp_prev') {
                    page = (page - 1 + totalPages) % totalPages;
                    await interaction.update({ embeds: [generateEmbed(page)], components: [row] });
                } else if (interaction.customId === 'bankhelp_first') {
                    page = 0;
                    await interaction.update({ embeds: [generateEmbed(page)], components: [row] });
                } else if (interaction.customId === 'bankhelp_last') {
                    page = totalPages - 1;
                    await interaction.update({ embeds: [generateEmbed(page)], components: [row] });
                } else if (interaction.customId === 'bankhelp_close') {
                    collector.stop();
                    await interaction.message.delete().catch(() => {});
                }
            } catch (err) {
                console.error(err);
            }
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
            );
            await msg.edit({ components: [disabledRow] }).catch(() => {});
        });

    },
};
