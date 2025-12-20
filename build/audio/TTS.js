const { fetch } = require('undici');

/**
 * Text-to-Speech manager
 * Supports Google TTS and other providers
 */
class TTS {
  /**
   * @param {Object} pappify - Pappify instance
   * @param {Object} options - TTS options
   */
  constructor(pappify, options = {}) {
    this.pappify = pappify;
    this.defaultLang = options.lang || 'en';
    this.defaultSpeed = options.speed || 1.0;
    this.provider = options.provider || 'google';
    this.cache = new Map();
    this.maxCacheSize = options.maxCacheSize || 100;
  }

  /**
   * Check if TTS feature is enabled
   * @private
   */
  _checkEnabled() {
    if (!this.pappify.isEnabled('tts')) {
      throw new Error('TTS feature is disabled. Enable it in Pappify config: { tts: true }');
    }
  }

  /**
   * Supported languages
   */
  static LANGUAGES = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    ar: 'Arabic',
    hi: 'Hindi',
    nl: 'Dutch',
    pl: 'Polish',
    tr: 'Turkish',
    vi: 'Vietnamese',
    th: 'Thai',
    id: 'Indonesian',
    sv: 'Swedish',
    da: 'Danish',
    no: 'Norwegian',
    fi: 'Finnish',
    cs: 'Czech',
    el: 'Greek',
    he: 'Hebrew',
    ro: 'Romanian',
    hu: 'Hungarian',
    uk: 'Ukrainian',
  };

  /**
   * Speed presets
   */
  static SPEEDS = {
    verySlow: 0.5,
    slow: 0.75,
    normal: 1.0,
    fast: 1.25,
    veryFast: 1.5,
    ultraFast: 2.0,
  };

  /**
   * Generate TTS URL
   * @param {string} text - Text to speak
   * @param {Object} options - TTS options
   * @returns {string}
   */
  generateUrl(text, options = {}) {
    const lang = options.lang || this.defaultLang;
    const speed = options.speed || this.defaultSpeed;
    
    // Limit text length
    const maxLen = 200;
    const truncated = text.length > maxLen ? text.substring(0, maxLen) : text;
    const encoded = encodeURIComponent(truncated);

    switch (this.provider) {
      case 'google':
        return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encoded}&ttsspeed=${speed}`;
      
      case 'streamlabs':
        return `https://streamlabs.com/polly/speak?text=${encoded}&voice=${options.voice || 'Brian'}`;
      
      default:
        return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encoded}`;
    }
  }

  /**
   * Play TTS in a player
   * @param {Object} player - Player instance
   * @param {string} text - Text to speak
   * @param {Object} options - TTS options
   * @returns {Promise<Object>}
   */
  async play(player, text, options = {}) {
    this._checkEnabled();
    
    if (!text?.trim()) {
      throw new Error('Text is required');
    }

    const url = this.generateUrl(text, options);
    const cacheKey = `${url}_${options.lang}_${options.speed}`;

    // Check cache
    let track;
    if (this.cache.has(cacheKey)) {
      track = this.cache.get(cacheKey);
    } else {
      // Resolve through Lavalink
      const result = await this.pappify.resolve({
        query: url,
        requester: options.requester || 'TTS',
      });

      if (!result.tracks?.length) {
        throw new Error('Failed to generate TTS audio');
      }

      track = result.tracks[0];
      
      // Cache management
      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(cacheKey, track);
    }

    // Add TTS metadata
    track.info.isTTS = true;
    track.info.ttsText = text;
    track.info.ttsLang = options.lang || this.defaultLang;

    // Play options
    if (options.interrupt) {
      // Play immediately, interrupting current track
      if (player.current) {
        player.queue.unshift(player.current);
      }
      player.queue.unshift(track);
      await player.skip();
    } else if (options.priority) {
      // Add to front of queue
      player.queue.unshift(track);
      if (!player.playing) await player.play();
    } else {
      // Add to queue normally
      player.queue.add(track);
      if (!player.playing) await player.play();
    }

    return track;
  }

  /**
   * Speak text immediately (interrupts current playback)
   * @param {Object} player
   * @param {string} text
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async speak(player, text, options = {}) {
    return this.play(player, text, { ...options, interrupt: true });
  }

  /**
   * Queue TTS message
   * @param {Object} player
   * @param {string} text
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async queue(player, text, options = {}) {
    return this.play(player, text, { ...options, interrupt: false });
  }

  /**
   * Announce with priority (plays next)
   * @param {Object} player
   * @param {string} text
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async announce(player, text, options = {}) {
    return this.play(player, text, { ...options, priority: true });
  }

  /**
   * Clear TTS cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get available languages
   * @returns {Object}
   */
  getLanguages() {
    return TTS.LANGUAGES;
  }

  /**
   * Get speed presets
   * @returns {Object}
   */
  getSpeeds() {
    return TTS.SPEEDS;
  }
}

module.exports = { TTS };
