// ============================================================================
// Online (LAN) Minesweeper — extension-host bridge.
//
// Architecture follows TetrisForVSCode: the *host webview* owns the authoritative
// game state, and the extension only relays JSON messages between the webview
// and the WebSocket peers.
//
// The one deliberate upgrade over Tetris is that the host accepts an unlimited
// number of peers: instead of a single `currentWs` (which closes extra
// connections with "Room is full") we keep a `Map<WebSocket, playerId>` and
// broadcast to all of them.
// ============================================================================

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import { WebSocketServer, WebSocket } from 'ws';
import {
  MULTI_PORT,
  MULTI_WEBVIEW_DIR,
  MULTI_HTML_FILE,
  MULTI_DIFFICULTIES,
  CLIENT_CONNECT_TIMEOUT_MS,
  ROUND_MS,
  TOTAL_MS,
  RESOLVE_PAUSE_MS,
  REVEAL_DELAY_MS,
  HOST_ID
} from './multiConfig';
import { getMultiDict, MultiLang } from './multiI18n';

type MultiRole = 'host' | 'client';

interface ConnectInfo {
  host: string;
  port: number;
}

// ---------------------------------------------------------------------------
// Language (read from the shared `minesweeper.language` setting; defaults to the
// VS Code locale). Implemented locally to avoid depending on the single-player
// modules.
// ---------------------------------------------------------------------------
function resolveMultiLang(): MultiLang {
  let setting = 'auto';
  try {
    setting = vscode.workspace.getConfiguration('minesweeper').get<string>('language', 'auto');
  } catch {
    setting = 'auto';
  }
  if (setting === 'cn') {
    return 'cn';
  }
  if (setting === 'en') {
    return 'en';
  }
  return vscode.env.language.toLowerCase().startsWith('zh') ? 'cn' : 'en';
}

// ---------------------------------------------------------------------------
// Networking state
// ---------------------------------------------------------------------------
let currentPanel: vscode.WebviewPanel | null = null;
let currentWss: WebSocketServer | null = null;
/** Host role: every connected peer mapped to the id assigned to it. */
const clients = new Map<WebSocket, string>();
/** Client role: the single upstream socket. */
let currentWs: WebSocket | null = null;
let playerSeq = 0;

/** Returns the first non-internal IPv4 address, or 127.0.0.1 as a fallback. */
function getLocalIPv4(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const addrs = nets[name];
    if (!addrs) {
      continue;
    }
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return '127.0.0.1';
}

/** Tears down the server (if any) and every open socket. */
function closeAllSockets(): void {
  for (const ws of clients.keys()) {
    try {
      ws.terminate();
    } catch {
      /* ignore */
    }
  }
  clients.clear();

  if (currentWss) {
    try {
      currentWss.close();
    } catch {
      /* ignore */
    }
    currentWss = null;
  }

  if (currentWs) {
    try {
      currentWs.terminate();
    } catch {
      /* ignore */
    }
    currentWs = null;
  }
}

