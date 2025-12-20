const { EventEmitter } = require('events');
const { Node } = require('../network/Node');
const { Player } = require('../player/Player');
const { Track } = require('../player/Track');
const pkg = require('../../package.json');

const SUPPORTED_VERSIONS = ['v3', 'v4'];

/**
 * Main Pappify client for Lavalink
 * @extends EventEmitter
 */
/**
 * Default configuration options
 */
const DEFAULT_CONFIG = {
  // Core settings
  defaultSearchPlatform: 'ytmsearch',
  restVersion: 'v4',
  
  // Feature toggles
  autoplay: true,           // Enable autoplay feature
  filters: true,            // Enable audio filters
  effects: true,            // Enable audio effects
  voiceEffects: true,       // Enable voice manipulation
  tts: true,                // Enable text-to-speech
  lyrics: true,             // Enable lyrics fetching
  mixer: true,              // Enable audio mixing (NodeLink)
  recorder: true,           // Enable voice recording (NodeLink)
  spotify: true,            // Enable Spotify URL resolution
  
  // Migration settings
  autoMigratePlayers: false,
  migrateOnDisconnect: false,
  migrateOnFailure: false,
  
  // Session settings
  resumeKey: null,
  resumeTimeout: 60,
  autoResume: false,
  
  // Reconnection settings
  reconnectTimeout: 5000,
  reconnectTries: 5,
  
  // Player settings
  defaultVolume: 100,
  maxVolume: 1000,
  connectionTimeout: 15000,
  multipleTrackHistory: null,
  
  // Debug
  debug: false,
};

class Pappify extends EventEmitter {
  /**
   * @param {Object} client - Discord client instance
   * @param {Array} nodes - Node configurations
   * @param {Object} options - Pappify options
   */
  constructor(client, nodes, options) {
    super();

    if (!client) throw new Error('Discord client is required');
    if (!nodes || !Array.isArray(nodes)) throw new TypeError('Nodes must be an array');
    if (!options?.send || typeof options.send !== 'function') {
      throw new Error('send function is required');
    }

    // Merge options with defaults
    this.config = { ...DEFAULT_CONFIG, ...options };
    
    this.client = client;
    this.nodes = nodes;
    this.options = options;
    this.nodeMap = new Map();
    this.players = new Map();
    this.clientId = null;
    this.initiated = false;
    
    // Core settings
    this.send = options.send;
    this.defaultSearchPlatform = this.config.defaultSearchPlatform;
    this.restVersion = this.config.restVersion;
    
    // Feature flags (enable/disable)
    this.features = {
      autoplay: this.config.autoplay,
      filters: this.config.filters,
      effects: this.config.effects,
      voiceEffects: this.config.voiceEffects,
      tts: this.config.tts,
      lyrics: this.config.lyrics,
      mixer: this.config.mixer,
      recorder: this.config.recorder,
      spotify: this.config.spotify,
    };
    
    // Migration settings
    this.autoMigratePlayers = this.config.autoMigratePlayers;
    this.migrateOnDisconnect = this.config.migrateOnDisconnect;
    this.migrateOnFailure = this.config.migrateOnFailure;
    this.migrationStrategyFn = options.migrationStrategyFn || this._defaultMigrationStrategy.bind(this);
    
    // Search cache
    this.tracks = [];
    this.loadType = null;
    this.playlistInfo = null;
    this.pluginInfo = null;
    
    // Plugins
    this.plugins = options.plugins || [];
    
    // Version
    this.version = pkg.version;

    if (!SUPPORTED_VERSIONS.includes(this.restVersion)) {
      throw new RangeError(`${this.restVersion} is not supported. Use: ${SUPPORTED_VERSIONS.join(', ')}`);
    }
  }

  /**
   * Check if a feature is enabled
   * @param {string} feature - Feature name
   * @returns {boolean}
   */
  isEnabled(feature) {
    return this.features[feature] ?? false;
  }

  /**
   * Enable a feature
   * @param {string} feature - Feature name
   * @returns {Pappify}
   */
  enable(feature) {
    if (feature in this.features) {
      this.features[feature] = true;
      this.emit('debug', `[Config] Enabled: ${feature}`);
    }
    return this;
  }

  /**
   * Disable a feature
   * @param {string} feature - Feature name
   * @returns {Pappify}
   */
  disable(feature) {
    if (feature in this.features) {
      this.features[feature] = false;
      this.emit('debug', `[Config] Disabled: ${feature}`);
    }
    return this;
  }

  /**
   * Get all feature states
   * @returns {Object}
   */
  getFeatures() {
    return { ...this.features };
  }

  /**
   * Update configuration
   * @param {Object} newConfig
   * @returns {Pappify}
   */
  setConfig(newConfig) {
    Object.assign(this.config, newConfig);
    
    // Update feature flags if provided
    const featureKeys = ['autoplay', 'filters', 'effects', 'voiceEffects', 'tts', 'lyrics', 'mixer', 'recorder', 'spotify'];
    featureKeys.forEach(key => {
      if (key in newConfig) this.features[key] = newConfig[key];
    });
    
    this.emit('debug', `[Config] Updated configuration`);
    return this;
  }

