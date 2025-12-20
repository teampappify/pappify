/**
 * Advanced audio effects beyond basic filters
 */
class Effects {
  /**
   * @param {Object} player - Player instance
   */
  constructor(player) {
    this.player = player;
    this._activeEffects = new Set();
  }

  /**
   * Get active effects
   * @returns {string[]}
   */
  get active() {
    return [...this._activeEffects];
  }

  /**
   * Apply echo effect
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Effects}
   */
  echo(enabled, options = {}) {
    if (enabled) {
      this._activeEffects.add('echo');
      this.player.filters.setTimescale(true, {
        speed: options.speed ?? 1.0,
        pitch: options.pitch ?? 1.0,
        rate: options.rate ?? 1.0,
      });
      this.player.filters.setTremolo(true, {
        frequency: options.frequency ?? 4.0,
        depth: options.depth ?? 0.3,
      });
    } else {
      this._activeEffects.delete('echo');
      this.player.filters.setTimescale(false);
      this.player.filters.setTremolo(false);
    }
    return this;
  }

  /**
   * Apply underwater effect
   * @param {boolean} enabled
   * @returns {Effects}
   */
  underwater(enabled) {
    if (enabled) {
      this._activeEffects.add('underwater');
      this.player.filters.setLowPass(true, { smoothing: 50.0 });
      this.player.filters.setTimescale(true, { speed: 0.95, pitch: 0.9, rate: 1.0 });
    } else {
      this._activeEffects.delete('underwater');
      this.player.filters.setLowPass(false);
      this.player.filters.setTimescale(false);
    }
    return this;
  }

  /**
   * Apply telephone effect
   * @param {boolean} enabled
   * @returns {Effects}
   */
  telephone(enabled) {
    if (enabled) {
      this._activeEffects.add('telephone');
      this.player.filters.setEqualizer([
        { band: 0, gain: -0.75 },
        { band: 1, gain: -0.75 },
        { band: 2, gain: -0.5 },
        { band: 3, gain: 0.5 },
        { band: 4, gain: 0.75 },
        { band: 5, gain: 0.5 },
        { band: 6, gain: 0.25 },
        { band: 7, gain: -0.25 },
        { band: 8, gain: -0.5 },
        { band: 9, gain: -0.75 },
        { band: 10, gain: -0.75 },
        { band: 11, gain: -0.75 },
        { band: 12, gain: -0.75 },
        { band: 13, gain: -0.75 },
        { band: 14, gain: -0.75 },
      ]);
    } else {
      this._activeEffects.delete('telephone');
      this.player.filters.setEqualizer([]);
    }
    return this;
  }

  /**
   * Apply radio effect
   * @param {boolean} enabled
   * @returns {Effects}
   */
  radio(enabled) {
    if (enabled) {
      this._activeEffects.add('radio');
      this.player.filters.setEqualizer([
        { band: 0, gain: -0.5 },
        { band: 1, gain: -0.25 },
        { band: 2, gain: 0.25 },
        { band: 3, gain: 0.5 },
        { band: 4, gain: 0.5 },
        { band: 5, gain: 0.5 },
        { band: 6, gain: 0.25 },
        { band: 7, gain: 0.0 },
        { band: 8, gain: -0.25 },
        { band: 9, gain: -0.5 },
      ]);
      this.player.filters.setDistortion(true, {
        sinOffset: 0.0,
        sinScale: 0.2,
        cosOffset: 0.0,
        cosScale: 0.2,
        tanOffset: 0.0,
        tanScale: 0.2,
        offset: 0.0,
        scale: 1.0,
      });
    } else {
      this._activeEffects.delete('radio');
      this.player.filters.setEqualizer([]);
      this.player.filters.setDistortion(false);
    }
    return this;
  }

  /**
   * Apply party mode (dynamic bass)
   * @param {boolean} enabled
   * @returns {Effects}
   */
  party(enabled) {
    if (enabled) {
      this._activeEffects.add('party');
      this.player.filters.setEqualizer([
        { band: 0, gain: 0.6 },
        { band: 1, gain: 0.67 },
        { band: 2, gain: 0.67 },
        { band: 3, gain: 0.4 },
        { band: 4, gain: -0.2 },
        { band: 5, gain: 0.15 },
        { band: 6, gain: -0.25 },
        { band: 7, gain: 0.23 },
        { band: 8, gain: 0.35 },
        { band: 9, gain: 0.45 },
        { band: 10, gain: 0.55 },
        { band: 11, gain: 0.6 },
        { band: 12, gain: 0.55 },
      ]);
      this.player.filters.setTremolo(true, { frequency: 4.0, depth: 0.25 });
    } else {
      this._activeEffects.delete('party');
      this.player.filters.setEqualizer([]);
      this.player.filters.setTremolo(false);
    }
    return this;
  }

