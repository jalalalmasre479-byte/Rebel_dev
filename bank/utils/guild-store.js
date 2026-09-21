// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

let _client = null;
let _activeGuildId = null;

function setClient(client) {
  _client = client;
}

function setActiveGuild(guildId) {
  _activeGuildId = guildId;
}

function getActiveGuild() {
  if (!_client || !_activeGuildId) return null;
  return _client.guilds.cache.get(_activeGuildId) || null;
}

function getGuild(guildId) {
  if (!_client || !guildId) return null;
  return _client.guilds.cache.get(guildId) || null;
}

module.exports = { setClient, setActiveGuild, getActiveGuild, getGuild };
