// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

const {
  EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

const configPath     = path.join(__dirname, '../config/bank-config.json');
const carsConfigPath = path.join(__dirname, '../config/cars-config.json');
const BankUser = require('../models/BankUser');
const { formatMoney } = require('../utils/helpers');

const COLOR_KEYS = [
  { key: 'bgTop',      label: 'خلفية أعلى',     desc: 'لون التدرج العلوي للخلفية' },
  { key: 'bgBottom',   label: 'خلفية أسفل',     desc: 'لون التدرج السفلي للخلفية' },
  { key: 'border',     label: 'الحدود',          desc: 'لون الإطار الخارجي' },
  { key: 'text',       label: 'النص الرئيسي',    desc: 'لون النص الأساسي' },
  { key: 'textMuted',  label: 'نص خافت',         desc: 'لون النص الثانوي' },
  { key: 'green',      label: 'أخضر',            desc: 'لون القيم الإيجابية' },
  { key: 'red',        label: 'أحمر',            desc: 'لون القيم السلبية' },
  { key: 'cardBorder', label: 'حدود البطاقة',    desc: 'لون إطار البطاقات الداخلية' },
  { key: 'iconBg',     label: 'خلفية الأيقونة',  desc: 'لون خلفية الأيقونات' },
  { key: 'logoBg',     label: 'خلفية الشعار',    desc: 'لون خلفية الشعار' },
  { key: 'line',       label: 'خط الفاصل',       desc: 'لون خطوط الفصل' },
];

const CAR_PAGE_SIZE = 23;

function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch (e) { console.error('Error reading bank-config.json:', e); return null; }
}
function writeConfig(c) {
  try { fs.writeFileSync(configPath, JSON.stringify(c, null, 2), 'utf8'); return true; }
  catch (e) { console.error('Error writing bank-config.json:', e); return false; }
}
function readCarsConfig() {
  try { return JSON.parse(fs.readFileSync(carsConfigPath, 'utf8')); }
  catch { return { cars: [], auction: {}, rarityWeights: {}, rarityColors: {}, rarityLabels: {}, hejolah: {}, repair: {}, harraj: {} }; }
}
function writeCarsConfig(c) {
  try { fs.writeFileSync(carsConfigPath, JSON.stringify(c, null, 2), 'utf8'); return true; }
  catch (e) { console.error('Error writing cars-config.json:', e); return false; }
}

function buildMainMenu(userId) {
  return new StringSelectMenuBuilder()
    .setCustomId(`admin_select_${userId}`)
    .setPlaceholder('اختر إعدادًا لتغييره أو إجراءً لتنفيذه')
    .addOptions([
      { label: 'تعيين نسبة الفوز',                 description: 'تغيير نسبة الفوز في الألعاب (0.5 = 50%)',    value: 'set_win_rate' },
      { label: 'تعيين نسبة السرقة',                 description: 'تغيير نسبة نجاح أمر السرقة (0.4 = 40%)',    value: 'set_rob_rate' },
      { label: 'التحويل [مفعل/معطل]',               description: 'تفعيل أو تعطيل أمر التحويل',                value: 'toggle_transfer' },
      { label: 'إعادة تعيين الأرصدة',               description: 'إعادة تعيين رصيد جميع المستخدمين',          value: 'reset_balances' },
      { label: 'إعادة تعيين الأراضي',               description: 'مسح بيانات الأراضي لجميع المستخدمين',       value: 'reset_lands' },
      { label: 'إعادة تعيين المستويات',             description: 'إعادة تعيين مستويات جميع المستخدمين',       value: 'reset_levels' },
      { label: 'إعادة تعيين الموارد',               description: 'مسح بيانات المواد لجميع المستخدمين',        value: 'reset_materials' },
      { label: 'إعادة تعيين جميع البيانات',         description: 'مسح جميع بيانات المستخدمين',                value: 'reset_all_data' },
      { label: '➕ إضافة شات للبنك',                 description: 'تحديد شات يُسمح فيه باستخدام البنك',        value: 'add_bank_channel' },
      { label: '➖ إزالة شات للبنك',                 description: 'إزالة شات من قائمة شاتات البنك',            value: 'remove_bank_channel' },
      { label: 'إعادة تعيين أسبوعياً [مفعل/معطل]', description: 'تفعيل/تعطيل الإعادة الأسبوعية',            value: 'toggle_weekly_reset' },
      { label: 'حماية الروم الصوتي [مفعل/معطل]',   description: 'تفعيل/تعطيل حماية الرومات الصوتية',         value: 'toggle_voice_protection' },
      { label: 'منع مستخدم',                        description: 'إضافة مستخدم إلى القائمة السوداء',          value: 'ban_user' },
      { label: 'سماح مستخدم',                       description: 'إزالة مستخدم من القائمة السوداء',           value: 'unban_user' },
      { label: 'المستخدمون الممنوعون',              description: 'عرض قائمة المستخدمين الممنوعين',            value: 'list_banned_users' },
      { label: 'اعط مال',                           description: 'إضافة مبلغ إلى رصيد مستخدم معين',          value: 'give_money' },
      { label: 'شيل مال',                           description: 'إزالة مبلغ من رصيد مستخدم معين',           value: 'remove_money' },
      { label: 'اعط الجميع مال',                    description: 'إضافة مبلغ إلى رصيد جميع المستخدمين',      value: 'give_all_money' },
      { label: '🎨 هوية السيرفر [مفعل/معطل]',       description: 'استخدام اسم وصورة السيرفر في التصاميم',    value: 'toggle_server_branding' },
      { label: '🖌️ الوان السيرفر [مفعل/معطل]',      description: 'توليد ألوان التصاميم من صورة السيرفر',    value: 'toggle_server_colors' },
      { label: '🎨 اعدادات الالوان',                 description: 'تطبيق أو إعادة تعيين ألوان مخصصة',         value: 'color_settings' },
      { label: '🚗 اعدادات السيارات',                description: 'إدارة سيارات النظام: تعديل، حذف، منح',     value: 'car_settings' },
    ]);
}

