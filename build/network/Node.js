const WebSocket = require('ws');
const { Rest } = require('./Rest');
const { Track } = require('../player/Track');
const { Lyrics } = require('./Lyrics');
const { Mixer } = require('./Mixer');
const { VoiceRecorder } = require('./VoiceRecorder');

/**
 * Represents a Lavalink node connection
 */
class Node {
  constructor(pappify, node, options) {
    this.pappify = pappify;
    this.name = node.name || node.host;
    this.host = node.host || 'localhost';
    this.port = node.port || 2333;
    this.password = node.password || 'youshallnotpass';
    this.secure = node.secure || false;
    this.regions = node.regions || [];
    this.restVersion = options.restVersion || 'v4';
    this.sessionId = node.sessionId || null;
    this.resumeKey = options.resumeKey || null;
    this.resumeTimeout = options.resumeTimeout || 60;
    this.autoResume = options.autoResume || false;
    this.reconnectTimeout = options.reconnectTimeout || 5000;
    this.reconnectTries = options.reconnectTries || 5;
    this.reconnectAttempt = null;
    this.reconnectAttempted = 0;
    this.connected = false;
    this.info = null;
    this.ws = null;
    this.lastStats = Date.now();
    this.stats = {
      players: 0, playingPlayers: 0, uptime: 0,
      memory: { free: 0, used: 0, allocated: 0, reservable: 0 },
      cpu: { cores: 0, systemLoad: 0, lavalinkLoad: 0 },
      frameStats: { sent: 0, nulled: 0, deficit: 0 },
    };
    this.rest = new Rest(pappify, {
      host: this.host, port: this.port, password: this.password,
      secure: this.secure, restVersion: this.restVersion, sessionId: this.sessionId,
    });
    
    // Feature-gated components
    this.lyrics = pappify.isEnabled('lyrics') ? new Lyrics(this) : this._createDisabledFeature('lyrics');
    this.mixer = pappify.isEnabled('mixer') ? new Mixer(this) : this._createDisabledFeature('mixer');
    this.recorder = pappify.isEnabled('recorder') ? new VoiceRecorder(this) : this._createDisabledFeature('recorder');
    this.wsUrl = this.restVersion === 'v4'
      ? `ws${this.secure ? 's' : ''}://${this.host}:${this.port}/v4/websocket`
      : `ws${this.secure ? 's' : ''}://${this.host}:${this.port}`;
  }

  /**
   * Create a disabled feature proxy
   * @private
   */
  _createDisabledFeature(name) {
    return new Proxy({}, {
      get: (_, prop) => {
        if (prop === 'toJSON') return () => ({});
        return () => { throw new Error(`Feature "${name}" is disabled. Enable it in Pappify config: { ${name}: true }`); };
      }
    });
  }

  get penalties() {
    let penalties = 0;
    if (!this.connected) return penalties;
    if (this.stats.players) penalties += this.stats.players;
    if (this.stats.cpu?.systemLoad) penalties += Math.round(Math.pow(1.05, 100 * this.stats.cpu.systemLoad) * 10 - 10);
    if (this.stats.frameStats) {
      penalties += this.stats.frameStats.deficit || 0;
      penalties += (this.stats.frameStats.nulled || 0) * 2;
    }
    return penalties;
  }

  get isNodeLink() { return this.info?.isNodelink ?? false; }

  async connect() {
    if (this.ws) this.ws.close();
    this.pappify.emit('debug', `[Node ${this.name}] Connecting...`);
    const headers = {
      'Authorization': this.password,
      'User-Id': this.pappify.clientId,
      'Client-Name': `Pappify/${this.pappify.version}`,
    };
    if (this.restVersion === 'v4' && this.sessionId) headers['Session-Id'] = this.sessionId;
    else if (this.resumeKey) headers['Resume-Key'] = this.resumeKey;
    this.ws = new WebSocket(this.wsUrl, { headers });
    this.ws.on('open', this._onOpen.bind(this));
    this.ws.on('message', this._onMessage.bind(this));
    this.ws.on('close', this._onClose.bind(this));
    this.ws.on('error', this._onError.bind(this));
  }

  async _onOpen() {
    if (this.reconnectAttempt) {
      clearTimeout(this.reconnectAttempt);
      this.reconnectAttempted = 0;
      this.reconnectAttempt = null;
    }
    this.connected = true;
    this.pappify.emit('debug', `[Node ${this.name}] WebSocket connected`);
    try { this.info = await this.rest.getInfo(); } catch (e) {
      this.pappify.emit('debug', `[Node ${this.name}] Failed to fetch info: ${e.message}`);
    }
    if (this.autoResume) {
      for (const player of this.pappify.players.values()) {
        if (player.node === this) player.restart();
      }
    }
  }

