import { EventEmitter } from 'events';

export type LoopMode = 'none' | 'track' | 'queue';
export type LoadType = 'track' | 'playlist' | 'search' | 'empty' | 'error' | 'NO_MATCHES' | 'LOAD_FAILED';
export type RestVersion = 'v3' | 'v4';

export interface NodeOptions {
  name?: string;
  host: string;
  port?: number;
  password?: string;
  secure?: boolean;
  regions?: string[];
  sessionId?: string;
}

export interface PappifyOptions {
  send: (data: object) => void;
  defaultSearchPlatform?: string;
  restVersion?: RestVersion;
  resumeKey?: string;
  resumeTimeout?: number;
  autoResume?: boolean;
  reconnectTimeout?: number;
  reconnectTries?: number;
  autoMigratePlayers?: boolean;
  migrateOnDisconnect?: boolean;
  migrateOnFailure?: boolean;
  migrationStrategyFn?: (player: Player, nodes: Node[]) => Node | undefined;
  multipleTrackHistory?: number;
  plugins?: Plugin[];
}

export interface ConnectionOptions {
  guildId: string;
  voiceChannel: string;
  textChannel?: string;
  region?: string;
  defaultVolume?: number;
  loop?: LoopMode;
  deaf?: boolean;
  mute?: boolean;
}

export interface ResolveOptions {
  query: string;
  source?: string;
  requester?: unknown;
  node?: string | Node;
}

export interface ResolveResult {
  loadType: LoadType;
  exception: object | null;
  playlistInfo: PlaylistInfo | null;
  pluginInfo: object;
  tracks: Track[];
}

export interface PlaylistInfo {
  name: string;
  selectedTrack?: number;
}

export interface TrackInfo {
  identifier: string;
  seekable: boolean;
  author: string;
  length: number;
  stream: boolean;
  position: number;
  title: string;
  uri: string;
  artworkUrl: string | null;
  sourceName: string;
  isrc: string | null;
  requester: unknown;
}

export interface NodeStats {
  players: number;
  playingPlayers: number;
  uptime: number;
  memory: {
    free: number;
    used: number;
    allocated: number;
    reservable: number;
  };
  cpu: {
    cores: number;
    systemLoad: number;
    lavalinkLoad: number;
  };
  frameStats: {
    sent: number;
    nulled: number;
    deficit: number;
  };
}

export interface FilterOptions {
  volume?: number;
  equalizer?: EqualizerBand[];
  karaoke?: KaraokeOptions;
  timescale?: TimescaleOptions;
  tremolo?: TremoloOptions;
  vibrato?: VibratoOptions;
  rotation?: RotationOptions;
  distortion?: DistortionOptions;
  channelMix?: ChannelMixOptions;
  lowPass?: LowPassOptions;
}

export interface EqualizerBand {
  band: number;
  gain: number;
}

export interface KaraokeOptions {
  level?: number;
  monoLevel?: number;
  filterBand?: number;
  filterWidth?: number;
}

export interface TimescaleOptions {
  speed?: number;
  pitch?: number;
  rate?: number;
}

export interface TremoloOptions {
  frequency?: number;
  depth?: number;
}

export interface VibratoOptions {
  frequency?: number;
  depth?: number;
}

export interface RotationOptions {
  rotationHz?: number;
}

export interface DistortionOptions {
  sinOffset?: number;
  sinScale?: number;
  cosOffset?: number;
  cosScale?: number;
  tanOffset?: number;
  tanScale?: number;
  offset?: number;
  scale?: number;
}

export interface ChannelMixOptions {
  leftToLeft?: number;
  leftToRight?: number;
  rightToLeft?: number;
  rightToRight?: number;
}

export interface LowPassOptions {
  smoothing?: number;
}

export class Pappify extends EventEmitter {
  constructor(client: unknown, nodes: NodeOptions[], options: PappifyOptions);
  
  client: unknown;
  nodes: NodeOptions[];
  options: PappifyOptions;
  nodeMap: Map<string, Node>;
  players: Map<string, Player>;
  clientId: string | null;
  initiated: boolean;
  version: string;
  
  get leastUsedNodes(): Node[];
  get bestNode(): Node | undefined;
  
  init(clientId: string): this;
  createNode(options: NodeOptions): Node;
  destroyNode(identifier: string): void;
  updateVoiceState(packet: object): void;
  fetchRegion(region: string): Node[];
  createConnection(options: ConnectionOptions): Player;
  createPlayer(node: Node, options: ConnectionOptions): Player;
  destroyPlayer(guildId: string): void;
  removeConnection(guildId: string): void;
  get(guildId: string): Player;
  migrate(target: Player | Node, destinationNode?: Node): Promise<Player | Player[]>;
  resolve(options: ResolveOptions): Promise<ResolveResult>;
  decodeTrack(track: string, node?: Node): Promise<object>;
  decodeTracks(tracks: string[], node?: Node): Promise<object[]>;
  