function buildMainEmbed(adminSettings) {
  const overrides = adminSettings.colorOverrides || {};
  const overrideLines = Object.keys(overrides).length
    ? Object.entries(overrides).map(([k, v]) => `\`${k}\` → \`${v}\``).join('\n')
    : 'لا توجد ألوان مخصصة';
  return new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('⚙️ إعدادات البنك الإدارية')
    .setDescription('هذه هي الإعدادات الحالية للنظام.')
    .addFields(
      { name: 'نسبة الفوز',         value: `${(adminSettings.winRate * 100).toFixed(0)}%`,                   inline: true },
      { name: 'نسبة السرقة',        value: `${(adminSettings.robSuccessRate * 100).toFixed(0)}%`,            inline: true },
      { name: 'التحويل',            value: adminSettings.transferEnabled        ? '✅' : '❌',               inline: true },
      { name: 'إعادة أسبوعية',      value: adminSettings.weeklyResetEnabled     ? '✅' : '❌',               inline: true },
      { name: 'حماية صوتي',         value: adminSettings.voiceProtectionEnabled ? '✅' : '❌',               inline: true },
      { name: '🎨 هوية السيرفر',    value: adminSettings.useServerBranding      ? '✅ مفعّل' : '❌ معطّل',  inline: true },
      { name: '🖌️ الوان السيرفر',   value: adminSettings.useServerColors        ? '✅ مفعّل' : '❌ معطّل',  inline: true },
      { name: '🎨 الألوان المخصصة',  value: overrideLines,                                                    inline: false },
      {
        name: 'شاتات البنك',
        value: Array.isArray(adminSettings.bankChannels) && adminSettings.bankChannels.length
          ? adminSettings.bankChannels.map(id => `<#${id}>`).join('\n') : 'كل الشاتات مسموح بها',
        inline: false
      },
      {
        name: 'الممنوعون',
        value: Array.isArray(adminSettings.blacklistedUsers) && adminSettings.blacklistedUsers.length
          ? adminSettings.blacklistedUsers.map(id => `<@${id}>`).join('\n') : 'لا أحد',
        inline: false
      }
    ).setTimestamp();
}

function buildColorSettingsMenu(userId) {
  return new StringSelectMenuBuilder()
    .setCustomId(`admin_select_${userId}`)
    .setPlaceholder('اختر إجراءً للألوان')
    .addOptions([
      { label: 'تطبيق لون مخصص',   value: 'color_apply', description: 'تحديد لون مخصص لعنصر معين' },
      { label: 'إعادة تعيين لون',  value: 'color_reset', description: 'إزالة لون مخصص وإعادته للسيرفر' },
      { label: '◀ رجوع',           value: 'back_main',   description: 'العودة للقائمة الرئيسية' },
    ]);
}

