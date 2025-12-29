# Changelog

All notable changes to Pappify will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1-beta] - 2025-12-29

### 🔧 Fixed

- **Spotify Track Resolution** - Fixed incorrect YouTube track matching when playing Spotify URLs

### ✨ Changed

#### `build/player/Spotify.js`

| Function | Change |
|----------|--------|
| `resolve(url, requester)` | Now creates unresolved tracks instead of immediately resolving |
| `_buildUnresolvedTrack()` | **NEW** - Creates unresolved track with inline `resolve()` method |
| `track.resolve(pappify)` | **NEW** - Smart resolution algorithm with 5-step matching |

#### Smart Resolution Algorithm (Priority Order)

1. **Official Audio Match** - Finds tracks from artist's channel or "Artist - Topic" channels
2. **Duration Match** - Finds tracks within ±2 seconds of Spotify duration
3. **Duration + Title Match** - Combines duration and title matching
4. **Filter Unwanted** - Removes covers, remixes, karaoke, instrumental, slowed, reverb, sped up, 8d audio
5. **Fallback** - Uses first result if nothing else matches

#### Search Query Format

| Before | After |
|--------|-------|
| `ytmsearch:Title Author` | `ytsearch:Author - Title` |

- Changed from YouTube Music (`ytmsearch`) to regular YouTube (`ytsearch`)
- Changed query format from `{title} {author}` to `{author} - {title}`

---

## [1.0.0-beta] - 2025-12-21

### 🎉 Initial Beta Release

First public beta release of **Pappify** - a next-generation Lavalink client library for Discord bots with ultra-low latency, smart node balancing, and 25+ audio effects.

---

### ✨ Features

#### Core (`build/core/`)

- **Pappify** - Main client class
  - Lavalink v3 and v4 REST API support
  - Smart node load balancing with penalty system
  - Auto node migration on failure/disconnect
  - Session resume support with configurable timeout
  - Plugin system for extensibility
  - Feature toggle system (enable/disable features at runtime)
  - Region-based node selection
  - Debug event logging
  - Track search and resolution

- **Plugin** - Base plugin class
  - `load()` and `unload()` lifecycle methods
  - Access to Pappify instance and events

#### Network (`build/network/`)

- **Node** - Lavalink node connection manager
  - WebSocket connection with auto-reconnect
  - Configurable reconnect attempts and timeout
  - Node statistics tracking (players, CPU, memory, frames)
  - Penalty calculation for load balancing
  - NodeLink server detection
  - Session management

- **Rest** - HTTP client for Lavalink REST API
  - Connection pooling with `undici` Agent
  - Request queuing with rate limiting
  - Player CRUD operations
  - Track loading and decoding
  - Route planner management
  - Session configuration

- **Lyrics** - Lyrics fetching manager
  - Support for `lavalyrics-plugin` and `java-lyrics-plugin`
  - Get lyrics for current track
  - Get lyrics by track/encoded string
  - Search lyrics by query
  - Plugin availability checking

- **Mixer** - Audio mixing (NodeLink only)
  - Add multiple audio layers
  - Per-layer volume control
  - Get/update/remove layers
  - Clear all layers

- **VoiceRecorder** - Voice recording (NodeLink only)
  - Start/stop recording
  - Multiple formats (mp3, ogg, wav)
  - Configurable bitrate
  - Separate tracks per user option
  - Recording status and duration tracking

#### Player (`build/player/`)

- **Player** - Guild audio player
  - Voice channel connection management
  - Play, pause, stop, seek, skip controls
  - Volume control (0-1000)
  - Loop modes: none, track, queue
  - Autoplay with YouTube/SoundCloud/Spotify support
  - Node migration support
  - Custom data storage
  - Track history

- **Queue** - Extended Array for queue management
  - Add single/multiple tracks
  - Remove by index/range/requester
  - Shuffle (Fisher-Yates algorithm)
  - Move, swap, reverse tracks
  - Skip to index
  - Remove duplicates
  - Total duration calculation
  - Formatted duration string

- **Track** - Playable track representation
  - Track info (title, author, duration, URI, etc.)
  - Thumbnail fetching (YouTube, Spotify, SoundCloud)
  - Unresolved track resolution
  - JSON serialization

- **Connection** - Voice connection state manager
  - Voice server/state update handling
  - Connection timeout management
  - Channel move detection
  - Auto-reconnect on disconnect codes

- **PlayerState** - State persistence
  - Serialize player to JSON
  - Restore player from state
  - Serialize/restore all players
  - Position adjustment on restore

- **Spotify** - Spotify URL resolution
  - Track, album, playlist, artist URL support
  - Spotify API integration
  - Auto token refresh
  - Search fallback to YouTube Music

#### Audio (`build/audio/`)

- **Filters** - Audio filter presets (20+)
  - `bassboost` - Adjustable bass boost (0-10)
  - `nightcore` - Speed up + higher pitch
  - `vaporwave` - Slow down + lower pitch
  - `8D` - Rotating audio effect
  - `daycore` - Opposite of nightcore
  - `slowmode` - Slow playback
  - `chipmunk` - High pitch voice
  - `darthvader` - Deep voice
  - `doubletime` - 2x speed
  - `pop` - Pop music EQ preset
  - `soft` - Soft audio preset
  - `trebleBass` - Treble and bass boost
  - `karaoke` - Vocal removal
  - `tremolo` - Volume oscillation
  - `vibrato` - Pitch oscillation
  - `rotation` - Audio rotation
  - `distortion` - Audio distortion
  - `lowPass` - High frequency removal
  - `channelMix` - Left/right channel mixing
  - `timescale` - Speed/pitch/rate control
  - `equalizer` - 15-band EQ