  /**
   * Get current configuration
   * @returns {Object}
   */
  getConfig() {
    return { ...this.config, features: this.getFeatures() };
  }

  _defaultMigrationStrategy(player, availableNodes) {
    return availableNodes
      .filter(n => n.connected && n !== player.node)
      .sort((a, b) => a.penalties - b.penalties)[0];
  }

  get leastUsedNodes() {
    return [...this.nodeMap.values()]
      .filter(node => node.connected)
      .sort((a, b) => a.rest.calls - b.rest.calls);
  }

  get bestNode() {
    return [...this.nodeMap.values()]
      .filter(node => node.connected)
      .sort((a, b) => a.penalties - b.penalties)[0];
  }

  init(clientId) {
    if (this.initiated) return this;
    this.clientId = clientId;
    this.nodes.forEach(node => this.createNode(node));
    this.initiated = true;
    this.emit('debug', `Pappify v${this.version} initialized with ${this.nodes.length} node(s)`);
    if (this.plugins.length) {
      this.emit('debug', `Loading ${this.plugins.length} plugin(s)`);
      this.plugins.forEach(plugin => plugin.load(this));
    }
    return this;
  }

  createNode(options) {
    const node = new Node(this, options, this.options);
    this.nodeMap.set(options.name || options.host, node);
    node.connect();
    this.emit('nodeCreate', node);
    return node;
  }

  destroyNode(identifier) {
    const node = this.nodeMap.get(identifier);
    if (!node) return;
    node.disconnect();
    this.nodeMap.delete(identifier);
    this.emit('nodeDestroy', node);
  }

  updateVoiceState(packet) {
    if (!['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'].includes(packet.t)) return;
    const player = this.players.get(packet.d.guild_id);
    if (!player) return;
    if (packet.t === 'VOICE_SERVER_UPDATE') {
      player.connection.setServerUpdate(packet.d);
    } else if (packet.t === 'VOICE_STATE_UPDATE') {
      if (packet.d.user_id !== this.clientId) return;
      player.connection.setStateUpdate(packet.d);
    }
  }

  fetchRegion(region) {
    return [...this.nodeMap.values()]
      .filter(node => node.connected && node.regions?.includes(region?.toLowerCase()))
      .sort((a, b) => {
        const aLoad = a.stats.cpu ? (a.stats.cpu.systemLoad / a.stats.cpu.cores) * 100 : 0;
        const bLoad = b.stats.cpu ? (b.stats.cpu.systemLoad / b.stats.cpu.cores) * 100 : 0;
        return aLoad - bLoad;
      });
  }

  createConnection(options) {
    if (!this.initiated) throw new Error('Pappify must be initialized first');
    const existing = this.players.get(options.guildId);
    if (existing) return existing;
    if (this.leastUsedNodes.length === 0) throw new Error('No available nodes');
    let node;
    if (options.region) {
      const regionNodes = this.fetchRegion(options.region);
      node = regionNodes[0] || this.leastUsedNodes[0];
    } else {
      node = this.leastUsedNodes[0];
    }
    if (!node) throw new Error('No available nodes');
    return this.createPlayer(node, options);
  }

  createPlayer(node, options) {
    const player = new Player(this, node, options);
    this.players.set(options.guildId, player);
    player.connect(options);
    this.emit('debug', `[Player ${options.guildId}] Created on node ${node.name}`);
    this.emit('playerCreate', player);
    return player;
  }

  destroyPlayer(guildId) {
    const player = this.players.get(guildId);
    if (!player) return;
    player.destroy();
    this.players.delete(guildId);
    this.emit('playerDestroy', player);
  }

  removeConnection(guildId) {
    const player = this.players.get(guildId);
    if (player) {
      player.destroy();
      this.players.delete(guildId);
    }
  }

  get(guildId) {
    const player = this.players.get(guildId);
    if (!player) throw new Error(`No player found for guild ${guildId}`);
    return player;
  }

