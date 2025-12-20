/**
 * Advanced voice utilities and effects
 */
class Voice {
  /**
   * @param {Object} player - Player instance
   */
  constructor(player) {
    this.player = player;
    this._pitchShift = 1.0;
    this._speed = 1.0;
  }

  /**
   * Set playback speed without changing pitch
   * @param {number} speed - Speed multiplier (0.5 - 2.0)
   * @returns {Promise<Voice>}
   */
  async setSpeed(speed) {
    if (speed < 0.25 || speed > 3.0) {
      throw new RangeError('Speed must be between 0.25 and 3.0');
    }
    
    this._speed = speed;
    await this.player.filters.setTimescale(true, {
      speed,
      pitch: this._pitchShift,
      rate: 1.0,
    });
    return this;
  }

  /**
   * Set pitch without changing speed
   * @param {number} pitch - Pitch multiplier (0.5 - 2.0)
   * @returns {Promise<Voice>}
   */
  async setPitch(pitch) {
    if (pitch < 0.25 || pitch > 3.0) {
      throw new RangeError('Pitch must be between 0.25 and 3.0');
    }
    
    this._pitchShift = pitch;
    await this.player.filters.setTimescale(true, {
      speed: this._speed,
      pitch,
      rate: 1.0,
    });
    return this;
  }

  /**
   * Set both speed and pitch
   * @param {number} speed
   * @param {number} pitch
   * @returns {Promise<Voice>}
   */
  async setSpeedAndPitch(speed, pitch) {
    this._speed = speed;
    this._pitchShift = pitch;
    await this.player.filters.setTimescale(true, {
      speed,
      pitch,
      rate: 1.0,
    });
    return this;
  }

  /**
   * Reset speed and pitch to normal
   * @returns {Promise<Voice>}
   */
  async reset() {
    this._speed = 1.0;
    this._pitchShift = 1.0;
    await this.player.filters.setTimescale(false);
    return this;
  }

  /**
   * Apply male voice effect
   * @returns {Promise<Voice>}
   */
  async maleVoice() {
    await this.setPitch(0.75);
    return this;
  }

  /**
   * Apply female voice effect
   * @returns {Promise<Voice>}
   */
  async femaleVoice() {
    await this.setPitch(1.3);
    return this;
  }

  /**
   * Apply child voice effect
   * @returns {Promise<Voice>}
   */
  async childVoice() {
    await this.setPitch(1.5);
    return this;
  }

  /**
   * Apply robot voice effect
   * @returns {Promise<Voice>}
   */
  async robotVoice() {
    await this.player.filters.setTimescale(true, {
      speed: 1.0,
      pitch: 0.9,
      rate: 1.0,
    });
    await this.player.filters.setTremolo(true, {
      frequency: 10.0,
      depth: 0.8,
    });
    return this;
  }

  /**
   * Apply demon voice effect
   * @returns {Promise<Voice>}
   */
  async demonVoice() {
    await this.player.filters.setTimescale(true, {
      speed: 0.8,
      pitch: 0.5,
      rate: 1.0,
    });
    await this.player.filters.setTremolo(true, {
      frequency: 3.0,
      depth: 0.4,
    });
    return this;
  }

  /**
   * Apply helium voice effect
   * @returns {Promise<Voice>}
   */
  async heliumVoice() {
    await this.setSpeedAndPitch(1.1, 1.8);
    return this;
  }

  /**
   * Apply giant voice effect
   * @returns {Promise<Voice>}
   */
  async giantVoice() {
    await this.setSpeedAndPitch(0.85, 0.6);
    return this;
  }

  /**
   * Apply whisper effect
   * @returns {Promise<Voice>}
   */
  async whisper() {
    await this.player.filters.setLowPass(true, { smoothing: 30.0 });
    this.player.filters.volume = 0.6;
    await this.player.filters._update();
    return this;
  }

  /**
   * Apply echo/reverb effect
   * @param {number} intensity - 1-10
   * @returns {Promise<Voice>}
   */
  async echo(intensity = 5) {
    const depth = Math.min(intensity, 10) * 0.08;
    await this.player.filters.setTremolo(true, {
      frequency: 2.0,
      depth,
    });
    return this;
  }

  /**
   * Get current voice settings
   * @returns {Object}
   */
  getSettings() {
    return {
      speed: this._speed,
      pitch: this._pitchShift,
      filters: this.player.filters.toJSON(),
    };
  }
}

module.exports = { Voice };
