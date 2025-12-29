const { fetch } = require('undici');

// Helper to escape regex special characters
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Spotify integration for resolving Spotify URLs
 * Works without Lavalink Spotify plugin
 */
class Spotify {
  /**
   * @param {Object} pappify - Pappify instance
   * @param {Object} options - Spotify options
   */
  constructor(pappify, options = {}) {
    this.pappify = pappify;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.market = options.market || 'US';
    this.playlistLimit = options.playlistLimit || 100;
    this.albumLimit = options.albumLimit || 50;
    
    // Regex patterns
    this.patterns = {
      track: /spotify\.com\/track\/([a-zA-Z0-9]+)/,
      album: /spotify\.com\/album\/([a-zA-Z0-9]+)/,
      playlist: /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
      artist: /spotify\.com\/artist\/([a-zA-Z0-9]+)/,
    };
  }

  /**
   * Check if URL is a Spotify URL
   * @param {string} url
   * @returns {boolean}
   */
  isSpotifyUrl(url) {
    return url.includes('spotify.com') || url.startsWith('spotify:');
  }

  /**
   * Get Spotify URL type
   * @param {string} url
   * @returns {string|null}
   */
  getType(url) {
    for (const [type, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(url)) return type;
    }
    return null;
  }

  /**
   * Extract ID from Spotify URL
   * @param {string} url
   * @returns {string|null}
   */
  extractId(url) {
    for (const pattern of Object.values(this.patterns)) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Get access token
   * @returns {Promise<string>}
   */
  async getToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Failed to get Spotify token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    
    return this.accessToken;
  }

