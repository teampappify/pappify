/**
 * Voice recording support for NodeLink servers
 * Record voice channel audio
 */
class VoiceRecorder {
  /**
   * @param {Object} node - Node instance
   */
  constructor(node) {
    this.node = node;
    this.recordings = new Map();
  }

  /**
   * Check if recording is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.node.info?.isNodelink ?? false;
  }

  /**
   * @private
   */
  _ensureAvailable() {
    if (!this.isAvailable()) {
      throw new Error('Voice recording requires NodeLink server');
    }
  }

  /**
   * Start recording
   * @param {string} guildId - Guild ID
   * @param {Object} options - Recording options
   * @param {string} [options.format='mp3'] - Output format (mp3, ogg, wav)
   * @param {number} [options.bitrate=128] - Bitrate in kbps
   * @param {boolean} [options.separateTracks=false] - Separate track per user
   * @returns {Promise<Object>}
   */
  async start(guildId, options = {}) {
    this._ensureAvailable();

    const config = {
      format: options.format || 'mp3',
      bitrate: options.bitrate || 128,
      separateTracks: options.separateTracks || false,
    };

    const response = await this.node.rest.makeRequest(
      'POST',
      `/v4/sessions/${this.node.sessionId}/players/${guildId}/recording/start`,
      config
    );

    this.recordings.set(guildId, {
      startTime: Date.now(),
      config,
    });

    return response;
  }

  /**
   * Stop recording
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>}
   */
  async stop(guildId) {
    this._ensureAvailable();

    const response = await this.node.rest.makeRequest(
      'POST',
      `/v4/sessions/${this.node.sessionId}/players/${guildId}/recording/stop`
    );

    this.recordings.delete(guildId);
    return response;
  }

  /**
   * Get recording status
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>}
   */
  async getStatus(guildId) {
    this._ensureAvailable();

    return this.node.rest.makeRequest(
      'GET',
      `/v4/sessions/${this.node.sessionId}/players/${guildId}/recording`
    );
  }

  /**
   * Check if currently recording
   * @param {string} guildId - Guild ID
   * @returns {boolean}
   */
  isRecording(guildId) {
    return this.recordings.has(guildId);
  }

  /**
   * Get recording duration
   * @param {string} guildId - Guild ID
   * @returns {number} Duration in ms
   */
  getDuration(guildId) {
    const recording = this.recordings.get(guildId);
    if (!recording) return 0;
    return Date.now() - recording.startTime;
  }
}

module.exports = { VoiceRecorder };