function buildColorKeysMenu(userId, action, overrides = {}) {
  const opts = COLOR_KEYS
    .filter(ck => action === 'apply' || ck.key in overrides)
    .map(ck => ({
      label: ck.label + (overrides[ck.key] ? ` (${overrides[ck.key]})` : ''),
      value: `color_key_${action}_${ck.key}`,
      description: ck.desc,
    }));
  if (action === 'reset') opts.push({ label: 'إعادة تعيين الكل', value: 'color_key_reset_all', description: 'مسح جميع الألوان المخصصة' });
  return new StringSelectMenuBuilder()
    .setCustomId(`admin_select_${userId}`)
    .setPlaceholder(action === 'apply' ? 'اختر العنصر لتطبيق لون عليه' : 'اختر العنصر لإعادة تعيينه')
    .addOptions(opts);
}

function buildCarPageComponents(userId, action, cars, page) {
  const totalPages = Math.max(1, Math.ceil(cars.length / CAR_PAGE_SIZE));
  const safePage   = Math.max(0, Math.min(page, totalPages - 1));
  const slice      = cars.slice(safePage * CAR_PAGE_SIZE, (safePage + 1) * CAR_PAGE_SIZE);

  const placeholders = { car_edit: 'اختر سيارة للتعديل', car_delete: 'اختر سيارة للحذف', car_give: 'اختر سيارة للمنح' };
  const valuePrefix  = { car_edit: 'car_edit_select_', car_delete: 'car_delete_confirm_', car_give: 'car_give_select_' };

  if (!slice.length) slice.push({ name: 'لا توجد سيارات', id: '_empty', rarity: '-', leastPrice: 0 });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`admin_select_${userId}`)
    .setPlaceholder(placeholders[action] || 'اختر سيارة')
    .addOptions(slice.map(c => ({
      label: c.name.slice(0, 100),
      value: c.id === '_empty' ? 'noop' : `${valuePrefix[action]}${c.id}`,
      description: (action === 'car_edit' ? `${c.rarity} | ${(c.leastPrice||0).toLocaleString()}` : c.rarity).slice(0, 100),
    })));

  const btnRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`acp_p_${userId}_${action}_${safePage}_prev`)
      .setLabel('◀ السابق')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage === 0),
    new ButtonBuilder()
      .setCustomId(`acp_p_${userId}_${action}_${safePage}_next`)
      .setLabel('التالي ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`acp_b_${userId}`)
      .setLabel('رجوع ◀')
      .setStyle(ButtonStyle.Danger)
  );

  return [new ActionRowBuilder().addComponents(menu), btnRow];
}

