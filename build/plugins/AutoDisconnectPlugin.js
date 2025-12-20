const { Plugin } = require('../core/Plugin');

/**
 * Plugin for automatic disconnection when idle or alone
 */
class AutoDisconnectPlugin extends Plugin {
  /**
   * @param {Object} options
   * @param {number} [options.timeout=300000] - Idle timeout (ms), default 5 min
   * @param {boolean} [options.leaveOnEmpty=true] - Leave when channel empty
   * @param {number} [options.emptyDelay=30000] - Delay before leaving empty channel
   * @param {boolean} [options.leaveOnQueueEnd=false] - Leave when queue ends
   * @param {number} [options.queueEndDelay=60000] - Delay after queue ends
   */
  constructor(options = {}) {
    super('AutoDisconnectPlugin');
    this.timeout = options.timeout ?? 300000;
    this.leaveOnEmpty = options.leaveOnEmpty ?? true;
    this.emptyDelay = options.emptyDelay ?? 30000;
    this.leaveOnQueueEnd = options.leaveOnQueueEnd ?? false;
    this.queueEndDelay = options.queueEndDelay ?? 60000;
    
    this._timers = new Map();
    this._pappify = null;
  }

  /**
   * Load the plugin
   * @param {Object} pappify
   */
  load(pappify) {
    this._pappify = pappify;

    // Queue end handler
    pappify.on('queueEnd', (player) => {
      if (this.leaveOnQueueEnd) {
        this._startTimer(player.guildId, 'queueEnd', this.queueEndDelay);
      }
    });

    // Track start - cancel timers
    pappify.on('trackStart', (player) => {
      this._clearTimer(player.guildId);
    });

    // Player pause - start idle timer
    pappify.on('playerUpdate', (player) => {
      if (player.paused && !player.queue.length) {
        this._startTimer(player.guildId, 'idle', this.timeout);
      } else if (!player.paused) {
        this._clearTimer(player.guildId);
      }
    });

    pappify.emit('debug', '[AutoDisconnectPlugin] Loaded');
  }

  /**
   * Check if voice channel is empty (requires Discord client access)
   * @param {Object} player
   * @returns {boolean}
   */
  isChannelEmpty(player) {
    const client = this._pappify.client;
    if (!client?.guilds?.cache) return false;

    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return false;

    const channel = guild.channels.cache.get(player.voiceChannel);
    if (!channel) return false;

    // Check if only bot in channel
    const members = channel.members?.filter(m => !m.user.bot);
    return members?.size === 0;
  }

  /**
   * Handle voice state update for empty channel detection
   * @param {Object} oldState
   * @param {Object} newState
   */
  handleVoiceStateUpdate(oldState, newState) {
    if (!this.leaveOnEmpty) return;

    const guildId = oldState?.guild?.id || newState?.guild?.id;
    const player = this._pappify.players.get(guildId);
    if (!player) return;

    // Check if someone left the bot's channel
    if (oldState?.channelId === player.voiceChannel && 
        oldState?.channelId !== newState?.channelId) {
      if (this.isChannelEmpty(player)) {
        this._startTimer(guildId, 'empty', this.emptyDelay);
      }
    }

    // Someone joined - cancel timer
    if (newState?.channelId === player.voiceChannel) {
      this._clearTimer(guildId);
    }
  }

  /**
   * @private
   */
  _startTimer(guildId, reason, delay) {
    this._clearTimer(guildId);

    const timer = setTimeout(() => {
      const player = this._pappify.players.get(guildId);
      if (player) {
        this._pappify.emit('debug', `[AutoDisconnectPlugin] Disconnecting ${guildId} (${reason})`);
        player.destroy();
      }
      this._timers.delete(guildId);
    }, delay);

    this._timers.set(guildId, timer);
  }

  /**
   * @private
   */
  _clearTimer(guildId) {
    const timer = this._timers.get(guildId);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(guildId);
    }
  }

  /**
   * Unload the plugin
   * @param {Object} pappify
   */
  unload(pappify) {
    for (const timer of this._timers.values()) {
      clearTimeout(timer);
    }
    this._timers.clear();
    pappify.emit('debug', '[AutoDisconnectPlugin] Unloaded');
  }
}

module.exports = { AutoDisconnectPlugin };
