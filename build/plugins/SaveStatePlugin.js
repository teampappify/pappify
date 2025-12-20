const { Plugin } = require('../core/Plugin');
const { PlayerState } = require('../player/PlayerState');
const fs = require('fs').promises;
const path = require('path');

/**
 * Plugin for automatic player state persistence
 */
class SaveStatePlugin extends Plugin {
  /**
   * @param {Object} options
   * @param {string} [options.path='./pappify-states.json'] - State file path
   * @param {number} [options.saveInterval=30000] - Auto-save interval (ms)
   * @param {boolean} [options.autoRestore=true] - Auto-restore on init
   */
  constructor(options = {}) {
    super('SaveStatePlugin');
    this.filePath = options.path || './pappify-states.json';
    this.saveInterval = options.saveInterval || 30000;
    this.autoRestore = options.autoRestore ?? true;
    this._interval = null;
    this._pappify = null;
  }

  /**
   * Load the plugin
   * @param {Object} pappify
   */
  load(pappify) {
    this._pappify = pappify;

    // Auto-save interval
    this._interval = setInterval(() => this.save(), this.saveInterval);

    // Save on player destroy
    pappify.on('playerDestroy', () => this.save());

    // Save on process exit
    process.on('beforeExit', () => this.save());
    process.on('SIGINT', async () => {
      await this.save();
      process.exit(0);
    });

    // Auto-restore
    if (this.autoRestore) {
      // Wait for first node to connect
      pappify.once('nodeConnect', async () => {
        await this.restore();
      });
    }

    // Expose methods
    pappify.saveStates = () => this.save();
    pappify.restoreStates = (options) => this.restore(options);

    pappify.emit('debug', '[SaveStatePlugin] Loaded');
  }

  /**
   * Save all player states
   * @returns {Promise<void>}
   */
  async save() {
    if (!this._pappify || this._pappify.players.size === 0) return;

    try {
      const states = PlayerState.serializeAll(this._pappify);
      await fs.writeFile(this.filePath, JSON.stringify(states, null, 2));
      this._pappify.emit('debug', `[SaveStatePlugin] Saved ${states.length} player(s)`);
    } catch (error) {
      this._pappify.emit('debug', `[SaveStatePlugin] Save error: ${error.message}`);
    }
  }

  /**
   * Restore player states
   * @param {Object} options
   * @returns {Promise<Object[]>}
   */
  async restore(options = {}) {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const states = JSON.parse(data);

      if (!states.length) return [];

      this._pappify.emit('debug', `[SaveStatePlugin] Restoring ${states.length} player(s)`);
      const players = await PlayerState.restoreAll(this._pappify, states, options);

      // Clear file after restore
      await fs.writeFile(this.filePath, '[]');

      return players;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this._pappify.emit('debug', `[SaveStatePlugin] Restore error: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Unload the plugin
   * @param {Object} pappify
   */
  unload(pappify) {
    if (this._interval) {
      clearInterval(this._interval);
    }
    delete pappify.saveStates;
    delete pappify.restoreStates;
    pappify.emit('debug', '[SaveStatePlugin] Unloaded');
  }
}

module.exports = { SaveStatePlugin };
