# Pappify

Next-generation Lavalink client with ultra-low latency, smart node balancing, and 25+ audio effects.

[![npm version](https://img.shields.io/npm/v/pappify.svg)](https://www.npmjs.com/package/pappify)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Ultra-low latency** - Connection pooling, request queuing
- 🔄 **Smart node balancing** - Automatic load distribution
- 🎯 **Auto-migration** - Seamless failover between nodes
- 🎵 **Multi-source** - YouTube, Spotify, SoundCloud, Apple Music
- 🎛️ **25+ audio effects** - Filters, presets, voice manipulation
- 🗣️ **TTS support** - Text-to-speech in 28 languages
- 📦 **Plugin system** - Extensible architecture
- 🔌 **Framework agnostic** - discord.js, eris, oceanic.js

## Installation

```bash
npm install pappify
```

## Quick Start

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { Pappify } = require('pappify');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const pappify = new Pappify(client, [
  { name: 'main', host: 'localhost', port: 2333, password: 'youshallnotpass' },
], {
  send: (data) => client.guilds.cache.get(data.d.guild_id)?.shard.send(data),
});

client.on('ready', () => pappify.init(client.user.id));
client.on('raw', (d) => pappify.updateVoiceState(d));
client.login('TOKEN');
```

## Playing Music

```javascript
const player = pappify.createConnection({
  guildId: guild.id,
  voiceChannel: voiceChannel.id,
  textChannel: textChannel.id,
});

const result = await pappify.resolve({ query: 'never gonna give you up' });
player.queue.add(result.tracks[0]);
await player.play();
```

## Audio Effects

```javascript
// Presets
player.filters.setBassboost(true, { value: 5 });
player.filters.setNightcore(true);
player.filters.set8D(true);

// Advanced effects
player.effects.lofi(true);
player.effects.underwater(true);

// Voice manipulation
await player.voice.setSpeed(1.5);
await player.voice.setPitch(1.2);
await player.voice.robotVoice();
```

## Text-to-Speech

```javascript
const { TTS } = require('pappify');
const tts = new TTS(pappify, { lang: 'en' });

await tts.speak(player, 'Hello world!');
await tts.announce(player, 'Now playing: Song Name');
```

## Plugins

```javascript
const { SpotifyPlugin, SaveStatePlugin, AutoDisconnectPlugin } = require('pappify');

const pappify = new Pappify(client, nodes, {
  plugins: [
    new SpotifyPlugin({ clientId: '...', clientSecret: '...' }),
    new SaveStatePlugin({ autoRestore: true }),
    new AutoDisconnectPlugin({ timeout: 300000 }),
  ],
});
```

## Documentation

See [DOCUMENTATION.md](./DOCUMENTATION.md) for complete A-Z guide.

## License

MIT