- **Effects** - Advanced audio effects (10)
  - `lofi` - Lo-fi aesthetic
  - `underwater` - Underwater sound
  - `telephone` - Phone call quality
  - `radio` - AM radio sound
  - `party` - Party/club mode
  - `cinema` - Movie theater effect
  - `vocalBoost` - Enhance vocals
  - `echo` - Echo/reverb effect
  - `earrape` - Extreme distortion (1-10 intensity)

- **Voice** - Voice manipulation presets (10)
  - `maleVoice` - Deeper male voice
  - `femaleVoice` - Higher female voice
  - `childVoice` - Child-like voice
  - `robotVoice` - Robotic sound
  - `demonVoice` - Deep demonic voice
  - `heliumVoice` - Helium balloon voice
  - `giantVoice` - Giant/monster voice
  - `whisper` - Whisper effect
  - `echo` - Echo effect (1-10 intensity)
  - Custom speed (0.25-3.0) and pitch (0.25-3.0)

- **TTS** - Text-to-Speech
  - 28 languages supported
  - Speed presets (verySlow, slow, normal, fast, veryFast, ultraFast)
  - Play modes: interrupt, queue, priority
  - URL caching
  - Google TTS provider

#### Plugins (`build/plugins/`)

- **SpotifyPlugin** - Automatic Spotify URL resolution
  - Track, album, playlist, artist support
  - Configurable playlist/album limits
  - Market selection

- **SaveStatePlugin** - Player state persistence
  - Auto-save interval
  - Auto-restore on init
  - Manual save/restore methods
  - JSON file storage

- **AutoDisconnectPlugin** - Auto-disconnect on idle
  - Idle timeout
  - Leave on empty channel
  - Leave on queue end
  - Configurable delays

---

### 📡 Events (25+)

#### Node Events
- `nodeConnect` - Node connected
- `nodeDisconnect` - Node disconnected
- `nodeError` - Node error
- `nodeReconnect` - Node reconnecting
- `nodeCreate` - Node created
- `nodeDestroy` - Node destroyed

#### Player Events
- `playerCreate` - Player created
- `playerDestroy` - Player destroyed
- `playerDisconnect` - Player disconnected
- `playerMove` - Bot moved channels
- `playerMoved` - Player migrated to new node
- `playerMigrated` - Migration success
- `playerMigrationFailed` - Migration failed
- `playerUpdate` - Player state update

#### Track Events
- `trackStart` - Track started playing
- `trackEnd` - Track ended
- `trackError` - Track error/exception
- `trackStuck` - Track stuck

#### Queue Events
- `queueEnd` - Queue finished

#### Other Events
- `socketClosed` - WebSocket closed
- `nodeMigrated` - All players migrated from node
- `nodeMigrationFailed` - Node migration failed
- `raw` - Raw Lavalink data
- `debug` - Debug messages
- `apiResponse` - REST API response

---

### ⚙️ Configuration Options

#### Feature Toggles
| Feature | Default | Description |
|---------|---------|-------------|
| `autoplay` | `true` | Autoplay when queue ends |
| `filters` | `true` | Audio filters |
| `effects` | `true` | Audio effects |
| `voiceEffects` | `true` | Voice manipulation |
| `tts` | `true` | Text-to-speech |
| `lyrics` | `true` | Lyrics fetching |
| `mixer` | `true` | Audio mixing (NodeLink) |
| `recorder` | `true` | Voice recording (NodeLink) |
| `spotify` | `true` | Spotify URL resolution |

#### Core Options
| Option | Default | Description |
|--------|---------|-------------|
| `defaultSearchPlatform` | `'ytmsearch'` | Default search platform |
| `restVersion` | `'v4'` | Lavalink REST version |
| `defaultVolume` | `100` | Default player volume |
| `maxVolume` | `1000` | Maximum volume |
| `connectionTimeout` | `15000` | Voice connection timeout (ms) |
| `reconnectTimeout` | `5000` | Node reconnect delay (ms) |
| `reconnectTries` | `5` | Max reconnect attempts |
| `resumeKey` | `null` | Session resume key |
| `resumeTimeout` | `60` | Resume timeout (seconds) |
| `autoResume` | `false` | Auto-resume on reconnect |
| `autoMigratePlayers` | `false` | Auto-migrate on node issues |
| `migrateOnDisconnect` | `false` | Migrate on node disconnect |
| `migrateOnFailure` | `false` | Migrate on node failure |
| `multipleTrackHistory` | `null` | Max previous tracks |

---

### 🔧 Search Platforms

| Platform | Prefix | Description |
|----------|--------|-------------|
| YouTube Music | `ytmsearch:` | YouTube Music search |
| YouTube | `ytsearch:` | YouTube search |
| SoundCloud | `scsearch:` | SoundCloud search |
| Spotify | `spsearch:` | Spotify search (requires plugin) |
| Deezer | `dzsearch:` | Deezer search (requires plugin) |
| Apple Music | `amsearch:` | Apple Music (requires plugin) |

---

### 📦 Exports

```javascript
// Core
Pappify, Plugin

// Network
Node, Rest, Lyrics, Mixer, VoiceRecorder

// Player
Player, Track, Queue, Connection, PlayerState, Spotify

// Audio
Filters, Effects, Voice, TTS

// Plugins
SpotifyPlugin, SaveStatePlugin, AutoDisconnectPlugin

// Meta
version
```

---

### 📋 Requirements

- **Node.js** >= 18.0.0
- **Lavalink** v3.x or v4.x
- **Dependencies:**
  - `ws` ^8.16.0
  - `undici` >=6.11.1
- **Peer Dependencies (optional):**
  - `discord.js` ^14.x

---

### 📄 License

MIT © Pappu100