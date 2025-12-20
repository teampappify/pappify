const { Plugin } = require('../core/Plugin');
const { Spotify } = require('../player/Spotify');

/**
 * Spotify plugin for automatic URL resolution
 */
class SpotifyPlugin extends Plugin {
  /**
   * @param {Object} options - Spotify credentials
   * @param {string} options.clientId - Spotify client ID
   * @param {string} options.clientSecret - Spotify client secret
   * @param {string} [options.market='US'] - Market for track availability
   * @param {number} [options.playlistLimit=100] - Max tracks from playlist
   * @param {number} [options.albumLimit=50] - Max tracks from album
   */
  constructor(options) {
    super('SpotifyPlugin');
    this.options = options;
    this.spotify = null;
  }

  /**
   * Load the plugin
   * @param {Object} pappify
   */
  load(pappify) {
    this.spotify = new Spotify(pappify, this.options);
    
    // Store original resolve
    const originalResolve = pappify.resolve.bind(pappify);

    // Override resolve to handle Spotify URLs
    pappify.resolve = async (options) => {
      const { query, requester } = options;

      if (this.spotify.isSpotifyUrl(query)) {
        pappify.emit('debug', `[SpotifyPlugin] Resolving: ${query}`);
        
        try {
          return await this.spotify.resolve(query, requester);
        } catch (error) {
          pappify.emit('debug', `[SpotifyPlugin] Error: ${error.message}`);
          // Fallback to original resolve
          return originalResolve(options);
        }
      }

      return originalResolve(options);
    };

    // Expose spotify instance
    pappify.spotify = this.spotify;

    pappify.emit('debug', '[SpotifyPlugin] Loaded');
  }

  /**
   * Unload the plugin
   * @param {Object} pappify
   */
  unload(pappify) {
    delete pappify.spotify;
    pappify.emit('debug', '[SpotifyPlugin] Unloaded');
  }
}

module.exports = { SpotifyPlugin };