  on(event: 'nodeCreate', listener: (node: Node) => void): this;
  on(event: 'nodeConnect', listener: (node: Node) => void): this;
  on(event: 'nodeDisconnect', listener: (node: Node, reason: object) => void): this;
  on(event: 'nodeDestroy', listener: (node: Node) => void): this;
  on(event: 'nodeError', listener: (node: Node, error: Error) => void): this;
  on(event: 'nodeReconnect', listener: (node: Node) => void): this;
  on(event: 'playerCreate', listener: (player: Player) => void): this;
  on(event: 'playerDestroy', listener: (player: Player) => void): this;
  on(event: 'playerDisconnect', listener: (player: Player) => void): this;
  on(event: 'playerUpdate', listener: (player: Player, packet: object) => void): this;
  on(event: 'playerMove', listener: (oldChannel: string, newChannel: string) => void): this;
  on(event: 'playerMoved', listener: (player: Player, oldNode: Node, newNode: Node) => void): this;
  on(event: 'playerMigrated', listener: (player: Player, oldNode: Node, newNode: Node) => void): this;
  on(event: 'playerMigrationFailed', listener: (player: Player, error: Error) => void): this;
  on(event: 'nodeMigrated', listener: (node: Node, players: Player[]) => void): this;
  on(event: 'nodeMigrationFailed', listener: (node: Node, error: Error) => void): this;
  on(event: 'trackStart', listener: (player: Player, track: Track, payload: object) => void): this;
  on(event: 'trackEnd', listener: (player: Player, track: Track, payload: object) => void): this;
  on(event: 'trackError', listener: (player: Player, track: Track, payload: object) => void): this;
  on(event: 'trackStuck', listener: (player: Player, track: Track, payload: object) => void): this;
  on(event: 'queueEnd', listener: (player: Player) => void): this;
  on(event: 'socketClosed', listener: (player: Player, payload: object) => void): this;
  on(event: 'debug', listener: (message: string) => void): this;
  on(event: 'raw', listener: (type: string, payload: object) => void): this;
  on(event: 'apiResponse', listener: (endpoint: string, response: object) => void): this;
}

export class Node {
  constructor(pappify: Pappify, node: NodeOptions, options: PappifyOptions);
  
  pappify: Pappify;
  name: string;
  host: string;
  port: number;
  password: string;
  secure: boolean;
  regions: string[];
  restVersion: RestVersion;
  sessionId: string | null;
  connected: boolean;
  info: object | null;
  stats: NodeStats;
  rest: Rest;
  
  get penalties(): number;
  get isNodeLink(): boolean;
  
  connect(): Promise<void>;
  disconnect(): void;
  destroy(clean?: boolean): void;
  fetchInfo(options?: object): Promise<object>;
}

export class Player extends EventEmitter {
  constructor(pappify: Pappify, node: Node, options: ConnectionOptions);
  
  pappify: Pappify;
  node: Node;
  guildId: string;
  textChannel: string | null;
  voiceChannel: string;
  connection: Connection;
  filters: Filters;
  queue: Queue;
  volume: number;
  loop: LoopMode;
  current: Track | null;
  previous: Track | null;
  previousTracks: Track[];
  position: number;
  timestamp: number;
  ping: number;
  playing: boolean;
  paused: boolean;
  connected: boolean;
  isAutoplay: boolean;
  deaf: boolean;
  mute: boolean;
  data: Record<string, unknown>;
  
  connect(options?: object): this;
  disconnect(): this;
  play(): Promise<this>;
  stop(): this;
  pause(paused?: boolean): this;
  seek(position: number): this;
  setVolume(volume: number): this;
  setLoop(mode: LoopMode): this;
  setTextChannel(channelId: string): this;
  setVoiceChannel(channelId: string, options?: object): this;
  skip(): Promise<this>;
  destroy(): void;
  autoplay(playerOrEnabled: Player | boolean): Promise<this>;
  moveTo(newNode: Node): Promise<this>;
  restart(): Promise<this>;
  set(key: string, value: unknown): unknown;
  get(key: string): unknown;
  clearData(): this;
}

export class Track {
  constructor(data: object, requester: unknown, node: Node);
  
  rawData: object;
  encoded: string;
  track: string;
  info: TrackInfo;
  pluginInfo: object;
  
