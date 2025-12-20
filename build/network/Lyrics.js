/**
 * Lyrics manager for fetching track lyrics
 * Supports lavalyrics-plugin, java-lyrics-plugin
 */
class Lyrics {
  /**
   * @param {Object} node - Node instance
   */
  constructor(node) {
    this.node = node;
  }

  /**
   * Check if lyrics plugins are available
   * @param {boolean} eitherOne - Return true if at least one plugin exists
   * @param {...string} plugins - Plugin names to check
   * @returns {Promise<boolean>}
   */
  async checkAvailable(eitherOne = true, ...plugins) {
    if (!this.node.sessionId) {
      throw new Error(`Node (${this.node.name}) is not connected`);
    }

    if (!plugins.length) {
      plugins = ['lavalyrics-plugin', 'java-lyrics-plugin', 'lyrics'];
    }

    const nodePlugins = this.node.info?.plugins || [];
    const missing = plugins.filter(p => !nodePlugins.find(np => np.name === p));
    const allMissing = missing.length === plugins.length;

    if (eitherOne && allMissing) {
      throw new RangeError(`Node (${this.node.name}) missing lyrics plugins: ${missing.join(', ')}`);
    } else if (!eitherOne && missing.length) {
      throw new RangeError(`Node (${this.node.name}) missing plugins: ${missing.join(', ')}`);
    }

    return true;
  }

  /**
   * Get lyrics for a track
   * @param {Object|string} trackOrEncoded - Track object or encoded string
   * @param {boolean} skipTrackSource - Skip track source, use highest priority
   * @returns {Promise<Object|null>}
   */
  async get(trackOrEncoded, skipTrackSource = false) {
    try {
      await this.checkAvailable(false, 'lavalyrics-plugin');
    } catch {
      return null;
    }

    const encoded = typeof trackOrEncoded === 'string' 
      ? trackOrEncoded 
      : trackOrEncoded.track || trackOrEncoded.encoded;

    if (!encoded) {
      throw new TypeError('Invalid track: must be Track object or encoded string');
    }

    return this.node.rest.makeRequest(
      'GET',
      `/v4/lyrics?skipTrackSource=${skipTrackSource}&track=${encodeURIComponent(encoded)}`
    );
  }

  /**
   * Get lyrics for currently playing track
   * @param {string} guildId - Guild ID
   * @param {boolean} skipTrackSource - Skip track source
   * @param {string} [plugin] - Specific plugin to use
   * @returns {Promise<Object|null>}
   */
  async getCurrentTrack(guildId, skipTrackSource = false, plugin) {
    try {
      await this.checkAvailable();
    } catch {
      return null;
    }

    const nodePlugins = this.node.info?.plugins || [];
    const hasLavaLyrics = nodePlugins.find(p => p.name === 'lavalyrics-plugin');
    const hasJavaLyrics = nodePlugins.find(p => p.name === 'java-lyrics-plugin' || p.name === 'lyrics');

    let endpoint;

    if (plugin && ['java-lyrics-plugin', 'lyrics'].includes(plugin)) {
      endpoint = `/v4/sessions/${this.node.sessionId}/players/${guildId}/lyrics?skipTrackSource=${skipTrackSource}`;
    } else if (!plugin && hasJavaLyrics && !hasLavaLyrics) {
      endpoint = `/v4/sessions/${this.node.sessionId}/players/${guildId}/lyrics?skipTrackSource=${skipTrackSource}`;
    } else {
      endpoint = `/v4/sessions/${this.node.sessionId}/players/${guildId}/track/lyrics?skipTrackSource=${skipTrackSource}`;
    }

    return this.node.rest.makeRequest('GET', endpoint);
  }

  /**
   * Search lyrics by text
   * @param {string} query - Search query
   * @returns {Promise<Object|null>}
   */
  async search(query) {
    try {
      await this.checkAvailable(false, 'lavalyrics-plugin');
    } catch {
      return null;
    }

    return this.node.rest.makeRequest(
      'GET',
      `/v4/lyrics/search?query=${encodeURIComponent(query)}`
    );
  }
}

module.exports = { Lyrics };