  /**
   * Apply earrape effect (use with caution!)
   * @param {boolean} enabled
   * @param {number} intensity - 1-10
   * @returns {Effects}
   */
  earrape(enabled, intensity = 5) {
    if (enabled) {
      this._activeEffects.add('earrape');
      const gain = Math.min(intensity, 10) * 0.1;
      this.player.filters.setEqualizer(
        Array(15).fill(0).map((_, i) => ({ band: i, gain }))
      );
      this.player.filters.volume = Math.min(5.0, 1.0 + intensity * 0.4);
      this.player.filters._update();
    } else {
      this._activeEffects.delete('earrape');
      this.player.filters.setEqualizer([]);
      this.player.filters.volume = 1.0;
      this.player.filters._update();
    }
    return this;
  }

  /**
   * Apply cinema/movie effect
   * @param {boolean} enabled
   * @returns {Effects}
   */
  cinema(enabled) {
    if (enabled) {
      this._activeEffects.add('cinema');
      this.player.filters.setEqualizer([
        { band: 0, gain: 0.3 },
        { band: 1, gain: 0.25 },
        { band: 2, gain: 0.2 },
        { band: 3, gain: 0.1 },
        { band: 4, gain: 0.0 },
        { band: 5, gain: -0.1 },
        { band: 6, gain: -0.15 },
        { band: 7, gain: -0.1 },
        { band: 8, gain: 0.0 },
        { band: 9, gain: 0.1 },
        { band: 10, gain: 0.2 },
        { band: 11, gain: 0.25 },
        { band: 12, gain: 0.3 },
        { band: 13, gain: 0.35 },
        { band: 14, gain: 0.4 },
      ]);
      this.player.filters.setChannelMix(true, {
        leftToLeft: 0.8,
        leftToRight: 0.2,
        rightToLeft: 0.2,
        rightToRight: 0.8,
      });
    } else {
      this._activeEffects.delete('cinema');
      this.player.filters.setEqualizer([]);
      this.player.filters.setChannelMix(false);
    }
    return this;
  }

  /**
   * Apply lofi effect
   * @param {boolean} enabled
   * @returns {Effects}
   */
  lofi(enabled) {
    if (enabled) {
      this._activeEffects.add('lofi');
      this.player.filters.setLowPass(true, { smoothing: 14.0 });
      this.player.filters.setTimescale(true, { speed: 0.95, pitch: 0.95, rate: 1.0 });
      this.player.filters.setEqualizer([
        { band: 0, gain: 0.2 },
        { band: 1, gain: 0.15 },
        { band: 2, gain: 0.1 },
        { band: 3, gain: 0.05 },
        { band: 4, gain: 0.0 },
        { band: 5, gain: -0.05 },
        { band: 6, gain: -0.1 },
        { band: 7, gain: -0.1 },
        { band: 8, gain: -0.1 },
        { band: 9, gain: -0.1 },
        { band: 10, gain: -0.15 },
        { band: 11, gain: -0.15 },
        { band: 12, gain: -0.2 },
        { band: 13, gain: -0.2 },
        { band: 14, gain: -0.25 },
      ]);
    } else {
      this._activeEffects.delete('lofi');
      this.player.filters.setLowPass(false);
      this.player.filters.setTimescale(false);
      this.player.filters.setEqualizer([]);
    }
    return this;
  }

  /**
   * Apply vocal boost
   * @param {boolean} enabled
   * @returns {Effects}
   */
  vocalBoost(enabled) {
    if (enabled) {
      this._activeEffects.add('vocalBoost');
      this.player.filters.setEqualizer([
        { band: 0, gain: -0.2 },
        { band: 1, gain: -0.15 },
        { band: 2, gain: 0.0 },
        { band: 3, gain: 0.1 },
        { band: 4, gain: 0.2 },
        { band: 5, gain: 0.3 },
        { band: 6, gain: 0.3 },
        { band: 7, gain: 0.25 },
        { band: 8, gain: 0.2 },
        { band: 9, gain: 0.1 },
        { band: 10, gain: 0.0 },
        { band: 11, gain: -0.1 },
        { band: 12, gain: -0.15 },
        { band: 13, gain: -0.2 },
        { band: 14, gain: -0.25 },
      ]);
    } else {
      this._activeEffects.delete('vocalBoost');
      this.player.filters.setEqualizer([]);
    }
    return this;
  }

  /**
   * Clear all effects
   * @returns {Promise<Effects>}
   */
  async clear() {
    this._activeEffects.clear();
    await this.player.filters.clearFilters();
    return this;
  }
}

module.exports = { Effects };