  getThumbnail(): Promise<string | null>;
  resolve(pappify: Pappify): Promise<this>;
  toJSON(): object;
  
  static fetchThumbnail(info: TrackInfo): Promise<string | null>;
}

export class Queue extends Array<Track> {
  get size(): number;
  get first(): Track | null;
  get last(): Track | null;
  get isEmpty(): boolean;
  get totalDuration(): number;
  
  add(track: Track | Track[]): this;
  remove(index: number): Track;
  removeRange(start: number, count: number): Track[];
  clear(): void;
  shuffle(): this;
  move(from: number, to: number): this;
  swap(index1: number, index2: number): this;
  getByRequester(requester: unknown): Track[];
  removeByRequester(requester: unknown): Track[];
  peek(start?: number, end?: number): Track[];
}

export class Filters {
  constructor(player: Player, options?: FilterOptions);
  
  player: Player;
  volume: number;
  equalizer: EqualizerBand[];
  karaoke: KaraokeOptions | null;
  timescale: TimescaleOptions | null;
  tremolo: TremoloOptions | null;
  vibrato: VibratoOptions | null;
  rotation: RotationOptions | null;
  distortion: DistortionOptions | null;
  channelMix: ChannelMixOptions | null;
  lowPass: LowPassOptions | null;
  bassboost: number | null;
  nightcore: boolean;
  vaporwave: boolean;
  slowmode: boolean;
  _8d: boolean;
  
  setEqualizer(bands: EqualizerBand[]): this;
  setKaraoke(enabled: boolean, options?: KaraokeOptions): this;
  setTimescale(enabled: boolean, options?: TimescaleOptions): this;
  setTremolo(enabled: boolean, options?: TremoloOptions): this;
  setVibrato(enabled: boolean, options?: VibratoOptions): this;
  setRotation(enabled: boolean, options?: RotationOptions): this;
  setDistortion(enabled: boolean, options?: DistortionOptions): this;
  setChannelMix(enabled: boolean, options?: ChannelMixOptions): this;
  setLowPass(enabled: boolean, options?: LowPassOptions): this;
  setBassboost(enabled: boolean, options?: { value?: number }): this;
  setNightcore(enabled: boolean, options?: TimescaleOptions): this;
  setVaporwave(enabled: boolean, options?: TimescaleOptions): this;
  setSlowmode(enabled: boolean, options?: TimescaleOptions): this;
  set8D(enabled: boolean, options?: RotationOptions): this;
  setDaycore(enabled: boolean, options?: TimescaleOptions): this;
  setChipmunk(enabled: boolean): this;
  setDarthvader(enabled: boolean): this;
  setDoubletime(enabled: boolean): this;
  setPop(enabled: boolean): this;
  setSoft(enabled: boolean): this;
  setTrebleBass(enabled: boolean): this;
  clearFilters(): Promise<this>;
  toJSON(): FilterOptions;
}

export class Connection {
  constructor(player: Player);
  
  player: Player;
  sessionId: string | null;
  voice: {
    sessionId: string | null;
    token: string | null;
    endpoint: string | null;
  };
  region: string | null;
  selfDeaf: boolean;
  selfMute: boolean;
  voiceChannel: string;
  establishing: boolean;
  
  get isReady(): boolean;
  
  resolve(): Promise<void>;
  setServerUpdate(data: object): void;
  setStateUpdate(data: object): void;
}

export class Rest {
  constructor(pappify: Pappify, node: object);
  
  url: string;
  password: string;
  version: RestVersion;
  sessionId: string | null;
  calls: number;
  
  setSessionId(sessionId: string): void;
  makeRequest(method: string, endpoint: string, body?: object, includeHeaders?: boolean): Promise<object>;
  getPlayers(): Promise<object[]>;
  getPlayer(guildId: string): Promise<object>;
  updatePlayer(options: object): Promise<object>;
  destroyPlayer(guildId: string): Promise<void>;
  loadTracks(identifier: string): Promise<object>;
  decodeTrack(track: string): Promise<object>;
  decodeTracks(tracks: string[]): Promise<object[]>;
  getStats(): Promise<object>;
  getInfo(): Promise<object>;
  getVersion(): Promise<string>;
  updateSession(resuming: boolean, timeout: number): Promise<object>;
  getRoutePlannerStatus(): Promise<object>;
  freeRoutePlannerAddress(address: string): Promise<void>;
  freeAllRoutePlannerAddresses(): Promise<void>;
}

export class Plugin {
  constructor(name: string);
  
  name: string;
  
  load(pappify: Pappify): void;
  unload(pappify: Pappify): void;
}
