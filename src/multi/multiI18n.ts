// ============================================================================
// Online (LAN) Minesweeper — dedicated translations.
//
// Kept separate from the single-player `src/i18n.ts` so the two games can evolve
// independently. The dictionary is injected into the webview through the
// bootstrap payload.
// ============================================================================

export type MultiLang = 'en' | 'cn';

export interface MultiDict {
  title: string;
  roleHost: string;
  lobbyHint: string;
  lobbyHostHint: string;
  lobbyReady: string;
  players: string;
  youBadge: string;
  hostBadge: string;
  online: string;
  offline: string;
  boardSize: string;
  startGame: string;
  playAgain: string;
  addBot: string;
  botName: string;
  debugMode: string;
  roundLabel: string;
  totalLabel: string;
  pickHint: string;
  isMine: string;
  notMine: string;
  statSafe: string;
  statMine: string;
  waitingOthers: string;
  waitNext: string;
  roundResolved: string;
  correct: string;
  wrong: string;
  noPick: string;
  gameOver: string;
  ranking: string;
  score: string;
  nickname: string;
  nicknamePlaceholder: string;
  nicknameEdit: string;
  hostAddr: string;
  connHostWaiting: string;
  connClientConnecting: string;
  connConnected: string;
  connDisconnected: string;
  connYouJoined: string;
  connWaitingHost: string;
  errTimeout: string;
  errRefused: string;
  errHost: string;
  errClient: string;
  errBootstrap: string;
}

const en: MultiDict = {
  title: 'Minesweeper · Online',
  roleHost: 'Host',
  lobbyHint: 'Waiting for the host to start…',
  lobbyHostHint: 'Waiting for players. At least one player is required — share the address above, or add a bot to start on your own.',
  lobbyReady: 'Ready — click "Start Game" to begin.',
  players: 'Players',
  youBadge: 'You',
  hostBadge: 'Host',
  online: 'online',
  offline: 'offline',
  boardSize: 'Board size',
  startGame: 'Start Game',
  playAgain: 'Play Again',
  addBot: 'Add Bot',
  botName: 'Bot {n}',
  debugMode: 'Debug mode',
  roundLabel: 'Round',
  totalLabel: 'Total',
  pickHint: 'Click a hidden cell, then judge whether it is a mine.',
  isMine: 'Mine',
  notMine: 'Safe',
  statSafe: 'Not-mine votes',
  statMine: 'Mine votes',
  waitingOthers: 'Picked — waiting for the other players…',
  waitNext: 'Waiting for next game',
  roundResolved: 'Round result',
  correct: 'Correct',
  wrong: 'Wrong',
  noPick: 'No pick',
  gameOver: 'Game Over',
  ranking: 'Final ranking',
  score: 'Score',
  nickname: 'Nickname',
  nicknamePlaceholder: 'Enter a nickname',
  nicknameEdit: 'Set nickname',
  hostAddr: 'Room address: {addr}',
  connHostWaiting: 'Room is open — waiting for players…',
  connClientConnecting: 'Connecting to {addr}…',
  connConnected: 'Connected',
  connDisconnected: 'Disconnected from the host',
  connYouJoined: 'Joined the room — waiting for the host',
  connWaitingHost: 'Waiting for the room to open…',
  errTimeout: 'Connection timed out: {addr} did not respond',
  errRefused: 'Connection refused: {addr}',
  errHost: 'Failed to create the room',
  errClient: 'Connection failed',
  errBootstrap: 'Missing multiplayer parameters — open this page from the Minesweeper sidebar.'
};

const cn: MultiDict = {
  title: '扫雷 · 联机对战',
  roleHost: '房主',
  lobbyHint: '等待房主开始游戏…',
  lobbyHostHint: '等待玩家加入，至少需要 1 名玩家才能开始；可分享上方地址，或点击「添加机器人」先开一局测试。',
  lobbyReady: '已就绪，点击「开始游戏」即可开局。',
  players: '玩家',
  youBadge: '你',
  hostBadge: '房主',
  online: '在线',
  offline: '离线',
  boardSize: '棋盘尺寸',
  startGame: '开始游戏',
  playAgain: '再来一局',
  addBot: '添加机器人',
  botName: '机器人 {n}',
  debugMode: '调试模式',
  roundLabel: '回合',
  totalLabel: '总时间',
  pickHint: '点击一个未揭晓的格子，判断它是否是雷。',
  isMine: '地雷',
  notMine: '安全',
  statSafe: '选「安全」人数',
  statMine: '选「地雷」人数',
  waitingOthers: '已选择，等待其他玩家…',
  waitNext: '等待新开局',
  roundResolved: '本回合结算',
  correct: '答对',
  wrong: '答错',
  noPick: '未选择',
  gameOver: '游戏结束',
  ranking: '最终排名',
  score: '分数',
  nickname: '昵称',
  nicknamePlaceholder: '输入昵称',
  nicknameEdit: '设置昵称',
  hostAddr: '房间地址：{addr}',
  connHostWaiting: '房间服务已启动，等待玩家加入…',
  connClientConnecting: '正在连接 {addr}…',
  connConnected: '已连接',
  connDisconnected: '与房主的连接已断开',
  connYouJoined: '已加入房间，等待房主开始',
  connWaitingHost: '等待房主开启房间…',
  errTimeout: '连接超时：{addr} 未响应',
  errRefused: '连接被拒绝：{addr}',
  errHost: '创建房间失败',
  errClient: '连接失败',
  errBootstrap: '联机参数未注入，请从扫雷侧边栏打开此页面。'
};

export function getMultiDict(lang: MultiLang): MultiDict {
  return lang === 'cn' ? cn : en;
}
