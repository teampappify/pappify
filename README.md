
<img width="3686" height="1000" alt="pappifybig" src="https://github.com/user-attachments/assets/1368e785-4b87-458c-9fa9-791bd1752dba" />



##

<br/>

<!-- Animated Badges -->
[![npm version](https://img.shields.io/npm/v/pappify.svg?style=for-the-badge&logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/pappify)
[![Downloads](https://img.shields.io/npm/dt/pappify.svg?style=for-the-badge&logo=npm&logoColor=white&color=7C3AED)](https://www.npmjs.com/package/pappify)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/teampappify/pappify?style=for-the-badge&logo=github&color=gold)](https://github.com/teampappify/pappify)

<!-- Social/Support Links -->
[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/users/719011825408147498)
[![Documentation](https://img.shields.io/badge/Docs-7C3AED?style=for-the-badge&logo=readthedocs&logoColor=white)](./DOCUMENTATION.md)
<br/>

##



## ⚡ Why Pappify?



| Feature | Description |
|:-------:|:------------|
| 🚀 | **Ultra-low latency** - Connection pooling & request queuing |
| 🔄 | **Smart node balancing** - Automatic load distribution |
| 🎯 | **Auto-migration** - Seamless failover between nodes |
| 🎵 | **Multi-source** - YouTube, Spotify, SoundCloud, Apple Music |
| 🎛️ | **25+ audio effects** - Filters, presets, voice manipulation |
| 🗣️ | **TTS support** - Text-to-speech in 28 languages |
| 📦 | **Plugin system** - Extensible architecture |
| 🔌 | **Framework agnostic** - discord.js, eris, oceanic.js |




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

Example Bot
Check out our ready-to-use music bot:

<a href="https://github.com/teampappify/pappify-music-bot"> <img src="https://github-readme-stats.vercel.app/api/pin/?username=teampappify&repo=pappify-music-bot&theme=tokyonight&hide_border=true" /> </a><!-- Animated Line --><img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">


🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
