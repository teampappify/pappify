const { EventEmitter } = require('events');
const { Connection } = require('./Connection');
const { Filters } = require('../audio/Filters');
const { Queue } = require('./Queue');
const { Effects } = require('../audio/Effects');
const { Voice } = require('../audio/Voice');

/**
 * Disabled feature placeholder
 */
class DisabledFeature {
  constructor(name) {
    return new Proxy({}, {
      get: (_, prop) => {
        if (prop === 'active') return [];
        if (prop === 'toJSON') return () => ({});
        return () => { throw new Error(`Feature "${name}" is disabled. Enable it in Pappify config.`); };
      }
    });
  }
}

/**
 * Represents a guild audio player
 * @extends EventEmitter
 */
class Player extends EventEmitter {
  /**
   * @param {Object} pappify - Pappify instance
   * @param {Object} node - Node instance
   * @param {Object} options - Player options
   */
  constructor(pappify, node, options) {
    super();
    
    this.pappify = pappify;
    this.node = node;
    this.options = options;
    this.guildId = options.guildId;
    this.textChannel = options.textChannel || null;
    this.voiceChannel = options.voiceChannel;
    
    // Core components (always enabled)
    this.connection = new Connection(this);
    this.queue = new Queue();
    
    // Feature-gated components
    this.filters = pappify.isEnabled('filters') ? new Filters(this) : new DisabledFeature('filters');
    this.effects = pappify.isEnabled('effects') ? new Effects(this) : new DisabledFeature('effects');
    this.voice = pappify.isEnabled('voiceEffects') ? new Voice(this) : new DisabledFeature('voiceEffects');
    
    // State
    this.volume = options.defaultVolume ?? pappify.config?.defaultVolume ?? 100;
    this.loop = options.loop || 'none'; // none, track, queue
    this.current = null;
    this.previous = null;
    this.previousTracks = [];
    this.position = 0;
    this.timestamp = 0;
    this.ping = 0;
    
    // Flags
    this.playing = false;
    this.paused = false;
    this.connected = false;
    this.isAutoplay = false;
    this.migrating = false;
    this._pausedForMove = false;
    
    // Voice options
    this.deaf = options.deaf ?? true;
    this.mute = options.mute ?? false;
    
    // Custom data storage
    this.data = {};
    
    // Autoplay tracking
    this._playedIdentifiers = new Set();
    
    // Connection timeout
    Object.defineProperty(this, 'connectionTimeout', {
      value: options.connectionTimeout || pappify.config?.connectionTimeout || 15000,
      writable: false,
      enumerable: false,
    });

    this._setupEventHandlers();
  }

  /**
   * Setup internal event handlers
   * @private
   */
  _setupEventHandlers() {
    this.on('playerUpdate', (packet) => {
      this.connected = packet.state.connected;
      this.position = packet.state.position;
      this.ping = packet.state.ping;
      this.timestamp = packet.state.time;

      if (this.connection.establishing && packet.state.connected) {
        this.connection.establishing = false;
        this.pappify.emit('debug', `[Player ${this.guildId}] Voice connection established`);
        this.emit('connectionEstablished');
      }

      this.pappify.emit('playerUpdate', this, packet);
    });

    this.on('event', (data) => this._handleEvent(data));
  }

  /**
   * Connect to voice channel
   * @param {Object} options
   * @returns {Player}
   */
  connect(options = {}) {
    const { guildId, voiceChannel, deaf, mute } = { ...this, ...options };
    
    this.pappify.send({
      op: 4,
      d: {
        guild_id: guildId,
        channel_id: voiceChannel,
        self_deaf: deaf ?? this.deaf,
        self_mute: mute ?? this.mute,
      },
    });

    this.connected = true;
    this.pappify.emit('debug', `[Player ${this.guildId}] Connecting to voice channel ${voiceChannel}`);
    
    return this;
  }