module.exports = {
  name: 'اعداد',
  aliases: ['setup', 'admin'],
  category: 'bank',

  execute: async (message) => {
    const currentConfig = readConfig();
    if (!currentConfig) return message.reply('❌ تعذر تحميل الإعدادات.');
    await message.reply({ embeds: [buildMainEmbed(currentConfig.adminSettings)], components: [new ActionRowBuilder().addComponents(buildMainMenu(message.author.id))] });
  },

  handleInteraction: async (interaction) => {
    if (interaction.isModalSubmit() && interaction.customId.startsWith('car_admin_edit_')) {
      const parts     = interaction.customId.split('_');
      const userId    = parts[parts.length - 1];
      const carId     = parts.slice(3, parts.length - 1).join('_');
      const newName   = interaction.fields.getTextInputValue('car_name');
      const newRarity = interaction.fields.getTextInputValue('car_rarity').toLowerCase();
      const newPrice  = parseInt(interaction.fields.getTextInputValue('car_least_price'));
      if (!['common','rare','epic','legendary'].includes(newRarity))
        return interaction.reply({ content: '❌ الندرة غير صالحة.', ephemeral: true });
      const cc = readCarsConfig();
      const car = (cc.cars || []).find(c => c.id === carId);
      if (!car) return interaction.reply({ content: '❌ السيارة غير موجودة.', ephemeral: true });
      car.name = newName; car.rarity = newRarity;
      if (!isNaN(newPrice) && newPrice > 0) car.leastPrice = newPrice;
      writeCarsConfig(cc);
      return interaction.reply({ content: `✅ تم تحديث **${newName}**.`, ephemeral: true });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('color_apply_modal_')) {
      const parts  = interaction.customId.split('_');
      const userId = parts[parts.length - 1];
      const key    = parts.slice(3, parts.length - 1).join('_');
      const hex    = interaction.fields.getTextInputValue('hex_input').trim();
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(hex))
        return interaction.reply({ content: '❌ لون غير صالح. استخدم صيغة HEX مثل `#FF0000`', ephemeral: true });
      const cfg = readConfig();
      if (!cfg.adminSettings.colorOverrides) cfg.adminSettings.colorOverrides = {};
      cfg.adminSettings.colorOverrides[key] = hex;
      writeConfig(cfg);
      return interaction.reply({ content: `✅ تم تطبيق **${hex}** على **${key}**.`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId.startsWith('acp_p_')) {
      await interaction.deferUpdate();
      const raw     = interaction.customId;
      const dir     = raw.endsWith('_prev') ? 'prev' : 'next';
      const inner   = raw.slice('acp_p_'.length, raw.lastIndexOf('_'));
      const pageStr = inner.slice(inner.lastIndexOf('_') + 1);
      const curPage = parseInt(pageStr);
      const userId  = inner.slice(0, inner.indexOf('_'));
      const action  = inner.slice(userId.length + 1, inner.lastIndexOf('_'));
      if (interaction.user.id !== userId)
        return interaction.followUp({ content: '❌ هذا ليس لك!', ephemeral: true });
      const cc   = readCarsConfig();
      const all  = cc.cars || [];
      const next = dir === 'prev' ? curPage - 1 : curPage + 1;
      return interaction.editReply({ embeds: [], components: buildCarPageComponents(userId, action, all, next) });
    }

    if (interaction.isButton() && interaction.customId.startsWith('acp_b_')) {
      await interaction.deferUpdate();
      const userId = interaction.customId.slice('acp_b_'.length);
      if (interaction.user.id !== userId)
        return interaction.followUp({ content: '❌ هذا ليس لك!', ephemeral: true });
      const m = new StringSelectMenuBuilder()
        .setCustomId(`admin_select_${userId}`)
        .setPlaceholder('اختر إجراءً للسيارات')
        .addOptions([
          { label: '✏️ تعديل سيارة',        value: 'car_edit',   description: 'تعديل اسم، ندرة، أو سعر' },
          { label: '🗑️ حذف سيارة',           value: 'car_delete', description: 'حذف سيارة من القائمة' },
          { label: '🎁 اعطاء سيارة لمستخدم', value: 'car_give',   description: 'منح سيارة لمستخدم' },
          { label: '◀ رجوع',                 value: 'back_main',  description: 'العودة للقائمة الرئيسية' },
        ]);
      return interaction.editReply({ components: [new ActionRowBuilder().addComponents(m)] });
    }

    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith('admin_select_')) return;

    const { hasAdminPermission } = require('../../index.js');
    const userId = interaction.customId.split('_')[2];
    const sel    = interaction.values[0];

    const needsModal = sel.startsWith('color_key_apply_') || sel.startsWith('car_edit_select_');
    if (!needsModal) await interaction.deferUpdate();

    if (!hasAdminPermission(interaction.member)) {
      if (needsModal) return interaction.reply({ content: '❌ للمشرفين فقط!', ephemeral: true });
      return interaction.followUp({ content: '❌ للمشرفين فقط!', ephemeral: true });
    }
    if (interaction.user.id !== userId) {
      if (needsModal) return interaction.reply({ content: '❌ هذا ليس لك!', ephemeral: true });
      return interaction.followUp({ content: '❌ هذا ليس لك!', ephemeral: true });
    }

    const cfg = readConfig();
    if (!cfg) return interaction.followUp({ content: '❌ تعذر تحميل الإعدادات.', ephemeral: true });

    let admin = cfg.adminSettings || {};
    if (!Array.isArray(admin.bankChannels))     admin.bankChannels    = [];
    if (!Array.isArray(admin.blacklistedUsers)) admin.blacklistedUsers = [];
    if (admin.useServerBranding === undefined)  admin.useServerBranding = false;
    if (admin.useServerColors   === undefined)  admin.useServerColors   = false;
    if (!admin.colorOverrides)                  admin.colorOverrides    = {};
    const eco = cfg.economy;
    let reply = '✅ تم تحديث الإعدادات.';

    if (sel === 'color_settings')
      return interaction.editReply({ components: [new ActionRowBuilder().addComponents(buildColorSettingsMenu(userId))] });

    if (sel === 'color_apply')
      return interaction.editReply({ components: [new ActionRowBuilder().addComponents(buildColorKeysMenu(userId, 'apply', admin.colorOverrides))] });

    if (sel === 'color_reset') {
      if (!Object.keys(admin.colorOverrides).length)
        return interaction.followUp({ content: 'ℹ️ لا توجد ألوان مخصصة لإعادة تعيينها.', ephemeral: true });
      return interaction.editReply({ components: [new ActionRowBuilder().addComponents(buildColorKeysMenu(userId, 'reset', admin.colorOverrides))] });
    }

    if (sel === 'color_key_reset_all') {
      admin.colorOverrides = {};
      cfg.adminSettings = admin; writeConfig(cfg);
      await interaction.followUp({ content: '✅ تم إعادة تعيين جميع الألوان المخصصة.', ephemeral: true });
      return interaction.editReply({ embeds: [buildMainEmbed(admin)], components: [new ActionRowBuilder().addComponents(buildMainMenu(userId))] });
    }

    if (sel.startsWith('color_key_apply_')) {
      const key    = sel.replace('color_key_apply_', '');
      const ckInfo = COLOR_KEYS.find(c => c.key === key);
      const modal  = new ModalBuilder()
        .setCustomId(`color_apply_modal_${key}_${userId}`)
        .setTitle(`تطبيق لون على: ${ckInfo?.label || key}`);
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('hex_input')
          .setLabel('أدخل كود اللون (HEX)')
          .setPlaceholder('#FF0000')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(9)
          .setValue(admin.colorOverrides[key] || '#')
          .setRequired(true)
      ));
      return interaction.showModal(modal);
    }

    if (sel.startsWith('color_key_reset_')) {
      const key = sel.replace('color_key_reset_', '');
      if (!(key in admin.colorOverrides)) {
        await interaction.followUp({ content: `ℹ️ لا يوجد لون مخصص لـ \`${key}\` أصلاً.`, ephemeral: true });
        return interaction.editReply({ embeds: [buildMainEmbed(admin)], components: [new ActionRowBuilder().addComponents(buildMainMenu(userId))] });
      }
      delete admin.colorOverrides[key];
      cfg.adminSettings = admin; writeConfig(cfg);
      await interaction.followUp({ content: `✅ تم إعادة تعيين **${key}**.`, ephemeral: true });
      return interaction.editReply({ embeds: [buildMainEmbed(admin)], components: [new ActionRowBuilder().addComponents(buildMainMenu(userId))] });
    }

    if (sel === 'car_settings') {
      const m = new StringSelectMenuBuilder()
        .setCustomId(`admin_select_${userId}`)
        .setPlaceholder('اختر إجراءً للسيارات')
        .addOptions([
          { label: '✏️ تعديل سيارة',        value: 'car_edit',   description: 'تعديل اسم، ندرة، أو سعر' },
          { label: '🗑️ حذف سيارة',           value: 'car_delete', description: 'حذف سيارة من القائمة' },
          { label: '🎁 اعطاء سيارة لمستخدم', value: 'car_give',   description: 'منح سيارة لمستخدم' },
          { label: '◀ رجوع',                 value: 'back_main',  description: 'العودة للقائمة الرئيسية' },
        ]);
      return interaction.editReply({ components: [new ActionRowBuilder().addComponents(m)] });
    }

    if (sel === 'back_main')
      return interaction.editReply({ embeds: [buildMainEmbed(admin)], components: [new ActionRowBuilder().addComponents(buildMainMenu(userId))] });

    if (sel === 'car_edit' || sel === 'car_delete' || sel === 'car_give') {
      const cc  = readCarsConfig(); const all = cc.cars || [];
      if (!all.length) { await interaction.followUp({ content: '❌ لا توجد سيارات.', ephemeral: true }); return; }
      return interaction.editReply({ embeds: [], components: buildCarPageComponents(userId, sel, all, 0) });
    }

    if (sel.startsWith('car_edit_select_')) {
      const carId = sel.replace('car_edit_select_', '');
      const cc    = readCarsConfig();
      const car   = (cc.cars || []).find(c => c.id === carId);
      if (!car) return interaction.reply({ content: '❌ السيارة غير موجودة.', ephemeral: true });
      const modal = new ModalBuilder()
        .setCustomId(`car_admin_edit_${carId}_${userId}`)
        .setTitle(`تعديل: ${car.name}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('car_name').setLabel('الاسم').setStyle(TextInputStyle.Short).setValue(car.name).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('car_rarity').setLabel('الندرة (common/rare/epic/legendary)').setStyle(TextInputStyle.Short).setValue(car.rarity).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('car_least_price').setLabel('أقل سعر').setStyle(TextInputStyle.Short).setValue(String(car.leastPrice)).setRequired(true))
      );
      return interaction.showModal(modal);
    }

    if (sel.startsWith('car_delete_confirm_')) {
      const carId = sel.replace('car_delete_confirm_', '');
      const cc    = readCarsConfig();
      const idx   = (cc.cars || []).findIndex(c => c.id === carId);
      if (idx === -1) { await interaction.followUp({ content: '❌ السيارة غير موجودة.', ephemeral: true }); return; }
      const name = cc.cars[idx].name; cc.cars.splice(idx, 1); writeCarsConfig(cc);
      await interaction.followUp({ content: `✅ تم حذف **${name}**.`, ephemeral: true });
      return interaction.editReply({ embeds: [buildMainEmbed(admin)], components: [new ActionRowBuilder().addComponents(buildMainMenu(userId))] });
    }

    if (sel.startsWith('car_give_select_')) {
      const carId = sel.replace('car_give_select_', '');
      await interaction.followUp({ content: '📩 أرسل ID المستخدم (30 ثانية):', ephemeral: true });
      const col = await interaction.channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 30000 }).catch(() => null);
      if (!col) { await interaction.followUp({ content: '⏰ انتهى الوقت.', ephemeral: true }); return; }
      const targetId = col.first().content.trim().replace(/[<@!>]/g, '');
      const dbU = await BankUser.findOne({ userId: targetId, guildId: interaction.guild.id }).catch(() => null);
      if (!dbU) { await interaction.followUp({ content: '❌ المستخدم غير موجود.', ephemeral: true }); return; }
      if (!dbU.cars) dbU.cars = [];
      const ex = dbU.cars.find(c => c.carId === carId);
      if (ex) ex.count++; else dbU.cars.push({ carId, count: 1, damage: 0 });
      await dbU.save();
      const cc  = readCarsConfig();
      const car = (cc.cars || []).find(c => c.id === carId);
      await interaction.followUp({ content: `✅ تم منح **${car?.name || carId}** لـ <@${targetId}>.`, ephemeral: true });
      return interaction.editReply({ embeds: [buildMainEmbed(admin)], components: [new ActionRowBuilder().addComponents(buildMainMenu(userId))] });
    }

    const needsSave = ['set_win_rate','set_rob_rate','toggle_transfer','toggle_weekly_reset',
      'toggle_voice_protection','add_bank_channel','remove_bank_channel','ban_user','unban_user',
      'toggle_server_branding','toggle_server_colors'];

    switch (sel) {
      case 'set_win_rate': {
        await interaction.followUp({ content: 'أرسل نسبة الفوز (0.00–1.00):', ephemeral: true });
        const c = await interaction.channel.awaitMessages({ filter: m => m.author.id === userId && !isNaN(parseFloat(m.content)) && parseFloat(m.content) >= 0 && parseFloat(m.content) <= 1, max: 1, time: 30000 }).catch(() => null);
        if (c) { admin.winRate = parseFloat(c.first().content); reply = `✅ نسبة الفوز: ${(admin.winRate * 100).toFixed(0)}%.`; } else reply = '⏰ انتهى الوقت.'; break;
      }
      case 'set_rob_rate': {
        await interaction.followUp({ content: 'أرسل نسبة السرقة (0.00–1.00):', ephemeral: true });
        const c = await interaction.channel.awaitMessages({ filter: m => m.author.id === userId && !isNaN(parseFloat(m.content)) && parseFloat(m.content) >= 0 && parseFloat(m.content) <= 1, max: 1, time: 30000 }).catch(() => null);
        if (c) { admin.robSuccessRate = parseFloat(c.first().content); reply = `✅ نسبة السرقة: ${(admin.robSuccessRate * 100).toFixed(0)}%.`; } else reply = '⏰ انتهى الوقت.'; break;
      }
      case 'toggle_transfer':
        admin.transferEnabled = !admin.transferEnabled;
        reply = `✅ التحويل: ${admin.transferEnabled ? 'مفعّل' : 'معطّل'}.`; break;
      case 'toggle_weekly_reset':
        admin.weeklyResetEnabled = !admin.weeklyResetEnabled;
        reply = `✅ الإعادة الأسبوعية: ${admin.weeklyResetEnabled ? 'مفعّلة' : 'معطّلة'}.`; break;
      case 'toggle_voice_protection':
        admin.voiceProtectionEnabled = !admin.voiceProtectionEnabled;
        reply = `✅ حماية الروم الصوتي: ${admin.voiceProtectionEnabled ? 'مفعّلة' : 'معطّلة'}.`; break;
      case 'toggle_server_branding':
        admin.useServerBranding = !admin.useServerBranding;
        reply = admin.useServerBranding
          ? '✅ هوية السيرفر مفعّلة — سيُستخدم اسم وصورة السيرفر في التصاميم.'
          : '❌ هوية السيرفر معطّلة — سيُستخدم الاسم والشعار الافتراضي.'; break;
      case 'toggle_server_colors':
        admin.useServerColors = !admin.useServerColors;
        reply = admin.useServerColors
          ? '✅ الوان السيرفر مفعّلة — سيتم توليد الألوان من صورة السيرفر تلقائياً.'
          : '❌ الوان السيرفر معطّلة — سيُستخدم لوح الألوان الافتراضي.'; break;
      case 'reset_balances':
        await BankUser.updateMany({}, { balance: eco.startingBalance }); reply = '✅ تم إعادة تعيين الأرصدة.'; break;
      case 'reset_lands':
        await BankUser.updateMany({}, { lands: [] }); reply = '✅ تم مسح الأراضي.'; break;
      case 'reset_levels':
        await BankUser.updateMany({}, { level: 1, experience: 0, job: 'Unemployed' }); reply = '✅ تم إعادة تعيين المستويات.'; break;
      case 'reset_materials':
        await BankUser.updateMany({}, { materials: { wood: 0, brick: 0, stone: 0, steel: 0, iron: 0, gold: 0 } }); reply = '✅ تم مسح المواد.'; break;
      case 'reset_all_data':
        await BankUser.updateMany({}, { balance: eco.startingBalance, bank: 0, materials: { wood: 0, brick: 0, stone: 0, steel: 0, iron: 0, gold: 0 }, lands: [], loan: { amount: 0 }, marriage: null, protection: { active: false }, stats: { highestEarned: 0, highestLost: 0, totalStolen: 0, totalRobbed: 0, totalInvested: 0 }, level: 1, experience: 0, job: 'Unemployed', cooldowns: {}, cars: [], tickets: [] });
        reply = '✅ تم إعادة تعيين جميع البيانات.'; break;
      case 'add_bank_channel': {
        await interaction.followUp({ content: '📩 أرسل منشن الشات أو ID:', ephemeral: true });
        const c = await interaction.channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 30000 }).catch(() => null);
        if (!c) { reply = '⏰ انتهى الوقت.'; break; }
        const ch = c.first().mentions.channels.first() || interaction.guild.channels.cache.get(c.first().content.trim());
        if (!ch) { reply = '❌ الشات غير موجود.'; break; }
        if (!admin.bankChannels.includes(ch.id)) admin.bankChannels.push(ch.id);
        reply = `✅ تم إضافة ${ch}.`; break;
      }
      case 'remove_bank_channel': {
        await interaction.followUp({ content: '📩 أرسل منشن الشات أو ID:', ephemeral: true });
        const c = await interaction.channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 30000 }).catch(() => null);
        if (!c) { reply = '⏰ انتهى الوقت.'; break; }
        const ch = c.first().mentions.channels.first() || interaction.guild.channels.cache.get(c.first().content.trim());
        if (!ch) { reply = '❌ الشات غير موجود.'; break; }
        const before = admin.bankChannels.length;
        admin.bankChannels = admin.bankChannels.filter(id => id !== ch.id);
        reply = before === admin.bankChannels.length ? 'ℹ️ الشات غير موجود أصلاً.' : `✅ تم إزالة ${ch}.`; break;
      }
      case 'ban_user': {
        await interaction.followUp({ content: '📩 أرسل منشن المستخدم أو ID:', ephemeral: true });
        const c = await interaction.channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 30000 }).catch(() => null);
        if (!c) { reply = '⏰ انتهى الوقت.'; break; }
        const u = c.first().mentions.users.first() || await interaction.client.users.fetch(c.first().content.trim()).catch(() => null);
        if (!u) { reply = '❌ المستخدم غير موجود.'; break; }
        if (!admin.blacklistedUsers.includes(u.id)) admin.blacklistedUsers.push(u.id);
        reply = `✅ تم منع ${u.tag}.`; break;
      }
      case 'unban_user': {
        await interaction.followUp({ content: '📩 أرسل منشن المستخدم أو ID:', ephemeral: true });
        const c = await interaction.channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 30000 }).catch(() => null);
        if (!c) { reply = '⏰ انتهى الوقت.'; break; }
        const u = c.first().mentions.users.first() || await interaction.client.users.fetch(c.first().content.trim()).catch(() => null);
        if (!u) { reply = '❌ المستخدم غير موجود.'; break; }
        const before = admin.blacklistedUsers.length;
        admin.blacklistedUsers = admin.blacklistedUsers.filter(id => id !== u.id);
        reply = before === admin.blacklistedUsers.length ? 'ℹ️ المستخدم غير ممنوع.' : `✅ تم رفع الحظر عن ${u.tag}.`; break;
      }
      case 'list_banned_users': {
        if (!admin.blacklistedUsers.length) { reply = 'ℹ️ لا يوجد ممنوعون.'; break; }
        const tags = await Promise.all(admin.blacklistedUsers.map(async id => { const u = await interaction.client.users.fetch(id).catch(() => null); return u ? u.tag : `(${id})`; }));
        reply = `👥 الممنوعون:\n${tags.join('\n')}`; break;
      }
      case 'give_money': {
        await interaction.followUp({ content: '📩 أرسل المنشن/ID والمبلغ (مثال: @user 1000):', ephemeral: true });
        const c = await interaction.channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 30000 }).catch(() => null);
        if (!c) { reply = '⏰ انتهى الوقت.'; break; }
        const p = c.first().content.split(' '); const amt = parseInt(p[1]);
        const u = c.first().mentions.users.first() || await interaction.client.users.fetch(p[0]).catch(() => null);
        if (!u || isNaN(amt) || amt <= 0) { reply = '❌ إدخال غير صالح.'; break; }
        const db = await BankUser.findOne({ userId: u.id, guildId: interaction.guild.id });
        if (!db) { reply = `❌ ${u.tag} لا يوجد له حساب.`; break; }
        db.balance += amt; await db.save();
        reply = `✅ أضفت ${formatMoney(amt)} لـ ${u.tag}. الرصيد: ${formatMoney(db.balance)}.`; break;
      }
      case 'remove_money': {
        await interaction.followUp({ content: '📩 أرسل المنشن/ID والمبلغ:', ephemeral: true });
        const c = await interaction.channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 30000 }).catch(() => null);
        if (!c) { reply = '⏰ انتهى الوقت.'; break; }
        const p = c.first().content.split(' '); const amt = parseInt(p[1]);
        const u = c.first().mentions.users.first() || await interaction.client.users.fetch(p[0]).catch(() => null);
        if (!u || isNaN(amt) || amt <= 0) { reply = '❌ إدخال غير صالح.'; break; }
        const db = await BankUser.findOne({ userId: u.id, guildId: interaction.guild.id });
        if (!db) { reply = `❌ ${u.tag} لا يوجد له حساب.`; break; }
        db.balance = Math.max(0, db.balance - amt); await db.save();
        reply = `✅ أزلت ${formatMoney(amt)} من ${u.tag}. الرصيد: ${formatMoney(db.balance)}.`; break;
      }
      case 'give_all_money': {
        await interaction.followUp({ content: '📩 أرسل المبلغ:', ephemeral: true });
        const c = await interaction.channel.awaitMessages({ filter: m => m.author.id === userId && !isNaN(parseInt(m.content)), max: 1, time: 30000 }).catch(() => null);
        if (!c) { reply = '⏰ انتهى الوقت.'; break; }
        const amt = parseInt(c.first().content);
        if (isNaN(amt) || amt <= 0) { reply = '❌ مبلغ غير صالح.'; break; }
        await BankUser.updateMany({}, { $inc: { balance: amt } });
        reply = `✅ أضفت ${formatMoney(amt)} لجميع المستخدمين.`; break;
      }
      default: reply = '⚠️ خيار غير صالح.';
    }

    if (needsSave.includes(sel)) {
      cfg.adminSettings = admin;
      if (!writeConfig(cfg)) reply = '❌ حدث خطأ أثناء الحفظ.';
    }

    await interaction.editReply({ embeds: [buildMainEmbed(admin)], components: [new ActionRowBuilder().addComponents(buildMainMenu(userId))] }).catch(console.error);
    await interaction.followUp({ content: reply, ephemeral: true });
  }
};
