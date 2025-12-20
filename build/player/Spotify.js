const { fetch } = require('undici');

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
   * Resolve Spotify URL to playable tracks
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

    // Convert to Pappify tracks by searching
    const resolvedTracks = [];
    for (const track of result.tracks) {
      const query = `${track.title} ${track.author}`;
      const searchResult = await this.pappify.resolve({
        query,
        source: 'ytmsearch',
        requester,
      });

      if (searchResult.tracks.length) {
        const resolved = searchResult.tracks[0];
        resolved.info.spotifyData = track;
        resolvedTracks.push(resolved);
      }
    }

    return {
      loadType: type === 'track' ? 'track' : 'playlist',
      playlistInfo: result.name ? { name: result.name } : null,
      tracks: resolvedTracks,
    };
  }
}

module.exports = { Spotify };