  /**
   * Disconnect from voice channel
   * @returns {Player}
   */
  disconnect() {
    if (!this.voiceChannel) return this;

    this.connected = false;
    this.pappify.send({
      op: 4,
      d: {
        guild_id: this.guildId,
        channel_id: null,
        self_deaf: false,
        self_mute: false,
      },
    });

    this.voiceChannel = null;
    return this;
  }

  /**
   * Start playing
   * @returns {Promise<Player>}
   */
  async play() {
    // Wait for voice connection
    try {
      await this.connection.resolve();
    } catch (error) {
      this.connected = false;
      this.pappify.emit('debug', `[Player ${this.guildId}] Connection error: ${error.message}`);
      throw error;
    }

    if (!this.connected) {
      throw new Error('Player not connected. Use pappify.createConnection() first.');
    }

    if (!this.queue.length) {
      throw new Error('Queue is empty');
    }

    this.current = this.queue.shift();

    // Resolve unresolved tracks (e.g., Spotify)
    if (!this.current.track) {
      this.current = await this.current.resolve(this.pappify);
    }

    this.playing = true;
    this.position = 0;

    await this.node.rest.updatePlayer({
      guildId: this.guildId,
      data: {
        track: { encoded: this.current.track },
      },
    });

    return this;
  }

  /**
   * Stop playback
   * @returns {Player}
   */
  stop() {
    this.position = 0;
    this.playing = false;
    
    this.node.rest.updatePlayer({
      guildId: this.guildId,
      data: { track: { encoded: null } },
    });

    return this;
  }

  /**
   * Pause/resume playback
   * @param {boolean} paused
   * @returns {Player}
   */
  pause(paused = true) {
    this.node.rest.updatePlayer({
      guildId: this.guildId,
      data: { paused },
    });

    this.playing = !paused;
    this.paused = paused;
    
    return this;
  }

  /**
   * Seek to position
   * @param {number} position - Position in ms
   * @returns {Player}
   */
  seek(position) {
    const length = this.current?.info?.length || 0;
    this.position = Math.max(0, Math.min(length, position));
    
    this.node.rest.updatePlayer({
      guildId: this.guildId,
      data: { position: this.position },
    });

    return this;
  }

  /**
   * Set volume
   * @param {number} volume - 0-1000
   * @returns {Player}
   */
  setVolume(volume) {
    if (volume < 0 || volume > 1000) {
      throw new RangeError('Volume must be between 0 and 1000');
    }

    this.volume = volume;
    this.node.rest.updatePlayer({
      guildId: this.guildId,
      data: { volume },
    });

    return this;
  }

  /**
   * Set loop mode
   * @param {'none'|'track'|'queue'} mode
   * @returns {Player}
   */
  setLoop(mode) {
    if (!['none', 'track', 'queue'].includes(mode)) {
      throw new Error("Loop mode must be 'none', 'track', or 'queue'");
    }
    this.loop = mode;
    return this;
  }

  /**
   * Set text channel
   * @param {string} channelId
   * @returns {Player}
   */
  setTextChannel(channelId) {
    this.textChannel = channelId;
    return this;
  }

  /**
   * Set voice channel
   * @param {string} channelId
   * @param {Object} options
   * @returns {Player}
   */
  setVoiceChannel(channelId, options = {}) {
    if (this.connected && channelId === this.voiceChannel) {
      throw new Error(`Already connected to ${channelId}`);
    }

    this.mute = options.mute ?? this.mute;
    this.deaf = options.deaf ?? this.deaf;

    this.connect({
      guildId: this.guildId,
      voiceChannel: channelId,
      deaf: this.deaf,
      mute: this.mute,
    });

    return this;
  }

  /**
   * Skip current track
   * @returns {Promise<Player>}
   */
  async skip() {
    if (this.queue.length === 0 && this.loop !== 'track') {
      return this.stop();
    }
    return this.play();
  }