  /**
   * Make Spotify API request
   * @param {string} endpoint
   * @returns {Promise<Object>}
   */
  async request(endpoint) {
    const token = await this.getToken();
    
    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get track info
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getTrack(id) {
    const data = await this.request(`/tracks/${id}?market=${this.market}`);
    return this._formatTrack(data);
  }

  /**
   * Get album tracks
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getAlbum(id) {
    const album = await this.request(`/albums/${id}?market=${this.market}`);
    const tracks = album.tracks.items.slice(0, this.albumLimit).map(t => 
      this._formatTrack({ ...t, album })
    );

    return {
      name: album.name,
      tracks,
      thumbnail: album.images[0]?.url,
    };
  }

  /**
   * Get playlist tracks
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getPlaylist(id) {
    const playlist = await this.request(`/playlists/${id}?market=${this.market}`);
    const tracks = playlist.tracks.items
      .filter(i => i.track)
      .slice(0, this.playlistLimit)
      .map(i => this._formatTrack(i.track));

    return {
      name: playlist.name,
      tracks,
      thumbnail: playlist.images[0]?.url,
      owner: playlist.owner.display_name,
    };
  }

  /**
   * Get artist top tracks
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getArtist(id) {
    const [artist, topTracks] = await Promise.all([
      this.request(`/artists/${id}`),
      this.request(`/artists/${id}/top-tracks?market=${this.market}`),
    ]);

    const tracks = topTracks.tracks.map(t => this._formatTrack(t));

    return {
      name: artist.name,
      tracks,
      thumbnail: artist.images[0]?.url,
    };
  }

  /**
   * Format track data
   * @private
   */
  _formatTrack(data) {
    return {
      title: data.name,
      author: data.artists.map(a => a.name).join(', '),
      duration: data.duration_ms,
      identifier: data.id,
      uri: data.external_urls?.spotify || `https://open.spotify.com/track/${data.id}`,
      thumbnail: data.album?.images[0]?.url,
      isrc: data.external_ids?.isrc,
    };
  }

  /**
   * Track will be resolved when played using smart matching
   * @param {Object} spotifyTrack - Spotify track data
   * @param {*} requester
   * @returns {Object}
   * @private
   */
  _buildUnresolvedTrack(spotifyTrack, requester) {
    const pappify = this.pappify;
    const node = pappify.leastUsedNodes?.[0] || pappify.bestNode;
    
    // Create track object with empty encoded string (unresolved)
    const track = {
      track: "", // Empty = unresolved, will be resolved at play time
      encoded: "",
      info: {
        identifier: spotifyTrack.identifier,
        isSeekable: true,
        author: spotifyTrack.author || "Unknown",
        length: spotifyTrack.duration,
        isStream: false,
        sourceName: "spotify",
        title: spotifyTrack.title,
        uri: spotifyTrack.uri,
        thumbnail: spotifyTrack.thumbnail,
        artworkUrl: spotifyTrack.thumbnail,
        position: 0,
        requester,
        // Store original Spotify data for resolution
        spotifyData: spotifyTrack,
      },
      pluginInfo: {},
      
      /**
       * Resolve this unresolved track to a playable YouTube track
       * @param {Object} pappify - Pappify instance
       * @returns {Promise<Object>}
       */
      resolve: async function(pappifyInstance) {
        const pappifyRef = pappifyInstance || pappify;
        const spotifyInfo = this.info.spotifyData || this.info;
        
        // Build search query: "author - title" format (better than "title author")
        const query = [spotifyInfo.author, spotifyInfo.title]
          .filter(x => !!x)
          .join(" - ");
        
        // Use ytsearch (regular YouTube) instead of ytmsearch (YouTube Music)
        // ytsearch gives more accurate results for finding exact songs
        const result = await pappifyRef.resolve({ 
          query: `ytsearch:${query}`,
          requester: this.info.requester 
        });

        if (!result || !result.tracks || !result.tracks.length) {
          return this;
        }

        // Strategy 1: Find official audio (author match or "Author - Topic" channel)
        const officialAudio = result.tracks.find((candidate) => {
          const authorVariants = [
            spotifyInfo.author,
            `${spotifyInfo.author} - Topic`,
            // Handle multiple artists - check first artist
            spotifyInfo.author.split(',')[0].trim(),
            `${spotifyInfo.author.split(',')[0].trim()} - Topic`
          ];
          
          // Check if author matches
          const authorMatch = authorVariants.some((name) => 
            new RegExp(`^${escapeRegExp(name)}$`, "i").test(candidate.info.author)
          );
          
          // Check if title matches exactly
          const titleMatch = new RegExp(`^${escapeRegExp(spotifyInfo.title)}$`, "i")
            .test(candidate.info.title);
          
          return authorMatch || titleMatch;
        });

        if (officialAudio) {
          this.info.identifier = officialAudio.info.identifier;
          this.track = officialAudio.track || officialAudio.encoded;
          this.encoded = this.track;
          return this;
        }

        // Strategy 2: Find track with matching duration (±2 seconds tolerance)
        if (spotifyInfo.duration) {
          const sameDuration = result.tracks.find((candidate) => {
            const candidateLength = candidate.info.length || candidate.info.duration || 0;
            const targetLength = spotifyInfo.duration || 0;
            return candidateLength >= targetLength - 2000 && 
                   candidateLength <= targetLength + 2000;
          });

          if (sameDuration) {
            this.info.identifier = sameDuration.info.identifier;
            this.track = sameDuration.track || sameDuration.encoded;
            this.encoded = this.track;
            return this;
          }

          // Strategy 3: Find track with matching duration AND title contains spotify title
          const sameDurationAndTitle = result.tracks.find((candidate) => {
            const candidateLength = candidate.info.length || candidate.info.duration || 0;
            const targetLength = spotifyInfo.duration || 0;
            const durationMatch = candidateLength >= targetLength - 2000 && 
                                  candidateLength <= targetLength + 2000;
            const titleMatch = candidate.info.title.toLowerCase()
              .includes(spotifyInfo.title.toLowerCase());
            return durationMatch && titleMatch;
          });

          if (sameDurationAndTitle) {
            this.info.identifier = sameDurationAndTitle.info.identifier;
            this.track = sameDurationAndTitle.track || sameDurationAndTitle.encoded;
            this.encoded = this.track;
            return this;
          }
        }

        // Strategy 4: Filter out covers/remixes/karaoke and pick best
        const validCandidates = result.tracks.filter((candidate) => {
          const ytTitle = candidate.info.title.toLowerCase();
          const spTitle = spotifyInfo.title.toLowerCase();
          
          // Skip if YouTube has unwanted keywords that Spotify doesn't have
          const unwantedKeywords = ['cover', 'remix', 'karaoke', 'instrumental', 'live version', 'acoustic version', 'slowed', 'reverb', 'sped up', '8d audio'];
          for (const keyword of unwantedKeywords) {
            if (ytTitle.includes(keyword) && !spTitle.includes(keyword)) {
              return false;
            }
          }
          return true;
        });

        // Use first valid candidate, or fallback to first result
        const bestCandidate = validCandidates[0] || result.tracks[0];
        
        this.info.identifier = bestCandidate.info.identifier;
        this.track = bestCandidate.track || bestCandidate.encoded;
        this.encoded = this.track;
        
        return this;
      }
    };

    return track;
  }

  /**
   * Resolve Spotify URL to playable tracks
   * Creates unresolved tracks that will be resolved at play time
   * @param {string} url
   * @param {*} requester
   * @returns {Promise<Object>}
   */
  async resolve(url, requester) {
    const type = this.getType(url);
    const id = this.extractId(url);

    if (!type || !id) {
      throw new Error('Invalid Spotify URL');
    }

    let result;
    switch (type) {
      case 'track':
        result = { tracks: [await this.getTrack(id)] };
        break;
      case 'album':
        result = await this.getAlbum(id);
        break;
      case 'playlist':
        result = await this.getPlaylist(id);
        break;
      case 'artist':
        result = await this.getArtist(id);
        break;
    }

    // Build unresolved tracks (will be resolved at play time)
    const unresolvedTracks = result.tracks.map(track => 
      this._buildUnresolvedTrack(track, requester)
    );

    return {
      loadType: type === 'track' ? 'track' : 'playlist',
      playlistInfo: result.name ? { name: result.name } : null,
      tracks: unresolvedTracks,
    };
  }
}

module.exports = { Spotify };
