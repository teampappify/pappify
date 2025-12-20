/**
 * Audio mixer for NodeLink servers
 * Allows layering multiple tracks simultaneously
 */
class Mixer {
  /**
   * @param {Object} node - Node instance
   */
  constructor(node) {
    this.node = node;
  }

  /**
   * Check if node supports mixing (NodeLink only)
   * @returns {boolean}
   */
  isAvailable() {
    return this.node.info?.isNodelink ?? false;
  }

  /**
   * Ensure mixer is available
   * @private
   */
  _ensureAvailable() {
    if (!this.isAvailable()) {
      throw new Error('Mixer requires NodeLink server');
    }
  }

  /**
   * Add a mix layer
   * @param {string} guildId - Guild ID
   * @param {Object} options - Mix layer options
   * @param {Object} options.track - Track object
   * @param {string} [options.track.encoded] - Encoded track string
   * @param {string} [options.track.identifier] - Track identifier
   * @param {Object} [options.track.userData] - User data
   * @param {number} [options.volume=0.8] - Volume (0.0 - 1.0)
   * @returns {Promise<Object>}
   */
  async addLayer(guildId, options) {
    this._ensureAvailable();

    if (!options?.track) {
      throw new TypeError('options.track is required');
    }

    if (options.track.encoded && options.track.identifier) {
      throw new TypeError('Cannot provide both encoded and identifier');
    }

    if (options.volume !== undefined) {
      if (typeof options.volume !== 'number' || options.volume < 0 || options.volume > 1) {
        throw new TypeError('volume must be a number between 0 and 1');
      }
    }

    const body = { track: options.track };
    if (options.volume !== undefined) {
      body.volume = options.volume;
    }

    return this.node.rest.makeRequest(
      'POST',
      `/v4/sessions/${this.node.sessionId}/players/${guildId}/mix`,
      body
    );
  }

  /**
   * Get active mix layers
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object[]>}
   */
  async getLayers(guildId) {
    this._ensureAvailable();
    return this.node.rest.makeRequest(
      'GET',
      `/v4/sessions/${this.node.sessionId}/players/${guildId}/mix`
    );
  }

  /**
   * Update mix layer volume
   * @param {string} guildId - Guild ID
   * @param {string} mixId - Mix layer ID
   * @param {number} volume - New volume (0.0 - 1.0)
   * @returns {Promise<Object>}
   */
  async updateLayerVolume(guildId, mixId, volume) {
    this._ensureAvailable();

    if (!guildId || !mixId) {
      throw new TypeError('guildId and mixId are required');
    }

    if (typeof volume !== 'number' || volume < 0 || volume > 1) {
      throw new TypeError('volume must be a number between 0 and 1');
    }

    return this.node.rest.makeRequest(
      'PATCH',
      `/v4/sessions/${this.node.sessionId}/players/${guildId}/mix/${mixId}`,
      { volume }
    );
  }

  /**
   * Remove a mix layer
   * @param {string} guildId - Guild ID
   * @param {string} mixId - Mix layer ID
   * @returns {Promise<void>}
   */
  async removeLayer(guildId, mixId) {
    this._ensureAvailable();

    if (!guildId || !mixId) {
      throw new TypeError('guildId and mixId are required');
    }

    return this.node.rest.makeRequest(
      'DELETE',
      `/v4/sessions/${this.node.sessionId}/players/${guildId}/mix/${mixId}`
    );
  }

  /**
   * Remove all mix layers
   * @param {string} guildId - Guild ID
   * @returns {Promise<void>}
   */
  async clearLayers(guildId) {
    this._ensureAvailable();

    const layers = await this.getLayers(guildId);
    await Promise.all(layers.map(l => this.removeLayer(guildId, l.id)));
  }
}

module.exports = { Mixer };