  /**
   * Destroy the player
   */
  destroy() {
    this.disconnect();
    this.node.rest.destroyPlayer(this.guildId);
    
    this.pappify.emit('playerDisconnect', this);
    this.pappify.emit('debug', `[Player ${this.guildId}] Destroyed`);
    
    this.pappify.players.delete(this.guildId);
    this.removeAllListeners();
  }


  /**
   * Enable/disable autoplay
   * @param {Player|boolean} playerOrEnabled
   * @returns {Promise<Player>}
   */
  async autoplay(playerOrEnabled) {
    if (playerOrEnabled === false || playerOrEnabled === null) {
      this.isAutoplay = false;
      return this;
    }

    if (!playerOrEnabled) {
      throw new Error('Missing argument. Use: player.autoplay(player)');
    }

    // Check if autoplay feature is enabled
    if (!this.pappify.isEnabled('autoplay')) {
      throw new Error('Autoplay feature is disabled. Enable it in Pappify config: { autoplay: true }');
    }

    this.isAutoplay = true;

    if (!this.previous) return this;

    // Track played identifiers to avoid repeats
    const prevId = this.previous.info.identifier || this.previous.info.uri;
    this._playedIdentifiers.add(prevId);
    
    if (this._playedIdentifiers.size > 50) {
      const first = this._playedIdentifiers.values().next().value;
      this._playedIdentifiers.delete(first);
    }

    this.pappify.emit('debug', `[Player ${this.guildId}] Autoplay from: ${this.previous.info.sourceName}`);

    try {
      const source = this.previous.info.sourceName;
      
      if (source === 'youtube') {
        return await this._autoplayYouTube();
      } else if (source === 'soundcloud') {
        return await this._autoplaySoundCloud();
      } else if (source === 'spotify') {
        return await this._autoplaySpotify();
      }
    } catch (error) {
      this.pappify.emit('debug', `[Player ${this.guildId}] Autoplay error: ${error.message}`);
      return this.stop();
    }

    return this;
  }

  /**
   * @private
   */
  async _autoplayYouTube() {
    const id = this.previous.info.identifier;
    const query = `https://www.youtube.com/watch?v=${id}&list=RD${id}`;
    
    const result = await this.pappify.resolve({
      query,
      source: 'ytmsearch',
      requester: this.previous.info.requester,
    });

    if (!result?.tracks?.length) return this.stop();

    const available = result.tracks.filter(t => {
      const trackId = t.info.identifier || t.info.uri;
      return !this._playedIdentifiers.has(trackId);
    });

    const tracks = available.length ? available : result.tracks;
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    
    this.queue.add(track);
    return this.play();
  }

  /**
   * @private
   */
  async _autoplaySoundCloud() {
    const result = await this.pappify.resolve({
      query: `${this.previous.info.uri}/recommended`,
      source: 'scsearch',
      requester: this.previous.info.requester,
    });

    if (!result?.tracks?.length) return this.stop();

    const available = result.tracks.filter(t => {
      const trackId = t.info.identifier || t.info.uri;
      return !this._playedIdentifiers.has(trackId);
    });

    const tracks = available.length ? available : result.tracks;
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    
    this.queue.add(track);
    return this.play();
  }