  async migrate(target, destinationNode = null) {
    if (target instanceof Player) {
      const player = target;
      let node = destinationNode;
      if (!node) {
        const availableNodes = [...this.nodeMap.values()].filter(n => n.connected && n !== player.node);
        node = this.migrationStrategyFn(player, availableNodes);
      }
      if (!node) {
        const error = new Error('No available nodes for migration');
        this.emit('playerMigrationFailed', player, error);
        throw error;
      }
      if (player.node === node) {
        const error = new Error('Player already on target node');
        this.emit('playerMigrationFailed', player, error);
        throw error;
      }
      try {
        const oldNode = player.node;
        await player.moveTo(node);
        this.emit('playerMigrated', player, oldNode, node);
        return player;
      } catch (error) {
        this.emit('playerMigrationFailed', player, error);
        throw error;
      }
    }
    if (target instanceof Node) {
      const nodeToMigrate = target;
      const playersToMigrate = [...this.players.values()].filter(p => p.node === nodeToMigrate);
      if (!playersToMigrate.length) return [];
      const availableNodes = [...this.nodeMap.values()]
        .filter(n => n.connected && n !== nodeToMigrate)
        .sort((a, b) => a.penalties - b.penalties);
      if (!availableNodes.length) {
        const error = new Error('No available nodes for migration');
        this.emit('nodeMigrationFailed', nodeToMigrate, error);
        throw error;
      }
      const migratedPlayers = [];
      let hasFailed = false;
      for (const player of playersToMigrate) {
        const bestNode = this.migrationStrategyFn(player, availableNodes);
        if (!bestNode) {
          this.emit('debug', `[Migration] No suitable node for player ${player.guildId}`);
          this.emit('playerMigrationFailed', player, new Error('No suitable node'));
          hasFailed = true;
          continue;
        }
        try {
          const oldNode = player.node;
          await player.moveTo(bestNode);
          migratedPlayers.push(player);
          this.emit('playerMigrated', player, oldNode, bestNode);
        } catch (error) {
          this.emit('debug', `[Migration] Failed for player ${player.guildId}: ${error.message}`);
          this.emit('playerMigrationFailed', player, error);
          hasFailed = true;
        }
      }
      if (hasFailed) {
        this.emit('nodeMigrationFailed', nodeToMigrate, new Error('Some players failed to migrate'));
      } else {
        this.emit('nodeMigrated', nodeToMigrate, migratedPlayers);
      }
      return migratedPlayers;
    }
    throw new TypeError('Target must be a Player or Node');
  }

  async resolve({ query, source, requester, node }) {
    if (!this.initiated) throw new Error('Pappify must be initialized first');
    if (node && typeof node !== 'string' && !(node instanceof Node)) {
      throw new TypeError('node must be a string identifier or Node instance');
    }
    const requestNode = (node && typeof node === 'string' ? this.nodeMap.get(node) : node) || this.leastUsedNodes[0];
    if (!requestNode) throw new Error('No available nodes');
    try {
      const searchSource = source || this.defaultSearchPlatform;
      const isUrl = /^https?:\/\//.test(query);
      const identifier = isUrl ? query : `${searchSource}:${query}`;
      this.emit('debug', `[Search] "${query}" on node ${requestNode.name}`);
      let response = await requestNode.rest.loadTracks(identifier);
      if (response.loadType === 'empty' || response.loadType === 'NO_MATCHES') {
        response = await requestNode.rest.loadTracks(`https://open.spotify.com/track/${query}`);
        if (response.loadType === 'empty' || response.loadType === 'NO_MATCHES') {
          response = await requestNode.rest.loadTracks(`https://www.youtube.com/watch?v=${query}`);
        }
      }
      if (requestNode.rest.version === 'v4') {
        this._processV4Response(response, requester, requestNode);
      } else {
        this._processV3Response(response, requester, requestNode);
      }
      this.emit('debug', `[Search] ${this.loadType !== 'error' ? 'Success' : 'Failed'} - ${this.tracks.length} track(s)`);
      return {
        loadType: this.loadType,
        exception: this.loadType === 'error' ? response.data : this.loadType === 'LOAD_FAILED' ? response.exception : null,
        playlistInfo: this.playlistInfo,
        pluginInfo: this.pluginInfo,
        tracks: this.tracks,
      };
    } catch (error) {
      this.emit('debug', `[Search] Error: ${error.message}`);
      throw error;
    }
  }

  _processV4Response(response, requester, node) {
    switch (response.loadType) {
      case 'track':
        this.tracks = response.data ? [new Track(response.data, requester, node)] : [];
        break;
      case 'playlist':
        this.tracks = response.data?.tracks?.map(t => new Track(t, requester, node)) || [];
        this.playlistInfo = response.data?.info || null;
        break;
      case 'search':
        this.tracks = response.data?.map(t => new Track(t, requester, node)) || [];
        break;
      default:
        this.tracks = [];
    }
    this.loadType = response.loadType;
    this.pluginInfo = response.pluginInfo || {};
  }

  _processV3Response(response, requester, node) {
    this.tracks = response.tracks?.map(t => new Track(t, requester, node)) || [];
    this.loadType = response.loadType;
    this.playlistInfo = response.playlistInfo || null;
    this.pluginInfo = response.pluginInfo || {};
  }

  async decodeTrack(track, node) {
    const requestNode = node || this.leastUsedNodes[0];
    if (!requestNode) throw new Error('No available nodes');
    return requestNode.rest.decodeTrack(track);
  }

  async decodeTracks(tracks, node) {
    const requestNode = node || this.leastUsedNodes[0];
    if (!requestNode) throw new Error('No available nodes');
    return requestNode.rest.decodeTracks(tracks);
  }
}

module.exports = { Pappify };
