// ============================================================================
// Online (LAN) Minesweeper — configuration, board presets and protocol types.
//
// This module is intentionally self-contained: it does NOT import anything from
// the single-player game (game.ts / i18n.ts) so that the online mode stays a
// fully separate "second game" inside the same extension.
// ============================================================================

export interface MultiDifficulty {
  id: string;
  label: string;
  labelCn: string;
  rows: number;
  cols: number;
  mines: number;
  /** Total match length in ms — scales with the difficulty tier (1:2:3). */
  totalMs: number;
}

// Board presets for online play. The numbers mirror the classic presets but are
// defined independently here on purpose (see the isolation note above).
// Mines are set to roughly a third of all cells: a middle ground between the
// sparse classic presets and an all-out coin flip, keeping every pick a real
// judgment call.
function multiMineCount(rows: number, cols: number): number {
  return Math.round((rows * cols) / 3);
}

// Match length scales with the difficulty tier (small : medium : large = 1 : 2 : 3).
// Small is 3 minutes; medium and large follow the same proportion.
const MIN_TOTAL_MS = 3 * 60 * 1000;
const TIER_TOTAL_MS = [MIN_TOTAL_MS, MIN_TOTAL_MS * 2, MIN_TOTAL_MS * 3];

export const MULTI_DIFFICULTIES: MultiDifficulty[] = [
  { id: 'easy', label: 'Small', labelCn: '小', rows: 9, cols: 9, mines: multiMineCount(9, 9), totalMs: TIER_TOTAL_MS[0] },
  { id: 'medium', label: 'Medium', labelCn: '中', rows: 16, cols: 16, mines: multiMineCount(16, 16), totalMs: TIER_TOTAL_MS[1] },
  { id: 'hard', label: 'Large', labelCn: '大', rows: 20, cols: 20, mines: multiMineCount(20, 20), totalMs: TIER_TOTAL_MS[2] }
];

/** TCP port the host listens on (deliberately different from Tetris' 18765). */
export const MULTI_PORT = 18766;

/** Length of a single round, in milliseconds. */
export const ROUND_MS = 20000;

/** Length of a whole match, in milliseconds. */
export const TOTAL_MS = 180000;

/** Pause after a round is resolved, so every client can see the answer.
 *  Set to 0 to start the next round immediately once the answer is revealed. */
export const RESOLVE_PAUSE_MS = 0;

/** Delay between "everyone has picked" and the answer being revealed (only when
 *  the round still has time left). Gives players a moment to study the picks. */
export const REVEAL_DELAY_MS = 3000;

/** How long a client waits for the TCP handshake before giving up. */
export const CLIENT_CONNECT_TIMEOUT_MS = 10000;

/** Player id used for the host itself. */
export const HOST_ID = 'HOST';

/** Path (relative to the extension root) of the multiplayer webview assets. */
export const MULTI_WEBVIEW_DIR: string[] = ['src', 'multi', 'webview'];
export const MULTI_HTML_FILE = 'multi.html';

// ------------------------------- protocol ---------------------------------

export type MultiPhase = 'lobby' | 'playing' | 'over';

export interface PlayerInfo {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  isHost: boolean;
  /** True for host-owned test bots (no socket; plays at random). */
  isBot?: boolean;
  /** Stable join order — used for colours, tie-breaking and stable sorting. */
  order: number;
  /** True for players who joined after the current game started — they sit out
   *  this match and only become active when a new game begins. */
  waiting?: boolean;
}

/** A revealed cell: `[row, col, isMine, adjacentMines]`. */
export type CellView = [number, number, boolean, number];

/** A pending pick: `[playerId, row, col, guessMine]`. */
export type PickView = [string, number, number, boolean];

export interface GameState {
  phase: MultiPhase;
  difficultyId: string;
  rows: number;
  cols: number;
  mines: number;
  round: number;
  /** True while a resolved round is being shown before the next one starts. */
  resolving: boolean;
  players: PlayerInfo[];
  revealed: CellView[];
  picks: PickView[];
}

export interface RoundResult {
  playerId: string;
  correct: boolean;
  delta: number;
  row: number;
  col: number;
  mine: boolean;
}

export interface RankedPlayer extends PlayerInfo {
  rank: number;
}

/** Messages sent by the host webview towards the network (optionally unicast). */
export interface HostOutbound {
  type: string;
  to?: string;
  [key: string]: unknown;
}

/** Messages sent by a client webview towards the host. */
export type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'pick'; round: number; row: number; col: number; guessMine: boolean };
