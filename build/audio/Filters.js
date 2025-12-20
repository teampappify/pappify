/**
 * Advanced audio filters manager
 */
class Filters {
  /**
   * @param {Object} player - Player instance
   * @param {Object} options - Initial filter options
   */
  constructor(player, options = {}) {
    this.player = player;
    
    // Core Lavalink filters
    this.volume = options.volume ?? 1.0;
    this.equalizer = options.equalizer || [];
    this.karaoke = options.karaoke || null;
    this.timescale = options.timescale || null;
    this.tremolo = options.tremolo || null;
    this.vibrato = options.vibrato || null;
    this.rotation = options.rotation || null;
    this.distortion = options.distortion || null;
    this.channelMix = options.channelMix || null;
    this.lowPass = options.lowPass || null;
    
    // Preset states
    this.bassboost = null;
    this.nightcore = false;
    this.vaporwave = false;
    this.slowmode = false;
    this._8d = false;
    this.pop = false;
    this.soft = false;
    this.trebleBass = false;
    this.china = false;
    this.chipmunk = false;
    this.darthvader = false;
    this.daycore = false;
    this.doubletime = false;
  }

  /**
   * Set equalizer bands
   * @param {Array<{band: number, gain: number}>} bands
   * @returns {Filters}
   */
  setEqualizer(bands) {
    this.equalizer = bands;
    this._update();
    return this;
  }

  /**
   * Set karaoke filter
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setKaraoke(enabled, options = {}) {
    this.karaoke = enabled ? {
      level: options.level ?? 1.0,
      monoLevel: options.monoLevel ?? 1.0,
      filterBand: options.filterBand ?? 220.0,
      filterWidth: options.filterWidth ?? 100.0,
    } : null;
    this._update();
    return this;
  }

  /**
   * Set timescale filter
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setTimescale(enabled, options = {}) {
    this.timescale = enabled ? {
      speed: options.speed ?? 1.0,
      pitch: options.pitch ?? 1.0,
      rate: options.rate ?? 1.0,
    } : null;
    this._update();
    return this;
  }

  /**
   * Set tremolo filter
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setTremolo(enabled, options = {}) {
    this.tremolo = enabled ? {
      frequency: options.frequency ?? 2.0,
      depth: options.depth ?? 0.5,
    } : null;
    this._update();
    return this;
  }

  /**
   * Set vibrato filter
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setVibrato(enabled, options = {}) {
    this.vibrato = enabled ? {
      frequency: options.frequency ?? 2.0,
      depth: options.depth ?? 0.5,
    } : null;
    this._update();
    return this;
  }

  /**
   * Set rotation filter (8D audio)
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setRotation(enabled, options = {}) {
    this.rotation = enabled ? {
      rotationHz: options.rotationHz ?? 0.2,
    } : null;
    this._update();
    return this;
  }

  /**
   * Set distortion filter
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setDistortion(enabled, options = {}) {
    this.distortion = enabled ? {
      sinOffset: options.sinOffset ?? 0.0,
      sinScale: options.sinScale ?? 1.0,
      cosOffset: options.cosOffset ?? 0.0,
      cosScale: options.cosScale ?? 1.0,
      tanOffset: options.tanOffset ?? 0.0,
      tanScale: options.tanScale ?? 1.0,
      offset: options.offset ?? 0.0,
      scale: options.scale ?? 1.0,
    } : null;
    this._update();
    return this;
  }

  /**
   * Set channel mix filter
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setChannelMix(enabled, options = {}) {
    this.channelMix = enabled ? {
      leftToLeft: options.leftToLeft ?? 1.0,
      leftToRight: options.leftToRight ?? 0.0,
      rightToLeft: options.rightToLeft ?? 0.0,
      rightToRight: options.rightToRight ?? 1.0,
    } : null;
    this._update();
    return this;
  }

  /**
   * Set low pass filter
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setLowPass(enabled, options = {}) {
    this.lowPass = enabled ? {
      smoothing: options.smoothing ?? 20.0,
    } : null;
    this._update();
    return this;
  }

  /**
   * Set bass boost
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setBassboost(enabled, options = {}) {
    if (enabled) {
      const value = Math.min(Math.max(options.value ?? 5, 0), 10);
      this.bassboost = value;
      const gain = (value - 1) * (1.25 / 9) - 0.25;
      this.equalizer = Array(13).fill(0).map((_, i) => ({ band: i, gain }));
    } else {
      this.bassboost = null;
      this.equalizer = [];
    }
    this._update();
    return this;
  }

  /**
   * Set nightcore effect
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setNightcore(enabled, options = {}) {
    this.nightcore = enabled;
    if (enabled) {
      this.vaporwave = false;
      this.daycore = false;
      this.timescale = {
        speed: options.speed ?? 1.3,
        pitch: options.pitch ?? 1.3,
        rate: options.rate ?? 1.0,
      };
    } else {
      this.timescale = null;
    }
    this._update();
    return this;
  }

  /**
   * Set vaporwave effect
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setVaporwave(enabled, options = {}) {
    this.vaporwave = enabled;
    if (enabled) {
      this.nightcore = false;
      this.daycore = false;
      this.timescale = {
        speed: options.speed ?? 0.85,
        pitch: options.pitch ?? 0.8,
        rate: options.rate ?? 1.0,
      };
    } else {
      this.timescale = null;
    }
    this._update();
    return this;
  }

  /**
   * Set slowmode effect
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setSlowmode(enabled, options = {}) {
    this.slowmode = enabled;
    this.timescale = enabled ? {
      speed: options.speed ?? 0.8,
      pitch: options.pitch ?? 1.0,
      rate: options.rate ?? 0.8,
    } : null;
    this._update();
    return this;
  }

  /**
   * Set 8D audio effect
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  set8D(enabled, options = {}) {
    this._8d = enabled;
    this.rotation = enabled ? {
      rotationHz: options.rotationHz ?? 0.2,
    } : null;
    this._update();
    return this;
  }

  /**
   * Set daycore effect (opposite of nightcore)
   * @param {boolean} enabled
   * @param {Object} options
   * @returns {Filters}
   */
  setDaycore(enabled, options = {}) {
    this.daycore = enabled;
    if (enabled) {
      this.nightcore = false;
      this.vaporwave = false;
      this.timescale = {
        speed: options.speed ?? 0.7,
        pitch: options.pitch ?? 0.7,
        rate: options.rate ?? 1.0,
      };
    } else {
      this.timescale = null;
    }
    this._update();
    return this;
  }