  /**
   * @private
   */
  async _autoplaySpotify() {
    // Search on YouTube first
    const ytQuery = `${this.previous.info.title} ${this.previous.info.author} official`;
    const ytResult = await this.pappify.resolve({
      query: ytQuery,
      source: 'ytsearch',
      requester: this.previous.info.requester,
    });

    if (!ytResult?.tracks?.length) return this.stop();

    const ytTrack = ytResult.tracks[0];
    const rdUrl = `https://www.youtube.com/watch?v=${ytTrack.info.identifier}&list=RD${ytTrack.info.identifier}`;
    
    const rdResult = await this.pappify.resolve({
      query: rdUrl,
      source: 'ytsearch',
      requester: this.previous.info.requester,
    });

    if (!rdResult?.tracks?.length) return this.stop();

    const recommended = rdResult.tracks[Math.floor(Math.random() * rdResult.tracks.length)];
    
    // Clean up title for Spotify search
    let title = recommended.info.title
      .replace(/\s*[\[(][^\])]+[\])]/g, '')
      .replace(/\b(official\s+music\s+video|official\s+video|lyrics|audio|hd|mv)\b/gi, '')
      .trim();

    const spQuery = `${title} ${recommended.info.author}`.trim();
    const spResult = await this.pappify.resolve({
      query: spQuery,
      source: 'spsearch',
      requester: this.previous.info.requester,
    });

    if (!spResult?.tracks?.length) return this.stop();

    // Filter by duration (>60s) and not played
    let valid = spResult.tracks.filter(t => {
      const duration = t.info.length || 0;
      const trackId = t.info.identifier || t.info.uri;
      return duration >= 60000 && !this._playedIdentifiers.has(trackId);
    });

    if (!valid.length) {
      valid = spResult.tracks.filter(t => (t.info.length || 0) >= 60000);
    }

    if (!valid.length) return this.stop();

    this.queue.add(valid[0]);
    return this.play();
  }

  /**
   * Handle Lavalink events
   * @private
   */
  _handleEvent(payload) {
    if (this.migrating) {
      this.pappify.emit('debug', `[Player ${this.guildId}] Ignoring event during migration: ${payload.type}`);
      return;
    }

    const track = this.current;

    switch (payload.type) {
      case 'TrackStartEvent':
        this._onTrackStart(track, payload);
        break;
      case 'TrackEndEvent':
        this._onTrackEnd(track, payload);
        break;
      case 'TrackExceptionEvent':
        this._onTrackException(track, payload);
        break;
      case 'TrackStuckEvent':
        this._onTrackStuck(track, payload);
        break;
      case 'WebSocketClosedEvent':
        this._onWebSocketClosed(payload);
        break;
      default:
        this.pappify.emit('nodeError', this.node, new Error(`Unknown event: ${payload.type}`));
    }
  }

  /**
   * @private
   */
  _onTrackStart(track, payload) {
    this.playing = true;
    this.paused = false;
    this.pappify.emit('debug', `[Player ${this.guildId}] Track started: ${track?.info?.title}`);
    this.pappify.emit('trackStart', this, track, payload);
  }

  /**
   * @private
   */
  _onTrackEnd(track, payload) {
    // Store previous track
    this._addToPrevious(track);
    
    const reason = payload.reason.toLowerCase();

    // Don't auto-advance on replace
    if (reason === 'replaced') {
      this.pappify.emit('trackEnd', this, track, payload);
      return;
    }

    // Don't loop failed/cleaned tracks
    if (['loadfailed', 'cleanup', 'load_failed'].includes(reason.replace('_', ''))) {
      if (this.queue.length === 0) {
        this.playing = false;
        this.pappify.emit('debug', `[Player ${this.guildId}] Queue ended (track failed)`);
        this.pappify.emit('queueEnd', this);
        return;
      }
      this.pappify.emit('trackEnd', this, track, payload);
      return this.play();
    }

    this.pappify.emit('debug', `[Player ${this.guildId}] Track ended: ${track?.info?.title} (${payload.reason})`);

    // Handle loop modes
    if (this.loop === 'track' && this.previous) {
      this.queue.unshift(this.previous);
      this.pappify.emit('trackEnd', this, track, payload);
      return this.play();
    }

    if (this.loop === 'queue' && this.previous) {
      this.queue.push(this.previous);
      this.pappify.emit('trackEnd', this, track, payload);
      return this.play();
    }

    // Play next or end queue
    if (this.queue.length > 0) {
      this.pappify.emit('trackEnd', this, track, payload);
      return this.play();
    }

    this.playing = false;
    
    // Autoplay if enabled
    if (this.isAutoplay && this.previous) {
      this.autoplay(this);
      return;
    }

    this.pappify.emit('queueEnd', this);
  }

  /**
   * @private
   */
  _onTrackException(track, payload) {
    this.pappify.emit('debug', `[Player ${this.guildId}] Track exception: ${JSON.stringify(payload.exception)}`);
    this.pappify.emit('trackError', this, track, payload);
    this.stop();
  }

  /**
   * @private
   */
  _onTrackStuck(track, payload) {
    this.pappify.emit('debug', `[Player ${this.guildId}] Track stuck for ${payload.thresholdMs}ms`);
    this.pappify.emit('trackStuck', this, track, payload);
    this.stop();
  }

  /**
   * @private
   */
  _onWebSocketClosed(payload) {
    // Reconnect on certain codes
    if ([4015, 4009].includes(payload.code)) {
      this.pappify.send({
        op: 4,
        d: {
          guild_id: payload.guildId,
          channel_id: this.voiceChannel,
          self_mute: this.mute,
          self_deaf: this.deaf,
        },
      });
    }

    this.pappify.emit('socketClosed', this, payload);
    this.pause(true);
    this.pappify.emit('debug', `[Player ${this.guildId}] WebSocket closed: ${payload.code}`);
  }

  /**
   * @private
   */
  _addToPrevious(track) {
    if (!track) return;
    
    const maxHistory = this.pappify.options.multipleTrackHistory;
    
    if (Number.isInteger(maxHistory) && this.previousTracks.length >= maxHistory) {
      this.previousTracks.splice(maxHistory, this.previousTracks.length);
    } else if (!maxHistory) {
      this.previousTracks[0] = track;
      this.previous = track;
      return;
    }

    this.previousTracks.unshift(track);
    this.previous = track;
  }

  /**
   * Move player to different node
   * @param {Object} newNode
   * @returns {Promise<Player>}
   */
  async moveTo(newNode) {
    if (!newNode) throw new TypeError('Must provide a node');
    if (!newNode.connected) throw new Error('Target node is not connected');
    if (this.node === newNode) throw new Error('Already on this node');

    this.migrating = true;

    try {
      const oldNode = this.node;
      const state = {
        track: this.current,
        position: this.position,
        volume: this.volume,
        paused: this.paused,
        filters: this.filters.toJSON(),
        voice: {
          token: this.connection.voice.token,
          endpoint: this.connection.voice.endpoint,
          sessionId: this.connection.voice.sessionId,
        },
      };

      if (oldNode.connected) {
        await oldNode.rest.destroyPlayer(this.guildId);
      }

      this.node = newNode;

      // Restore voice connection
      await this.node.rest.updatePlayer({
        guildId: this.guildId,
        data: { voice: state.voice },
      });

      // Restore playback state
      if (state.track) {
        await this.node.rest.updatePlayer({
          guildId: this.guildId,
          data: {
            track: { encoded: state.track.track },
            position: state.position,
            volume: state.volume,
            paused: state.paused,
            filters: state.filters,
          },
        });
      }

      this.pappify.emit('playerMoved', this, oldNode, newNode);
    } finally {
      this.migrating = false;
    }

    return this;
  }

  /**
   * Restart current track
   * @returns {Promise<Player>}
   */
  async restart() {
    if (!this.current) return this;
    
    await this.node.rest.updatePlayer({
      guildId: this.guildId,
      data: {
        track: { encoded: this.current.track },
        position: 0,
      },
    });

    return this;
  }

  /**
   * Set custom data
   * @param {string} key
   * @param {*} value
   * @returns {*}
   */
  set(key, value) {
    return this.data[key] = value;
  }

  /**
   * Get custom data
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this.data[key];
  }

  /**
   * Clear all custom data
   * @returns {Player}
   */
  clearData() {
    this.data = {};
    return this;
  }
}

module.exports = { Player };
