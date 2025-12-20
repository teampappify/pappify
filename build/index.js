/**
 * Pappify - Next-gen Lavalink client
 * Ultra-low latency, smart node balancing, advanced audio features
 * 
 * @author Pappu100
 * @version 1.0.0
 * @license MIT
 */

'use strict';

// Core
const { Pappify } = require('./core/Pappify');
const { Plugin } = require('./core/Plugin');

// Network
const { Node } = require('./network/Node');
const { Rest } = require('./network/Rest');
const { Lyrics } = require('./network/Lyrics');
const { Mixer } = require('./network/Mixer');
const { VoiceRecorder } = require('./network/VoiceRecorder');

// Player
const { Player } = require('./player/Player');
const { Track } = require('./player/Track');
const { Queue } = require('./player/Queue');
const { Connection } = require('./player/Connection');
const { PlayerState } = require('./player/PlayerState');
const { Spotify } = require('./player/Spotify');

// Audio
const { Filters } = require('./audio/Filters');
const { Effects } = require('./audio/Effects');
const { Voice } = require('./audio/Voice');
const { TTS } = require('./audio/TTS');

// Built-in plugins
const { SpotifyPlugin } = require('./plugins/SpotifyPlugin');
const { SaveStatePlugin } = require('./plugins/SaveStatePlugin');
const { AutoDisconnectPlugin } = require('./plugins/AutoDisconnectPlugin');

// Version
const { version } = require('../package.json');

module.exports = {
  // Core
  Pappify,
  Plugin,
  
  // Network
  Node,
  Rest,
  Lyrics,
  Mixer,
  VoiceRecorder,
  
  // Player
  Player,
  Track,
  Queue,
  Connection,
  PlayerState,
  Spotify,
  
  // Audio
  Filters,
  Effects,
  Voice,
  TTS,
  
  // Plugins
  SpotifyPlugin,
  SaveStatePlugin,
  AutoDisconnectPlugin,
  
  // Meta
  version,
  default: Pappify,
};