// ---------------------------------------------------------------------------
// Webview orchestration
// ---------------------------------------------------------------------------
function openMultiGame(context: vscode.ExtensionContext, role: MultiRole, connectInfo: ConnectInfo): void {
  // Only one multiplayer window at a time.
  if (currentPanel) {
    const old = currentPanel;
    currentPanel = null;
    try {
      old.dispose();
    } catch {
      /* ignore */
    }
  }
  closeAllSockets();
  playerSeq = 0;

  const lang = resolveMultiLang();
  const dict = getMultiDict(lang);
  const title = role === 'host' ? `${dict.title} — ${dict.hostBadge}` : dict.title;

  const panel = vscode.window.createWebviewPanel(
    role === 'host' ? 'minesweeperMultiHost' : 'minesweeperMultiClient',
    title,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, ...MULTI_WEBVIEW_DIR)]
    }
  );
  currentPanel = panel;

  // ---------------------------- bootstrap html ----------------------------
  const htmlPath = vscode.Uri.joinPath(context.extensionUri, ...MULTI_WEBVIEW_DIR, MULTI_HTML_FILE);
  let html: string;
  try {
    html = fs.readFileSync(htmlPath.fsPath, 'utf-8');
  } catch (err) {
    panel.webview.html = `<body style="font-family:sans-serif;padding:20px">${dict.errBootstrap}</body>`;
    return;
  }

  const bootstrap = {
    role,
    host: connectInfo.host,
    port: connectInfo.port,
    lang,
    dict,
    difficulties: MULTI_DIFFICULTIES,
    // Timing constants are injected so the webview has a single source of truth.
    roundMs: ROUND_MS,
    totalMs: TOTAL_MS,
    resolvePauseMs: RESOLVE_PAUSE_MS,
    revealDelayMs: REVEAL_DELAY_MS,
    hostId: HOST_ID
  };
  html = html.replace(/__MULTI_BOOTSTRAP_VALUE__/g, JSON.stringify(bootstrap));
  panel.webview.html = html;

  let disposed = false;
  const postToPanel = (msg: unknown): void => {
    if (disposed) {
      return;
    }
    void panel.webview.postMessage(msg);
  };

  const forwardToPanel = (data: string, from?: string): void => {
    try {
      const parsed: unknown = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        if (from) {
          (parsed as { from?: string }).from = from;
        }
        postToPanel(parsed);
      }
    } catch {
      /* ignore malformed payloads */
    }
  };

  // ---------------------------- webview -> network -------------------------
  panel.webview.onDidReceiveMessage((raw: unknown) => {
    if (!raw || typeof raw !== 'object') {
      return;
    }
    const msg = raw as { to?: unknown; type?: unknown };
    let payload: string;
    try {
      payload = JSON.stringify(raw);
    } catch {
      return;
    }

    if (role === 'host') {
      const to = typeof msg.to === 'string' ? msg.to : undefined;
      for (const [ws, id] of clients) {
        if (to && id !== to) {
          continue;
        }
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(payload);
          } catch {
            /* ignore */
          }
        }
      }
      return;
    }

    if (currentWs && currentWs.readyState === WebSocket.OPEN) {
      try {
        currentWs.send(payload);
      } catch {
        /* ignore */
      }
    }
  });

  // ---------------------------- transport ----------------------------------
  if (role === 'host') {
    const wss = new WebSocketServer({ port: connectInfo.port });
    currentWss = wss;

    wss.on('listening', () => {
      postToPanel({ type: 'hostReady', host: connectInfo.host, port: connectInfo.port, selfId: HOST_ID });
    });

    wss.on('connection', (ws: WebSocket) => {
      const id = 'p' + ++playerSeq;
      clients.set(ws, id);
      postToPanel({ type: 'peerJoined', id });

      ws.on('message', (buf: unknown) => forwardToPanel(String(buf), id));
      ws.on('close', () => {
        if (clients.delete(ws)) {
          postToPanel({ type: 'peerLeft', id });
        }
      });
      ws.on('error', () => {
        /* the close handler performs the cleanup */
      });
    });

    wss.on('error', (err: Error) => {
      const message = `${dict.errHost}: ${err.message}`;
      void vscode.window.showErrorMessage(message);
      postToPanel({ type: 'hostError', message });
    });
  } else {
    const ws = new WebSocket(`ws://${connectInfo.host}:${connectInfo.port}`);
    currentWs = ws;
    let opened = false;

    const connectTimer = setTimeout(() => {
      if (!opened) {
        try {
          ws.terminate();
        } catch {
          /* ignore */
        }
        postToPanel({
          type: 'clientTimeout',
          host: connectInfo.host,
          port: connectInfo.port
        });
      }
    }, CLIENT_CONNECT_TIMEOUT_MS);

    ws.on('open', () => {
      opened = true;
      clearTimeout(connectTimer);
      postToPanel({ type: 'clientReady' });
    });
    ws.on('message', (buf: unknown) => forwardToPanel(String(buf)));
    ws.on('close', () => {
      clearTimeout(connectTimer);
      if (currentWs === ws) {
        currentWs = null;
      }
      postToPanel(
        opened
          ? { type: 'disconnected' }
          : { type: 'clientRefused', host: connectInfo.host, port: connectInfo.port }
      );
    });
    ws.on('error', (err: Error) => {
      clearTimeout(connectTimer);
      postToPanel({ type: 'clientError', message: err.message });
    });
  }

  panel.onDidDispose(() => {
    disposed = true;
    if (currentPanel === panel) {
      currentPanel = null;
    }
    closeAllSockets();
  });
}

// ---------------------------------------------------------------------------
// Public entry points (called from src/extension.ts)
// ---------------------------------------------------------------------------

/**
 * Registers the two multiplayer commands. Invoked once from `activate`.
 */
export function registerMulti(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('minesweeper.multiCreate', () => {
      const lang = resolveMultiLang();
      const ip = getLocalIPv4();
      openMultiGame(context, 'host', { host: ip, port: MULTI_PORT });
      const text =
        lang === 'cn'
          ? `房间已创建！请让其他玩家加入：${ip}:${MULTI_PORT}`
          : `Room created! Ask other players to join: ${ip}:${MULTI_PORT}`;
      void vscode.window.showInformationMessage(text);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('minesweeper.multiJoin', async () => {
      const lang = resolveMultiLang();
      const input = await vscode.window.showInputBox({
        prompt:
          lang === 'cn'
            ? `请输入房主的 IP:端口（例如 192.168.1.10:${MULTI_PORT}）`
            : `Enter the host IP:port (e.g. 192.168.1.10:${MULTI_PORT})`,
        placeHolder: `192.168.1.10:${MULTI_PORT}`,
        ignoreFocusOut: true
      });
      if (!input) {
        return;
      }
      const match = input.trim().match(/^([^:]+)(?::(\d+))?$/);
      if (!match) {
        void vscode.window.showErrorMessage(
          lang === 'cn' ? '地址格式错误，请使用 IP:端口 格式。' : 'Invalid address, please use IP:port.'
        );
        return;
      }
      const host = match[1];
      const port = match[2] ? Number.parseInt(match[2], 10) : MULTI_PORT;
      openMultiGame(context, 'client', { host, port });
    })
  );
}

/** Releases every socket and closes the panel. Invoked from `deactivate`. */
export function disposeMulti(): void {
  if (currentPanel) {
    const panel = currentPanel;
    currentPanel = null;
    try {
      panel.dispose();
    } catch {
      /* ignore */
    }
  }
  closeAllSockets();
}