  /**
   * Set chipmunk effect
   * @param {boolean} enabled
   * @returns {Filters}
   */
  setChipmunk(enabled) {
    this.chipmunk = enabled;
    this.timescale = enabled ? { speed: 1.0, pitch: 1.5, rate: 1.0 } : null;
    this._update();
    return this;
  }

  /**
   * Set darth vader effect
   * @param {boolean} enabled
   * @returns {Filters}
   */
  setDarthvader(enabled) {
    this.darthvader = enabled;
    this.timescale = enabled ? { speed: 1.0, pitch: 0.5, rate: 1.0 } : null;
    this._update();
    return this;
  }

  /**
   * Set doubletime effect
   * @param {boolean} enabled
   * @returns {Filters}
   */
  setDoubletime(enabled) {
    this.doubletime = enabled;
    this.timescale = enabled ? { speed: 2.0, pitch: 1.0, rate: 1.0 } : null;
    this._update();
    return this;
  }

  /**
   * Set pop preset
   * @param {boolean} enabled
   * @returns {Filters}
   */
  setPop(enabled) {
    this.pop = enabled;
    this.equalizer = enabled ? [
      { band: 0, gain: -0.25 },
      { band: 1, gain: 0.48 },
      { band: 2, gain: 0.59 },
      { band: 3, gain: 0.45 },
      { band: 4, gain: 0.38 },
      { band: 5, gain: 0.0 },
      { band: 6, gain: -0.32 },
      { band: 7, gain: -0.35 },
      { band: 8, gain: -0.35 },
      { band: 9, gain: -0.38 },
      { band: 10, gain: -0.35 },
      { band: 11, gain: -0.38 },
      { band: 12, gain: -0.4 },
      { band: 13, gain: -0.55 },
      { band: 14, gain: -0.7 },
    ] : [];
    this._update();
    return this;
  }

  /**
   * Set soft preset
   * @param {boolean} enabled
   * @returns {Filters}
   */
  setSoft(enabled) {
    this.soft = enabled;
    this.lowPass = enabled ? { smoothing: 20.0 } : null;
    this._update();
    return this;
  }

  /**
   * Set treble bass preset
   * @param {boolean} enabled
   * @returns {Filters}
   */
  setTrebleBass(enabled) {
    this.trebleBass = enabled;
    this.equalizer = enabled ? [
      { band: 0, gain: 0.6 },
      { band: 1, gain: 0.67 },
      { band: 2, gain: 0.67 },
      { band: 3, gain: 0.0 },
      { band: 4, gain: -0.5 },
      { band: 5, gain: 0.15 },
      { band: 6, gain: -0.45 },
      { band: 7, gain: 0.23 },
      { band: 8, gain: 0.35 },
      { band: 9, gain: 0.45 },
      { band: 10, gain: 0.55 },
      { band: 11, gain: 0.6 },
      { band: 12, gain: 0.55 },
      { band: 13, gain: 0.0 },
    ] : [];
    this._update();
    return this;
  }

  /**
   * Clear all filters
   * @returns {Promise<Filters>}
   */
  async clearFilters() {
    this.volume = 1.0;
    this.equalizer = [];
    this.karaoke = null;
    this.timescale = null;
    this.tremolo = null;
    this.vibrato = null;
    this.rotation = null;
    this.distortion = null;
    this.channelMix = null;
    this.lowPass = null;
    this.bassboost = null;
    this.nightcore = false;
    this.vaporwave = false;
    this.slowmode = false;
    this._8d = false;
    this.pop = false;
    this.soft = false;
    this.trebleBass = false;
    this.chipmunk = false;
    this.darthvader = false;
    this.daycore = false;
    this.doubletime = false;
    
    await this._update();
    return this;
  }

  /**
   * Get current filter state for REST API
   * @returns {Object}
   */
  toJSON() {
    return {
      volume: this.volume,
      equalizer: this.equalizer,
      karaoke: this.karaoke,
      timescale: this.timescale,
      tremolo: this.tremolo,
      vibrato: this.vibrato,
      rotation: this.rotation,
      distortion: this.distortion,
      channelMix: this.channelMix,
      lowPass: this.lowPass,
    };
  }

  /**
   * Update filters on Lavalink
   * @private
   */
  async _update() {
    if (!this.player?.node?.rest) return;
    
    await this.player.node.rest.updatePlayer({
      guildId: this.player.guildId,
      data: { filters: this.toJSON() },
    });
  }
}

module.exports = { Filters };