  _onMessage(data) {
    if (Array.isArray(data)) data = Buffer.concat(data);
    else if (data instanceof ArrayBuffer) data = Buffer.from(data);
    let payload;
    try { payload = JSON.parse(data.toString()); } catch { return; }
    if (!payload.op) return;
    this.pappify.emit('raw', 'Node', payload);
    this.pappify.emit('debug', `[Node ${this.name}] Received: ${payload.op}`);
    switch (payload.op) {
      case 'ready': this._handleReady(payload); break;
      case 'stats': this._handleStats(payload); break;
      case 'playerUpdate':
      case 'event': this._handlePlayerEvent(payload); break;
    }
  }

  _handleReady(payload) {
    if (this.sessionId !== payload.sessionId) {
      this.rest.setSessionId(payload.sessionId);
      this.sessionId = payload.sessionId;
    }
    this.pappify.emit('nodeConnect', this);
    this.pappify.emit('debug', `[Node ${this.name}] Ready! Session: ${payload.sessionId}${this.isNodeLink ? ' (NodeLink)' : ''}`);
    if (this.restVersion === 'v4' && this.sessionId) {
      this.rest.updateSession(true, this.resumeTimeout);
      this.pappify.emit('debug', `[Node ${this.name}] Resume configured`);
    }
  }

  _handleStats(payload) {
    this.stats = {
      players: payload.players, playingPlayers: payload.playingPlayers, uptime: payload.uptime,
      memory: payload.memory, cpu: payload.cpu, frameStats: payload.frameStats,
    };
    this.lastStats = Date.now();
  }

  _handlePlayerEvent(payload) {
    const player = this.pappify.players.get(payload.guildId);
    if (player) player.emit(payload.op, payload);
  }

  _onClose(code, reason) {
    this.connected = false;
    this.pappify.emit('nodeDisconnect', this, { code, reason: reason?.toString() });
    this.pappify.emit('debug', `[Node ${this.name}] Disconnected: ${code}`);
    if (this.pappify.migrateOnDisconnect) {
      this.pappify.migrate(this).catch(err => {
        this.pappify.emit('debug', `[Node ${this.name}] Migration failed: ${err.message}`);
      });
    }
    this._reconnect();
  }

  _onError(error) {
    this.pappify.emit('nodeError', this, error);
    this.pappify.emit('debug', `[Node ${this.name}] Error: ${error.message}`);
    if (this.pappify.migrateOnFailure) {
      this.pappify.migrate(this).catch(err => {
        this.pappify.emit('debug', `[Node ${this.name}] Migration failed: ${err.message}`);
      });
    }
  }

  _reconnect() {
    this.reconnectAttempt = setTimeout(() => {
      if (this.reconnectAttempted >= this.reconnectTries) {
        this.pappify.emit('nodeError', this, new Error(`Failed to reconnect after ${this.reconnectTries} attempts`));
        return this.destroy();
      }
      this.reconnectAttempted++;
      this.pappify.emit('nodeReconnect', this);
      this.pappify.emit('debug', `[Node ${this.name}] Reconnecting (${this.reconnectAttempted}/${this.reconnectTries})`);
      this.ws?.removeAllListeners();
      this.ws = null;
      this.connect();
    }, this.reconnectTimeout);
  }

  disconnect() {
    if (!this.connected) return;
    for (const player of this.pappify.players.values()) {
      if (player.node === this) {
        const bestNode = this.pappify.bestNode;
        if (bestNode && bestNode !== this) player.moveTo(bestNode);
      }
    }
    this.ws?.close(1000, 'disconnect');
    this.ws?.removeAllListeners();
    this.ws = null;
    this.connected = false;
    this.pappify.emit('nodeDisconnect', this, { code: 1000, reason: 'disconnect' });
  }

  destroy(clean = false) {
    if (clean) {
      this.ws?.removeAllListeners();
      this.ws = null;
      this.pappify.emit('nodeDestroy', this);
      this.pappify.nodeMap.delete(this.name);
      return;
    }
    if (!this.connected) return;
    for (const player of this.pappify.players.values()) {
      if (player.node === this) player.destroy();
    }
    this.ws?.close(1000, 'destroy');
    this.ws?.removeAllListeners();
    this.ws = null;
    if (this.reconnectAttempt) clearTimeout(this.reconnectAttempt);
    this.pappify.emit('nodeDestroy', this);
    this.pappify.emit('debug', `[Node ${this.name}] Destroyed`);
    this.pappify.nodeMap.delete(this.name);
    this.connected = false;
  }

  async fetchInfo(options = {}) {
    const version = options.restVersion || this.restVersion;
    return this.rest.makeRequest('GET', `/${version}/info`, null, options.includeHeaders);
  }
}

module.exports = { Node };
