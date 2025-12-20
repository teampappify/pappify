# Pappify Documentation

> Next-gen Lavalink client with ultra-low latency, smart node balancing, and 25+ audio effects.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Classes](#core-classes)
  - [Pappify](#pappify)
  - [Node](#node)
  - [Player](#player)
  - [Queue](#queue)
  - [Track](#track)
- [Feature Details](#feature-details)
  - [Autoplay](#1-autoplay-autoplay)
  - [Filters](#2-filters-filters)
  - [Effects](#3-effects-effects)
  - [Voice Effects](#4-voice-effects-voiceeffects)
  - [TTS](#5-text-to-speech-tts)
  - [Lyrics](#6-lyrics-lyrics)
  - [Mixer](#7-mixer-mixer)
  - [Recorder](#8-recorder-recorder)
  - [Spotify](#9-spotify-spotify)
- [Audio Processing](#audio-processing)
  - [Filters](#filters)
  - [Effects](#effects)
  - [Voice](#voice)
  - [TTS](#tts)
- [Network](#network)
  - [Rest](#rest)
  - [Lyrics](#lyrics)
  - [Mixer](#mixer)
- [Plugins](#plugins)
- [Events](#events)
- [TypeScript](#typescript)

---

## Installation

```bash
npm install pappify
```

**Dependencies:**
- `ws` - WebSocket client
- `undici` - HTTP client

**Peer Dependencies (optional):**
- `discord.js` ^14.x

---

## Quick Start

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { Pappify } = require('pappify');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const pappify = new Pappify(client, [
  {
    name: 'main',
    host: 'localhost',
    port: 2333,
    password: 'youshallnotpass',
  }
], {
  send: (data) => client.guilds.cache.get(data.d.guild_id)?.shard.send(data),
  defaultSearchPlatform: 'ytmsearch',
  restVersion: 'v4',
});

client.on('ready', () => {
  pappify.init(client.user.id);
});

client.on('raw', (d) => pappify.updateVoiceState(d));

client.login('YOUR_TOKEN');
```

---

## Core Classes

### Pappify

Main client class for managing Lavalink connections.

#### Constructor

```javascript
new Pappify(client, nodes, options)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `client` | Object | Discord client instance |
| `nodes` | Array | Array of node configurations |
| `options` | Object | Pappify options |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `send` | Function | required | Function to send voice data to Discord |
| `defaultSearchPlatform` | string | `'ytmsearch'` | Default search platform |
| `restVersion` | string | `'v4'` | Lavalink REST version (`'v3'` or `'v4'`) |
| `autoMigratePlayers` | boolean | `false` | Auto-migrate players on node issues |
| `migrateOnDisconnect` | boolean | `false` | Migrate players when node disconnects |
| `migrateOnFailure` | boolean | `false` | Migrate players on node failure |
| `migrationStrategyFn` | Function | default | Custom migration strategy |
| `resumeKey` | string | `null` | Session resume key |
| `resumeTimeout` | number | `60` | Resume timeout in seconds |
| `reconnectTimeout` | number | `5000` | Reconnect delay in ms |
| `reconnectTries` | number | `5` | Max reconnect attempts |
| `plugins` | Array | `[]` | Array of plugins |
| `multipleTrackHistory` | number | `null` | Max previous tracks to store |

#### Feature Toggles

Pappify allows you to enable or disable specific features. All features are enabled by default.

| Feature | Type | Default | Description |
|---------|------|---------|-------------|
| `autoplay` | boolean | `true` | Enable autoplay when queue ends |
| `filters` | boolean | `true` | Enable audio filters (bassboost, nightcore, etc.) |
| `effects` | boolean | `true` | Enable audio effects (lofi, underwater, etc.) |
| `voiceEffects` | boolean | `true` | Enable voice manipulation (robot, demon, etc.) |
| `tts` | boolean | `true` | Enable text-to-speech |
| `lyrics` | boolean | `true` | Enable lyrics fetching |
| `mixer` | boolean | `true` | Enable audio mixing (NodeLink only) |
| `recorder` | boolean | `true` | Enable voice recording (NodeLink only) |
| `spotify` | boolean | `true` | Enable Spotify URL resolution |

---

### Feature Details

#### 1. Autoplay (`autoplay`)

Automatically plays similar tracks when the queue ends.

**How it works:**
- When queue ends and autoplay is enabled, Pappify finds related tracks based on the last played song
- Supports YouTube, SoundCloud, and Spotify sources
- Uses YouTube Mix/Radio for YouTube tracks
- Uses recommended tracks for SoundCloud
- Cross-searches between platforms for Spotify
- Tracks played identifiers to avoid repeating songs

**Usage:**
```javascript
// Enable autoplay
await player.autoplay(player);

// Disable autoplay
await player.autoplay(false);

// Check status
console.log(player.isAutoplay); // true/false
```

**When disabled:** `player.autoplay()` throws `Error: Autoplay feature is disabled`

---

#### 2. Filters (`filters`)

Audio filters that modify sound characteristics using Lavalink's built-in filters.

**How it works:**
- Sends filter configurations to Lavalink via REST API
- Filters are applied server-side for low latency
- Multiple filters can be combined
- Changes apply in real-time to current playback

**Available filters:**
| Filter | Description | Parameters |
|--------|-------------|------------|
| `bassboost` | Boost bass frequencies | `value: 0-10` |
| `nightcore` | Speed up + higher pitch | - |
| `vaporwave` | Slow down + lower pitch | - |
| `8D` | Rotating audio effect | `rotationHz: 0.1-1.0` |
| `karaoke` | Remove vocals | `level, monoLevel, filterBand, filterWidth` |
| `tremolo` | Volume oscillation | `frequency, depth` |
| `vibrato` | Pitch oscillation | `frequency, depth` |
| `rotation` | Audio rotation | `rotationHz` |
| `distortion` | Distort audio | `sinOffset, sinScale, cosOffset, cosScale, tanOffset, tanScale, offset, scale` |
| `lowPass` | Remove high frequencies | `smoothing` |
| `channelMix` | Mix left/right channels | `leftToLeft, leftToRight, rightToLeft, rightToRight` |
| `timescale` | Speed/pitch/rate control | `speed, pitch, rate` |
| `equalizer` | 15-band EQ | `bands: [{band, gain}]` |
| `slowmode` | Slow playback | - |
| `daycore` | Opposite of nightcore | - |
| `chipmunk` | High pitch voice | - |
| `darthvader` | Deep voice | - |
| `doubletime` | 2x speed | - |
| `pop` | Pop music preset | - |
| `soft` | Soft audio preset | - |
| `trebleBass` | Boost treble and bass | - |

**Usage:**
```javascript
// Single filter
player.filters.setBassboost(true, { value: 8 });
player.filters.setNightcore(true);
player.filters.set8D(true);

// Custom EQ
player.filters.setEqualizer([
  { band: 0, gain: 0.6 },  // 25 Hz
  { band: 1, gain: 0.5 },  // 40 Hz
  { band: 2, gain: 0.3 },  // 63 Hz
]);

// Custom timescale
player.filters.setTimescale(true, {
  speed: 1.2,   // 20% faster
  pitch: 1.1,   // 10% higher pitch
  rate: 1.0,    // Normal rate
});

// Clear all filters
await player.filters.clearFilters();

// Get active filters
console.log(player.filters.active); // ['bassboost', 'nightcore']
```

**When disabled:** All `player.filters` methods throw `Error: Feature "filters" is disabled`

---

#### 3. Effects (`effects`)

Pre-configured audio effect combinations for specific sounds.

**How it works:**
- Combines multiple filters to create complex effects
- Each effect has optimized settings for best sound
- Effects can be stacked (some combinations work better than others)
- Uses filters internally but provides simpler API

**Available effects:**
| Effect | Description | What it does |
|--------|-------------|--------------|
| `lofi` | Lo-fi aesthetic | Low pass filter + slight bass boost |
| `underwater` | Underwater sound | Heavy low pass + tremolo |
| `telephone` | Phone call quality | Band pass filter (300-3400 Hz) |
| `radio` | AM radio sound | Distortion + band limiting |
| `party` | Party/club mode | Bass boost + slight distortion |
| `cinema` | Movie theater | Surround-like effect + bass |
| `vocalBoost` | Enhance vocals | Mid-range EQ boost |
| `echo` | Echo/reverb | Tremolo-based echo simulation |
| `earrape` | Extreme distortion | High gain + distortion (1-10 intensity) |

**Usage:**
```javascript
// Enable effects
player.effects.lofi(true);
player.effects.underwater(true);
player.effects.telephone(true);
player.effects.earrape(true, 5); // intensity 1-10

// Check active effects
console.log(player.effects.active); // ['lofi', 'underwater']

// Clear all effects
await player.effects.clear();
```

**When disabled:** All `player.effects` methods throw `Error: Feature "effects" is disabled`

---

#### 4. Voice Effects (`voiceEffects`)

Voice manipulation presets for fun audio transformations.

**How it works:**
- Uses timescale filter to change pitch and speed
- Combines with tremolo/vibrato for complex voice effects
- Presets are optimized for voice-like audio
- Can be used on any audio, not just voice

**Available voice presets:**
| Preset | Description | Settings |
|--------|-------------|----------|
| `maleVoice` | Deeper male voice | Pitch: 0.75 |
| `femaleVoice` | Higher female voice | Pitch: 1.3 |
| `childVoice` | Child-like voice | Pitch: 1.5 |
| `robotVoice` | Robotic sound | Pitch: 0.9 + Tremolo |
| `demonVoice` | Deep demonic voice | Speed: 0.8, Pitch: 0.5 + Tremolo |
| `heliumVoice` | Helium balloon voice | Speed: 1.1, Pitch: 1.8 |
| `giantVoice` | Giant/monster voice | Speed: 0.85, Pitch: 0.6 |
| `whisper` | Whisper effect | Low pass + reduced volume |

**Usage:**
```javascript
// Apply voice presets
await player.voice.robotVoice();
await player.voice.demonVoice();
await player.voice.heliumVoice();

// Custom speed/pitch
await player.voice.setSpeed(1.5);      // 0.25 - 3.0
await player.voice.setPitch(0.8);      // 0.25 - 3.0
await player.voice.setSpeedAndPitch(1.2, 0.9);

// Echo effect
await player.voice.echo(7); // intensity 1-10

// Reset to normal
await player.voice.reset();

// Get current settings
console.log(player.voice.getSettings());
// { speed: 1.0, pitch: 1.0, filters: {...} }
```

**When disabled:** All `player.voice` methods throw `Error: Feature "voiceEffects" is disabled`

---

#### 5. Text-to-Speech (`tts`)

Convert text to speech and play in voice channel.

**How it works:**
- Generates TTS audio URL using Google Translate TTS API
- Resolves URL through Lavalink as a playable track
- Supports 28 languages and multiple speed presets
- Caches generated audio for repeated phrases
- Can interrupt, queue, or prioritize TTS messages

**Supported languages:**
`en` (English), `es` (Spanish), `fr` (French), `de` (German), `it` (Italian), `pt` (Portuguese), `ru` (Russian), `ja` (Japanese), `ko` (Korean), `zh` (Chinese), `ar` (Arabic), `hi` (Hindi), `nl` (Dutch), `pl` (Polish), `tr` (Turkish), `vi` (Vietnamese), `th` (Thai), `id` (Indonesian), `sv` (Swedish), `da` (Danish), `no` (Norwegian), `fi` (Finnish), `cs` (Czech), `el` (Greek), `he` (Hebrew), `ro` (Romanian), `hu` (Hungarian), `uk` (Ukrainian)

**Speed presets:**
| Preset | Speed |
|--------|-------|
| `verySlow` | 0.5x |
| `slow` | 0.75x |
| `normal` | 1.0x |
| `fast` | 1.25x |
| `veryFast` | 1.5x |
| `ultraFast` | 2.0x |

**Usage:**
```javascript
const { TTS } = require('pappify');
const tts = new TTS(pappify, { lang: 'en', speed: 1.0 });

// Speak immediately (interrupts current track)
await tts.speak(player, 'Hello everyone!');

// Queue TTS (plays after current track)
await tts.queue(player, 'This will play later');

// Priority announcement (plays next)
await tts.announce(player, 'Important message!');

// With options
await tts.speak(player, 'Bonjour!', {
  lang: 'fr',
  speed: 1.2,
  requester: user,
});

// Get available languages
console.log(tts.getLanguages());

// Clear cache
tts.clearCache();
```

**When disabled:** All TTS methods throw `Error: TTS feature is disabled`

---

#### 6. Lyrics (`lyrics`)

Fetch song lyrics from Lavalink lyrics plugins.

**How it works:**
- Requires lavalyrics-plugin or similar on Lavalink server
- Fetches lyrics via REST API
- Supports synced (timed) and plain lyrics
- Can search lyrics by query or get for current track

**Usage:**
```javascript
// Check if lyrics plugin is available
const available = await player.node.lyrics.checkAvailable();

// Get lyrics for current track
const lyrics = await player.node.lyrics.getCurrentTrack(player.guildId);
console.log(lyrics.text);
console.log(lyrics.lines); // Synced lyrics with timestamps

// Get lyrics for specific track
const lyrics = await player.node.lyrics.get(track);

// Search lyrics
const results = await player.node.lyrics.search('never gonna give you up');
```

**When disabled:** All `node.lyrics` methods throw `Error: Feature "lyrics" is disabled`

---

#### 7. Mixer (`mixer`)

Mix multiple audio tracks simultaneously (NodeLink only).

**How it works:**
- Requires NodeLink server (not standard Lavalink)
- Allows layering multiple audio tracks
- Each layer has independent volume control
- Useful for background music, sound effects, etc.

**Usage:**
```javascript
// Check if mixer is available
if (player.node.mixer.isAvailable()) {
  // Add background music layer
  await player.node.mixer.addLayer(guildId, {
    track: { encoded: backgroundTrack.encoded },
    volume: 0.3, // 30% volume
  });

  // Get active layers
  const layers = await player.node.mixer.getLayers(guildId);

  // Update layer volume
  await player.node.mixer.updateLayerVolume(guildId, layerId, 0.5);

  // Remove specific layer
  await player.node.mixer.removeLayer(guildId, layerId);

  // Clear all layers
  await player.node.mixer.clearLayers(guildId);
}
```

**When disabled:** All `node.mixer` methods throw `Error: Feature "mixer" is disabled`

---

#### 8. Recorder (`recorder`)

Record voice channel audio (NodeLink only).

**How it works:**
- Requires NodeLink server (not standard Lavalink)
- Records all audio in voice channel
- Supports multiple formats (mp3, wav, ogg)
- Can record separate tracks per user or mixed

**Usage:**
```javascript
// Start recording
await player.node.recorder.start(guildId, {
  format: 'mp3',
  bitrate: 128,
  separateTracks: false, // true = separate file per user
});

// Check recording status
const status = await player.node.recorder.getStatus(guildId);
console.log(player.node.recorder.isRecording(guildId)); // true/false
console.log(player.node.recorder.getDuration(guildId)); // duration in ms

// Stop recording and get result
const result = await player.node.recorder.stop(guildId);
console.log(result.url); // URL to download recording
```

**When disabled:** All `node.recorder` methods throw `Error: Feature "recorder" is disabled`

---

#### 9. Spotify (`spotify`)

Resolve Spotify URLs to playable tracks.

**How it works:**
- Extracts track/album/playlist info from Spotify API
- Searches for equivalent tracks on YouTube/other sources
- Supports tracks, albums, playlists, and artist top tracks
- Requires Spotify API credentials for full functionality

**Supported URL types:**
- `https://open.spotify.com/track/...` - Single track
- `https://open.spotify.com/album/...` - Full album
- `https://open.spotify.com/playlist/...` - Playlist
- `https://open.spotify.com/artist/...` - Artist top tracks

**Usage with SpotifyPlugin:**
```javascript
const { SpotifyPlugin } = require('pappify');

const spotify = new SpotifyPlugin({
  clientId: 'your_spotify_client_id',
  clientSecret: 'your_spotify_client_secret',
  market: 'US',
  playlistLimit: 100,
  albumLimit: 50,
});

const pappify = new Pappify(client, nodes, {
  plugins: [spotify],
  spotify: true, // Enable Spotify feature
});

// Now Spotify URLs work automatically
const result = await pappify.resolve({
  query: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
});
```

**Standalone Spotify class:**
```javascript
const { Spotify } = require('pappify');

const spotify = new Spotify(pappify, {
  clientId: 'xxx',
  clientSecret: 'xxx',
});

// Check URL type
spotify.isSpotifyUrl(url);        // true/false
spotify.getType(url);             // 'track', 'album', 'playlist', 'artist'
spotify.extractId(url);           // 'trackId123'

// Get Spotify data
const track = await spotify.getTrack(id);
const album = await spotify.getAlbum(id);
const playlist = await spotify.getPlaylist(id);

// Resolve to playable tracks
const result = await spotify.resolve(url, requester);
```

**When disabled:** Spotify URLs won't auto-resolve, SpotifyPlugin won't load tracks

---

##### Configuration Example

```javascript
const pappify = new Pappify(client, nodes, {
  send: (data) => client.guilds.cache.get(data.d.guild_id)?.shard.send(data),
  
  // Disable features you don't need
  autoplay: false,      // Disable autoplay
  tts: false,           // Disable TTS
  mixer: false,         // Disable mixer
  recorder: false,      // Disable recorder
  
  // Keep these enabled (default)
  filters: true,
  effects: true,
  voiceEffects: true,
  lyrics: true,
  spotify: true,
});
```

##### Feature Management Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `isEnabled(feature)` | boolean | Check if a feature is enabled |
| `enable(feature)` | Pappify | Enable a feature at runtime |
| `disable(feature)` | Pappify | Disable a feature at runtime |
| `getFeatures()` | Object | Get all feature states |
| `setConfig(config)` | Pappify | Update configuration |
| `getConfig()` | Object | Get current configuration |

##### Runtime Feature Management

```javascript
// Check if feature is enabled
if (pappify.isEnabled('tts')) {
  await tts.speak(player, 'Hello!');
}

// Enable/disable at runtime
pappify.enable('autoplay');
pappify.disable('mixer');

// Get all feature states
console.log(pappify.getFeatures());
// { autoplay: true, filters: true, effects: true, ... }

// Update multiple settings
pappify.setConfig({
  tts: true,
  autoplay: false,
  defaultVolume: 80,
});
```

##### What Happens When Features Are Disabled

| Feature | When Disabled |
|---------|---------------|
| `autoplay` | `player.autoplay()` throws error |
| `filters` | `player.filters` methods throw error |
| `effects` | `player.effects` methods throw error |
| `voiceEffects` | `player.voice` methods throw error |
| `tts` | `tts.play()`, `tts.speak()` throw error |
| `lyrics` | `node.lyrics` methods throw error |
| `mixer` | `node.mixer` methods throw error |
| `recorder` | `node.recorder` methods throw error |
| `spotify` | Spotify URLs won't auto-resolve |

##### Error Handling for Disabled Features

```javascript
try {
  await player.autoplay(player);
} catch (error) {
  if (error.message.includes('disabled')) {
    console.log('Autoplay is disabled in config');
  }
}

// Or check before using
if (pappify.isEnabled('autoplay')) {
  await player.autoplay(player);
} else {
  console.log('Autoplay is not available');
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `client` | Object | Discord client |
| `nodes` | Array | Node configurations |
| `nodeMap` | Map | Map of connected nodes |
| `players` | Map | Map of active players |
| `clientId` | string | Bot user ID |
| `initiated` | boolean | Whether initialized |
| `version` | string | Pappify version |
| `leastUsedNodes` | Node[] | Nodes sorted by usage |
| `bestNode` | Node | Best node by penalties |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `init(clientId)` | Pappify | Initialize with bot ID |
| `createNode(options)` | Node | Create and connect a node |
| `destroyNode(identifier)` | void | Destroy a node |
| `createConnection(options)` | Player | Create a player connection |
| `createPlayer(node, options)` | Player | Create player on specific node |
| `destroyPlayer(guildId)` | void | Destroy a player |
| `removeConnection(guildId)` | void | Remove player connection |
| `get(guildId)` | Player | Get player by guild ID |
| `updateVoiceState(packet)` | void | Handle voice state updates |
| `fetchRegion(region)` | Node[] | Get nodes by region |
| `migrate(target, node?)` | Promise | Migrate player(s) to node |
| `resolve(options)` | Promise | Search/resolve tracks |
| `decodeTrack(track, node?)` | Promise | Decode a track |
| `decodeTracks(tracks, node?)` | Promise | Decode multiple tracks |
| `isEnabled(feature)` | boolean | Check if feature is enabled |
| `enable(feature)` | Pappify | Enable a feature |
| `disable(feature)` | Pappify | Disable a feature |
| `getFeatures()` | Object | Get all feature states |
| `setConfig(config)` | Pappify | Update configuration |
| `getConfig()` | Object | Get current configuration |

#### resolve() Options

```javascript
await pappify.resolve({
  query: 'search term or URL',
  source: 'ytmsearch',  // optional
  requester: user,      // optional
  node: 'nodeName',     // optional
});
```

**Returns:**
```javascript
{
  loadType: 'track' | 'playlist' | 'search' | 'empty' | 'error',
  tracks: Track[],
  playlistInfo: { name: string } | null,
  pluginInfo: Object,
  exception: Object | null,
}
```

---

### Node

Represents a Lavalink node connection.

#### Constructor

```javascript
// Created internally by Pappify
pappify.createNode({
  name: 'main',
  host: 'localhost',
  port: 2333,
  password: 'youshallnotpass',
  secure: false,
  regions: ['us', 'eu'],
  sessionId: null,
});
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Node identifier |
| `host` | string | Lavalink host |
| `port` | number | Lavalink port |
| `password` | string | Lavalink password |
| `secure` | boolean | Use HTTPS/WSS |
| `regions` | string[] | Supported regions |
| `sessionId` | string | Current session ID |
| `connected` | boolean | Connection status |
| `info` | Object | Node info from Lavalink |
| `stats` | Object | Node statistics |
| `penalties` | number | Load balancing score |
| `isNodeLink` | boolean | Is NodeLink server |
| `rest` | Rest | REST client |
| `lyrics` | Lyrics | Lyrics manager |
| `mixer` | Mixer | Audio mixer (NodeLink) |
| `recorder` | VoiceRecorder | Voice recorder (NodeLink) |

#### Stats Object

```javascript
{
  players: 0,
  playingPlayers: 0,
  uptime: 0,
  memory: { free: 0, used: 0, allocated: 0, reservable: 0 },
  cpu: { cores: 0, systemLoad: 0, lavalinkLoad: 0 },
  frameStats: { sent: 0, nulled: 0, deficit: 0 },
}
```

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | Promise | Connect to node |
| `disconnect()` | void | Disconnect from node |
| `destroy(clean?)` | void | Destroy node |
| `fetchInfo(options?)` | Promise | Fetch node info |

---

### Player

Represents a guild audio player.

#### Constructor

```javascript
// Created via pappify.createConnection()
const player = pappify.createConnection({
  guildId: '123456789',
  voiceChannel: '987654321',
  textChannel: '111222333',
  deaf: true,
  mute: false,
  defaultVolume: 80,
  loop: 'none',
});
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `pappify` | Pappify | Pappify instance |
| `node` | Node | Current node |
| `guildId` | string | Guild ID |
| `voiceChannel` | string | Voice channel ID |
| `textChannel` | string | Text channel ID |
| `connection` | Connection | Voice connection |
| `queue` | Queue | Track queue |
| `filters` | Filters | Audio filters |
| `effects` | Effects | Audio effects |
| `voice` | Voice | Voice utilities |
| `current` | Track | Currently playing track |
| `previous` | Track | Previous track |
| `previousTracks` | Track[] | Track history |
| `volume` | number | Current volume (0-1000) |
| `loop` | string | Loop mode: `'none'`, `'track'`, `'queue'` |
| `position` | number | Current position in ms |
| `timestamp` | number | Last update timestamp |
| `ping` | number | Voice connection ping |
| `playing` | boolean | Is playing |
| `paused` | boolean | Is paused |
| `connected` | boolean | Is connected |
| `isAutoplay` | boolean | Autoplay enabled |
| `deaf` | boolean | Self deafened |
| `mute` | boolean | Self muted |
| `data` | Object | Custom data storage |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `connect(options?)` | Player | Connect to voice |
| `disconnect()` | Player | Disconnect from voice |
| `play()` | Promise\<Player\> | Start playing |
| `stop()` | Player | Stop playback |
| `pause(paused?)` | Player | Pause/resume |
| `seek(position)` | Player | Seek to position (ms) |
| `setVolume(volume)` | Player | Set volume (0-1000) |
| `setLoop(mode)` | Player | Set loop mode |
| `setTextChannel(id)` | Player | Set text channel |
| `setVoiceChannel(id, opts?)` | Player | Move to channel |
| `skip()` | Promise\<Player\> | Skip current track |
| `autoplay(player\|false)` | Promise\<Player\> | Enable/disable autoplay |
| `destroy()` | void | Destroy player |
| `moveTo(node)` | Promise\<Player\> | Move to different node |
| `restart()` | Promise\<Player\> | Restart current track |
| `set(key, value)` | any | Set custom data |
| `get(key)` | any | Get custom data |
| `clearData()` | Player | Clear custom data |

---

### Queue

Extended Array for track queue management.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `size` | number | Queue length |
| `first` | Track | First track |
| `last` | Track | Last track |
| `isEmpty` | boolean | Is queue empty |
| `totalDuration` | number | Total duration in ms |
| `formattedDuration` | string | Duration as `H:MM:SS` |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `add(track)` | Queue | Add track(s) |
| `remove(index)` | Track | Remove at index |
| `removeRange(start, count)` | Track[] | Remove range |
| `clear()` | void | Clear queue |
| `shuffle()` | Queue | Shuffle queue |
| `move(from, to)` | Queue | Move track |
| `swap(i1, i2)` | Queue | Swap two tracks |
| `reverse()` | Queue | Reverse order |
| `peek(start?, end?)` | Track[] | Get slice |
| `skipTo(index)` | Track[] | Skip to index |
| `getByRequester(user)` | Track[] | Get by requester |
| `removeByRequester(user)` | Track[] | Remove by requester |
| `removeDuplicates()` | Queue | Remove duplicates |

#### Example

```javascript
// Add tracks
player.queue.add(track);
player.queue.add([track1, track2, track3]);

// Manipulate
player.queue.shuffle();
player.queue.move(0, 5);
player.queue.swap(1, 3);
player.queue.remove(2);
player.queue.removeDuplicates();

// Info
console.log(player.queue.size);
console.log(player.queue.formattedDuration); // "1:23:45"
```

---

### Track

Represents a playable track.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `encoded` | string | Encoded track string |
| `track` | string | Alias for encoded |
| `info` | Object | Track information |
| `pluginInfo` | Object | Plugin data |

#### Track Info

```javascript
{
  identifier: 'dQw4w9WgXcQ',
  title: 'Never Gonna Give You Up',
  author: 'Rick Astley',
  length: 213000,
  uri: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  sourceName: 'youtube',
  artworkUrl: 'https://...',
  isrc: 'GBARL9300135',
  seekable: true,
  stream: false,
  position: 0,
  requester: User,
}
```

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getThumbnail()` | Promise\<string\> | Get thumbnail URL |
| `resolve(pappify)` | Promise\<Track\> | Resolve unresolved track |
| `toJSON()` | Object | Serialize track |

---

## Audio Processing

### Filters

Audio filter presets and controls.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `volume` | number | Filter volume (0-5) |
| `equalizer` | Array | EQ bands |
| `karaoke` | Object | Karaoke settings |
| `timescale` | Object | Speed/pitch/rate |
| `tremolo` | Object | Tremolo settings |
| `vibrato` | Object | Vibrato settings |
| `rotation` | Object | 8D rotation |
| `distortion` | Object | Distortion settings |
| `channelMix` | Object | Channel mixing |
| `lowPass` | Object | Low pass filter |
| `bassboost` | number | Bassboost level (0-10) |
| `nightcore` | boolean | Nightcore enabled |
| `vaporwave` | boolean | Vaporwave enabled |
| `slowmode` | boolean | Slowmode enabled |
| `_8d` | boolean | 8D audio enabled |
| `daycore` | boolean | Daycore enabled |
| `chipmunk` | boolean | Chipmunk enabled |
| `darthvader` | boolean | Darth Vader enabled |
| `doubletime` | boolean | Doubletime enabled |
| `pop` | boolean | Pop preset |
| `soft` | boolean | Soft preset |
| `trebleBass` | boolean | Treble bass preset |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `setEqualizer(bands)` | Filters | Set EQ bands |
| `setKaraoke(enabled, opts?)` | Filters | Toggle karaoke |
| `setTimescale(enabled, opts?)` | Filters | Set timescale |
| `setTremolo(enabled, opts?)` | Filters | Toggle tremolo |
| `setVibrato(enabled, opts?)` | Filters | Toggle vibrato |
| `setRotation(enabled, opts?)` | Filters | Toggle rotation |
| `setDistortion(enabled, opts?)` | Filters | Toggle distortion |
| `setChannelMix(enabled, opts?)` | Filters | Set channel mix |
| `setLowPass(enabled, opts?)` | Filters | Toggle low pass |
| `setBassboost(enabled, opts?)` | Filters | Set bassboost |
| `setNightcore(enabled, opts?)` | Filters | Toggle nightcore |
| `setVaporwave(enabled, opts?)` | Filters | Toggle vaporwave |
| `setSlowmode(enabled, opts?)` | Filters | Toggle slowmode |
| `set8D(enabled, opts?)` | Filters | Toggle 8D |
| `setDaycore(enabled, opts?)` | Filters | Toggle daycore |
| `setChipmunk(enabled)` | Filters | Toggle chipmunk |
| `setDarthvader(enabled)` | Filters | Toggle darth vader |
| `setDoubletime(enabled)` | Filters | Toggle doubletime |
| `setPop(enabled)` | Filters | Toggle pop preset |
| `setSoft(enabled)` | Filters | Toggle soft preset |
| `setTrebleBass(enabled)` | Filters | Toggle treble bass |
| `clearFilters()` | Promise\<Filters\> | Clear all filters |
| `toJSON()` | Object | Get filter state |

#### Example

```javascript
// Presets
player.filters.setBassboost(true, { value: 8 });
player.filters.setNightcore(true);
player.filters.set8D(true);

// Custom EQ
player.filters.setEqualizer([
  { band: 0, gain: 0.5 },
  { band: 1, gain: 0.3 },
]);

// Custom timescale
player.filters.setTimescale(true, {
  speed: 1.2,
  pitch: 1.1,
  rate: 1.0,
});

// Clear all
await player.filters.clearFilters();
```

---

### Effects

Advanced audio effects beyond basic filters.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `active` | string[] | List of active effects |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `lofi(enabled)` | Effects | Lo-fi effect |
| `underwater(enabled)` | Effects | Underwater effect |
| `telephone(enabled)` | Effects | Telephone effect |
| `radio(enabled)` | Effects | Radio effect |
| `party(enabled)` | Effects | Party mode |
| `cinema(enabled)` | Effects | Cinema effect |
| `vocalBoost(enabled)` | Effects | Vocal boost |
| `echo(enabled, opts?)` | Effects | Echo effect |
| `earrape(enabled, intensity?)` | Effects | Earrape (1-10) |
| `clear()` | Promise\<Effects\> | Clear all effects |

#### Example

```javascript
// Enable effects
player.effects.lofi(true);
player.effects.underwater(true);
player.effects.earrape(true, 5);

// Check active
console.log(player.effects.active); // ['lofi', 'underwater', 'earrape']

// Clear all
await player.effects.clear();
```

---

### Voice

Voice manipulation utilities.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `_speed` | number | Current speed |
| `_pitchShift` | number | Current pitch |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `setSpeed(speed)` | Promise\<Voice\> | Set speed (0.25-3.0) |
| `setPitch(pitch)` | Promise\<Voice\> | Set pitch (0.25-3.0) |
| `setSpeedAndPitch(s, p)` | Promise\<Voice\> | Set both |
| `reset()` | Promise\<Voice\> | Reset to normal |
| `maleVoice()` | Promise\<Voice\> | Male voice preset |
| `femaleVoice()` | Promise\<Voice\> | Female voice preset |
| `childVoice()` | Promise\<Voice\> | Child voice preset |
| `robotVoice()` | Promise\<Voice\> | Robot voice preset |
| `demonVoice()` | Promise\<Voice\> | Demon voice preset |
| `heliumVoice()` | Promise\<Voice\> | Helium voice preset |
| `giantVoice()` | Promise\<Voice\> | Giant voice preset |
| `whisper()` | Promise\<Voice\> | Whisper effect |
| `echo(intensity?)` | Promise\<Voice\> | Echo effect (1-10) |
| `getSettings()` | Object | Get current settings |

#### Example

```javascript
// Speed/pitch
await player.voice.setSpeed(1.5);
await player.voice.setPitch(0.8);

// Voice presets
await player.voice.robotVoice();
await player.voice.demonVoice();
await player.voice.heliumVoice();

// Reset
await player.voice.reset();
```

---

### TTS

Text-to-Speech manager.

#### Constructor

```javascript
const { TTS } = require('pappify');

const tts = new TTS(pappify, {
  lang: 'en',
  speed: 1.0,
  provider: 'google',
  maxCacheSize: 100,
});
```

#### Static Properties

```javascript
TTS.LANGUAGES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
  ko: 'Korean', zh: 'Chinese', ar: 'Arabic', hi: 'Hindi',
  nl: 'Dutch', pl: 'Polish', tr: 'Turkish', vi: 'Vietnamese',
  th: 'Thai', id: 'Indonesian', sv: 'Swedish', da: 'Danish',
  no: 'Norwegian', fi: 'Finnish', cs: 'Czech', el: 'Greek',
  he: 'Hebrew', ro: 'Romanian', hu: 'Hungarian', uk: 'Ukrainian',
};

TTS.SPEEDS = {
  verySlow: 0.5, slow: 0.75, normal: 1.0,
  fast: 1.25, veryFast: 1.5, ultraFast: 2.0,
};
```

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `play(player, text, opts?)` | Promise\<Track\> | Play TTS |
| `speak(player, text, opts?)` | Promise\<Track\> | Speak immediately (interrupts) |
| `queue(player, text, opts?)` | Promise\<Track\> | Queue TTS |
| `announce(player, text, opts?)` | Promise\<Track\> | Priority announcement |
| `generateUrl(text, opts?)` | string | Generate TTS URL |
| `clearCache()` | void | Clear TTS cache |
| `getLanguages()` | Object | Get available languages |
| `getSpeeds()` | Object | Get speed presets |

#### Example

```javascript
// Speak immediately
await tts.speak(player, 'Hello world!');

// Queue TTS
await tts.queue(player, 'This will play after current track');

// Priority announcement
await tts.announce(player, 'Important message!');

// With options
await tts.speak(player, 'Bonjour!', {
  lang: 'fr',
  speed: 1.2,
  requester: user,
});
```

---

## Network

### Rest

HTTP client for Lavalink REST API.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `url` | string | Base URL |
| `version` | string | REST version |
| `sessionId` | string | Session ID |
| `calls` | number | Total API calls |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `makeRequest(method, endpoint, body?, headers?)` | Promise | Make HTTP request |
| `getPlayers()` | Promise | Get all players |
| `getPlayer(guildId)` | Promise | Get player |
| `updatePlayer(options)` | Promise | Update player |
| `destroyPlayer(guildId)` | Promise | Destroy player |
| `loadTracks(identifier)` | Promise | Load tracks |
| `decodeTrack(track)` | Promise | Decode track |
| `decodeTracks(tracks)` | Promise | Decode tracks |
| `getStats()` | Promise | Get node stats |
| `getInfo()` | Promise | Get node info |
| `getVersion()` | Promise | Get version |
| `updateSession(resuming, timeout)` | Promise | Update session |
| `getRoutePlannerStatus()` | Promise | Get route planner |
| `freeRoutePlannerAddress(address)` | Promise | Free address |
| `freeAllRoutePlannerAddresses()` | Promise | Free all addresses |

---

### Lyrics

Lyrics fetching (requires lavalyrics-plugin).

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `checkAvailable(eitherOne?, ...plugins)` | Promise\<boolean\> | Check plugin availability |
| `get(track, skipSource?)` | Promise\<Object\> | Get lyrics for track |
| `getCurrentTrack(guildId, skipSource?, plugin?)` | Promise\<Object\> | Get current track lyrics |
| `search(query)` | Promise\<Object\> | Search lyrics |

#### Example

```javascript
// Get lyrics for current track
const lyrics = await player.node.lyrics.getCurrentTrack(player.guildId);
console.log(lyrics.text);

// Get lyrics for specific track
const lyrics = await player.node.lyrics.get(track);

// Search lyrics
const results = await player.node.lyrics.search('never gonna give you up');
```

---

### Mixer

Audio mixing for NodeLink servers.

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `isAvailable()` | boolean | Check if available |
| `addLayer(guildId, options)` | Promise | Add mix layer |
| `getLayers(guildId)` | Promise | Get active layers |
| `updateLayerVolume(guildId, mixId, volume)` | Promise | Update layer volume |
| `removeLayer(guildId, mixId)` | Promise | Remove layer |
| `clearLayers(guildId)` | Promise | Remove all layers |

#### Example

```javascript
// Add background music layer
await player.node.mixer.addLayer(guildId, {
  track: { encoded: backgroundTrack.encoded },
  volume: 0.3,
});

// Get layers
const layers = await player.node.mixer.getLayers(guildId);

// Update volume
await player.node.mixer.updateLayerVolume(guildId, layerId, 0.5);

// Remove
await player.node.mixer.removeLayer(guildId, layerId);
```

---

## Plugins

### Built-in Plugins

#### SpotifyPlugin

Auto-resolve Spotify URLs to playable tracks.

```javascript
const { SpotifyPlugin } = require('pappify');

const spotify = new SpotifyPlugin({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  market: 'US',
  playlistLimit: 100,
  albumLimit: 50,
});

const pappify = new Pappify(client, nodes, {
  plugins: [spotify],
  // ...
});

// Now Spotify URLs work automatically
const result = await pappify.resolve({
  query: 'https://open.spotify.com/track/...',
});
```

#### SaveStatePlugin

Auto-save and restore player states.

```javascript
const { SaveStatePlugin } = require('pappify');

const saveState = new SaveStatePlugin({
  path: './states.json',
  saveInterval: 30000,
  autoRestore: true,
});

const pappify = new Pappify(client, nodes, {
  plugins: [saveState],
});

// Manual save/restore
await pappify.saveStates();
await pappify.restoreStates();
```

#### AutoDisconnectPlugin

Auto-disconnect on idle or empty channel.

```javascript
const { AutoDisconnectPlugin } = require('pappify');

const autoDisconnect = new AutoDisconnectPlugin({
  timeout: 300000,        // 5 min idle timeout
  leaveOnEmpty: true,     // Leave when channel empty
  emptyDelay: 30000,      // 30s delay before leaving
  leaveOnQueueEnd: false, // Leave when queue ends
  queueEndDelay: 60000,   // 1 min delay after queue end
});

const pappify = new Pappify(client, nodes, {
  plugins: [autoDisconnect],
});
```

### Creating Custom Plugins

```javascript
const { Plugin } = require('pappify');

class MyPlugin extends Plugin {
  constructor(options) {
    super('MyPlugin');
    this.options = options;
  }

  load(pappify) {
    // Called when plugin loads
    pappify.on('trackStart', (player, track) => {
      console.log(`Playing: ${track.info.title}`);
    });
    
    pappify.emit('debug', '[MyPlugin] Loaded');
  }

  unload(pappify) {
    // Called when plugin unloads
    pappify.emit('debug', '[MyPlugin] Unloaded');
  }
}

module.exports = { MyPlugin };
```

---

## Events

### Pappify Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `nodeConnect` | `node` | Node connected |
| `nodeDisconnect` | `node, { code, reason }` | Node disconnected |
| `nodeError` | `node, error` | Node error |
| `nodeReconnect` | `node` | Node reconnecting |
| `nodeCreate` | `node` | Node created |
| `nodeDestroy` | `node` | Node destroyed |
| `playerCreate` | `player` | Player created |
| `playerDestroy` | `player` | Player destroyed |
| `playerDisconnect` | `player` | Player disconnected |
| `playerMove` | `oldChannel, newChannel` | Bot moved channels |
| `playerMoved` | `player, oldNode, newNode` | Player migrated |
| `playerMigrated` | `player, oldNode, newNode` | Migration success |
| `playerMigrationFailed` | `player, error` | Migration failed |
| `nodeMigrated` | `node, players[]` | All players migrated |
| `nodeMigrationFailed` | `node, error` | Node migration failed |
| `trackStart` | `player, track, payload` | Track started |
| `trackEnd` | `player, track, payload` | Track ended |
| `trackError` | `player, track, payload` | Track error |
| `trackStuck` | `player, track, payload` | Track stuck |
| `queueEnd` | `player` | Queue finished |
| `socketClosed` | `player, payload` | WebSocket closed |
| `playerUpdate` | `player, packet` | Player state update |
| `raw` | `type, payload` | Raw Lavalink data |
| `debug` | `message` | Debug message |
| `apiResponse` | `endpoint, response` | REST API response |

### Event Examples

```javascript
// Node events
pappify.on('nodeConnect', (node) => {
  console.log(`Node ${node.name} connected`);
});

pappify.on('nodeError', (node, error) => {
  console.error(`Node ${node.name} error:`, error);
});

// Player events
pappify.on('playerCreate', (player) => {
  console.log(`Player created for ${player.guildId}`);
});

// Track events
pappify.on('trackStart', (player, track) => {
  const channel = client.channels.cache.get(player.textChannel);
  channel?.send(`Now playing: ${track.info.title}`);
});

pappify.on('trackEnd', (player, track, payload) => {
  console.log(`Track ended: ${track.info.title} (${payload.reason})`);
});

pappify.on('trackError', (player, track, payload) => {
  console.error(`Track error:`, payload.exception);
});

pappify.on('queueEnd', (player) => {
  const channel = client.channels.cache.get(player.textChannel);
  channel?.send('Queue finished!');
});

// Debug
pappify.on('debug', (message) => {
  console.log(`[Pappify] ${message}`);
});

// Migration
pappify.on('playerMigrated', (player, oldNode, newNode) => {
  console.log(`Player migrated from ${oldNode.name} to ${newNode.name}`);
});
```

### Track End Reasons

| Reason | Description |
|--------|-------------|
| `finished` | Track finished normally |
| `loadFailed` | Track failed to load |
| `stopped` | Track was stopped |
| `replaced` | Track was replaced |
| `cleanup` | Player was destroyed |

---

## TypeScript

Pappify includes TypeScript definitions.

```typescript
import { 
  Pappify, 
  Node, 
  Player, 
  Track, 
  Queue,
  Filters,
  Effects,
  Voice,
  TTS,
  Plugin,
  SpotifyPlugin,
  SaveStatePlugin,
  AutoDisconnectPlugin,
} from 'pappify';

// Types are automatically inferred
const pappify = new Pappify(client, nodes, options);

pappify.on('trackStart', (player: Player, track: Track) => {
  console.log(track.info.title);
});
```

---

## Additional Features

### PlayerState

Save and restore player states.

```javascript
const { PlayerState } = require('pappify');

// Serialize player
const state = PlayerState.serialize(player);

// Serialize all players
const states = PlayerState.serializeAll(pappify);

// Restore player
const player = await PlayerState.restore(pappify, state, {
  resume: true,
});

// Restore all
const players = await PlayerState.restoreAll(pappify, states);
```

### VoiceRecorder (NodeLink only)

Record voice channel audio.

```javascript
// Start recording
await player.node.recorder.start(guildId, {
  format: 'mp3',
  bitrate: 128,
  separateTracks: false,
});

// Check status
const status = await player.node.recorder.getStatus(guildId);
console.log(player.node.recorder.isRecording(guildId));
console.log(player.node.recorder.getDuration(guildId));

// Stop recording
const result = await player.node.recorder.stop(guildId);
```

### Spotify (standalone)

Use Spotify API directly.

```javascript
const { Spotify } = require('pappify');

const spotify = new Spotify(pappify, {
  clientId: 'xxx',
  clientSecret: 'xxx',
});

// Check URL type
spotify.isSpotifyUrl(url); // true/false
spotify.getType(url); // 'track', 'album', 'playlist', 'artist'
spotify.extractId(url); // 'trackId123'

// Get data
const track = await spotify.getTrack(id);
const album = await spotify.getAlbum(id);
const playlist = await spotify.getPlaylist(id);
const artist = await spotify.getArtist(id);

// Resolve to playable tracks
const result = await spotify.resolve(url, requester);
```

---

## Search Platforms

| Platform | Prefix | Description |
|----------|--------|-------------|
| YouTube Music | `ytmsearch:` | YouTube Music search |
| YouTube | `ytsearch:` | YouTube search |
| SoundCloud | `scsearch:` | SoundCloud search |
| Spotify | `spsearch:` | Spotify search (requires plugin) |
| Deezer | `dzsearch:` | Deezer search (requires plugin) |
| Apple Music | `amsearch:` | Apple Music (requires plugin) |

```javascript
// Search examples
await pappify.resolve({ query: 'never gonna give you up' }); // Uses default
await pappify.resolve({ query: 'ytsearch:rick astley' });
await pappify.resolve({ query: 'scsearch:electronic music' });

// Direct URLs
await pappify.resolve({ query: 'https://youtube.com/watch?v=...' });
await pappify.resolve({ query: 'https://open.spotify.com/track/...' });
await pappify.resolve({ query: 'https://soundcloud.com/...' });
```

---

## Project Structure

```
pappify/
├── build/
│   ├── core/           # Main client & plugin base
│   │   ├── Pappify.js
│   │   └── Plugin.js
│   ├── network/        # Node, REST, Lavalink features
│   │   ├── Node.js
│   │   ├── Rest.js
│   │   ├── Lyrics.js
│   │   ├── Mixer.js
│   │   └── VoiceRecorder.js
│   ├── player/         # Player, queue, tracks
│   │   ├── Player.js
│   │   ├── Queue.js
│   │   ├── Track.js
│   │   ├── Connection.js
│   │   ├── PlayerState.js
│   │   └── Spotify.js
│   ├── audio/          # Filters, effects, voice, TTS
│   │   ├── Filters.js
│   │   ├── Effects.js
│   │   ├── Voice.js
│   │   └── TTS.js
│   ├── plugins/        # Built-in plugins
│   │   ├── SpotifyPlugin.js
│   │   ├── SaveStatePlugin.js
│   │   └── AutoDisconnectPlugin.js
│   ├── index.js
│   └── index.d.ts
├── examples/
│   └── basic-bot.js
├── package.json
├── README.md
└── DOCUMENTATION.md
```

---

## License

MIT © Pappu100
