import * as vscode from 'vscode';
import { Minesweeper, Difficulty, computeProbabilities } from './game';
import { getDict, Lang } from './i18n';

// Manages the webview panel that renders the game board.
export class MinesweeperPanel {
  public static current: MinesweeperPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private game: Minesweeper;
  private difficulty: Difficulty;
  private lang: Lang;
  private timer: NodeJS.Timeout | undefined;
  private seconds = 0;
  private disposables: vscode.Disposable[] = [];
  private probEnabled = false; // 概率提示开关

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    difficulty: Difficulty,
    lang: Lang
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.difficulty = difficulty;
    this.lang = lang;
    this.game = new Minesweeper(difficulty.rows, difficulty.cols, difficulty.mines);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg),
      null,
      this.disposables
    );

    this.update();
  }

  static createOrShow(extensionUri: vscode.Uri, difficulty: Difficulty, lang: Lang): void {
    const column = vscode.ViewColumn.Active;
    if (MinesweeperPanel.current) {
      MinesweeperPanel.current.panel.reveal(column);
      MinesweeperPanel.current.setDifficulty(difficulty);
      MinesweeperPanel.current.setLang(lang);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'minesweeperGame',
      'Minesweeper',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'webview')]
      }
    );
    MinesweeperPanel.current = new MinesweeperPanel(panel, extensionUri, difficulty, lang);
  }

  setDifficulty(d: Difficulty): void {
    this.difficulty = d;
    this.game = new Minesweeper(d.rows, d.cols, d.mines);
    this.seconds = 0;
    this.stopTimer();
    this.update();
  }

  setLang(lang: Lang): void {
    this.lang = lang;
    this.update();
  }

  dispose(): void {
    MinesweeperPanel.current = undefined;
    this.stopTimer();
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
  }

  private handleMessage(msg: any): void {
    switch (msg.command) {
      case 'reveal':
        this.game.reveal(msg.row, msg.col);
        this.ensureTimer();
        this.update();
        break;
      case 'flag':
        this.game.toggleFlag(msg.row, msg.col);
        this.ensureTimer();
        this.update();
        break;
      case 'restart':
        this.game.reset();
        this.seconds = 0;
        this.stopTimer();
        this.update();
        break;
      case 'chord': {
        const ok = this.game.chord(msg.row, msg.col);
        this.ensureTimer();
        if (!ok) {
          // precondition not met -> ask webview to flash neighbors
          const neighbors = this.game.getNeighbors(msg.row, msg.col);
          this.panel.webview.postMessage({
            command: 'flash',
            cells: neighbors.filter(([r, c]) => {
              const n = this.game.grid[r][c];
              return !n.revealed && !n.flagged;
            })
          });
        } else {
          this.update();
        }
        break;
      }
      case 'flash':
        // Forward to webview (no-op safety, handled client side above)
        break;
      case 'toggleProb':
        this.probEnabled = !this.probEnabled;
        this.update();
        break;
    }
  }

  // 供命令面板调用：切换概率提示开关
  toggleProbability(): boolean {
    this.probEnabled = !this.probEnabled;
    this.update();
    return this.probEnabled;
  }

  private ensureTimer(): void {
    if (this.timer || this.game.status !== 'playing') { return; }
    this.timer = setInterval(() => {
      this.seconds++;
      this.panel.webview.postMessage({ command: 'tick', seconds: this.seconds });
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private update(): void {
    if (this.game.status === 'won' || this.game.status === 'lost') {
      this.stopTimer();
    }
    this.panel.webview.html = this.getHtml();
  }

  // 概率提示：仅在开关打开且对局进行中时计算，结果以 "r,c" -> 概率 的普通对象下发。
  private probMapFor(g: Minesweeper): { [key: string]: number } | null {
    if (!this.probEnabled) { return null; }
    if (g.status === 'won' || g.status === 'lost') { return null; }
    let result: Map<number, number> | null = null;
    try {
      result = computeProbabilities(g);
    } catch (e) {
      result = null;
    }
    if (!result) { return null; }
    const out: { [key: string]: number } = {};
    result.forEach((p, id) => {
      const r = Math.floor(id / g.cols);
      const c = id % g.cols;
      out[`${r},${c}`] = p;
    });
    return out;
  }

  private getHtml(): string {
    const d = getDict(this.lang);
    const g = this.game;
    const state = {
      rows: g.rows,
      cols: g.cols,
      grid: g.grid,
      status: g.status,
      remaining: g.remainingMines(),
      seconds: this.seconds,
      difficulty: this.lang === 'cn' ? this.difficulty.labelCn : this.difficulty.label,
      lang: this.lang,
      probEnabled: this.probEnabled,
      prob: this.probMapFor(g)
    };

    const labels = JSON.stringify({ d: d, state: state });

    return `<!DOCTYPE html>
<html lang="${this.lang === 'cn' ? 'zh-CN' : 'en'}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  :root {
    --bg: var(--vscode-editor-background, #1e1e1e);
    --fg: var(--vscode-editor-foreground, #d4d4d4);
    --panel: var(--vscode-sideBar-background, #252526);
    --btn: var(--vscode-button-background, #0e639c);
    --btn-fg: var(--vscode-button-foreground, #ffffff);
    --btn-hover: var(--vscode-button-hoverBackground, #1177bb);
    --border: var(--vscode-panel-border, #3c3c3c);
    --cell: linear-gradient(145deg, #d7d7d7, #a8a8a8);
    --cell-face: #c0c0c0;
    --cell-fg: #1a1a1a;
    --revealed: linear-gradient(145deg, #e8e8e8, #d4d4d4);
    --revealed-face: #e0e0e0;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 22px 16px 28px;
    background:
      radial-gradient(1200px 600px at 50% -10%, rgba(14,99,156,0.12), transparent 60%),
      var(--bg);
    color: var(--fg);
    font-family: var(--vscode-font-family, sans-serif);
    display: flex; flex-direction: column; align-items: center;
  }
  h1 {
    font-size: 22px; margin: 0 0 16px; font-weight: 700; letter-spacing: 0.5px;
    background: linear-gradient(90deg, #4fc3f7, #81c784);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    text-shadow: 0 1px 0 rgba(0,0,0,0.25);
  }
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px 18px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    display: flex; flex-direction: column; align-items: center;
  }
  .toolbar {
    display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap;
    justify-content: center;
  }
  .stat {
    display: flex; align-items: center; gap: 6px;
    background: #111; color: #ff5252;
    border: 1px solid #000; border-radius: 8px;
    padding: 6px 12px; font-variant-numeric: tabular-nums;
    font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.8), inset 0 -1px 1px rgba(255,255,255,0.05);
    min-width: 86px; justify-content: center;
  }
  .stat .ico { font-size: 15px; }
  .stat.time { color: #4fc3f7; }
  button {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--btn); color: var(--btn-fg); border: none;
    padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600;
    transition: transform 0.12s ease, background 0.18s ease, box-shadow 0.18s ease;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  button:hover { background: var(--btn-hover); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
  button:active { transform: translateY(0); box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
  .board {
    display: grid; gap: 3px; background: #1b1b1b;
    padding: 6px; border-radius: 10px;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04);
    user-select: none; touch-action: manipulation;
  }
  .cell {
    width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
    background: var(--cell); color: var(--cell-fg); font-weight: 800; font-size: 15px;
    cursor: pointer; border-radius: 0;
    box-shadow:
      inset 2px 2px 0 rgba(255,255,255,0.65),
      inset -3px -3px 0 rgba(0,0,0,0.45);
    transition: transform 0.08s ease, filter 0.12s ease, background 0.12s ease;
  }
  .cell:hover:not(.revealed) { filter: brightness(1.08); }
  .cell:active:not(.revealed) { transform: scale(0.94); }
  .cell.revealed {
    background: var(--revealed); cursor: default; border-radius: 0;
    box-shadow: none;
    color: #333;
  }
  .cell.mine {
    background: radial-gradient(circle at 50% 40%, #ff8a80, #d32f2f);
    box-shadow: inset 0 0 6px rgba(0,0,0,0.4);
    font-size: 17px;
  }
  .cell.flag {
    background: linear-gradient(145deg, #fff59d, #fbc02d);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 3px rgba(0,0,0,0.2);
    font-size: 16px;
  }
  .cell.n1 { color: #1976d2; } .cell.n2 { color: #388e3c; }
  .cell.n3 { color: #d32f2f; } .cell.n4 { color: #7b1fa2; }
  .cell.n5 { color: #c2185b; } .cell.n6 { color: #0097a7; }
  .cell.n7 { color: #455a64; } .cell.n8 { color: #000; }
  .cell.n1, .cell.n2, .cell.n3, .cell.n4, .cell.n5, .cell.n6, .cell.n7, .cell.n8 {
    text-shadow: 0 1px 0 rgba(255,255,255,0.5);
  }
  @keyframes flashDenied {
    0% { background: var(--cell-face); }
    30% { background: #ffeb3b; box-shadow: 0 0 10px 3px #ffeb3b; }
    60% { background: #ff9800; box-shadow: 0 0 10px 3px #ff9800; }
    100% { background: var(--cell-face); box-shadow: inset 2px 2px 0 rgba(255,255,255,0.65), inset -3px -3px 0 rgba(0,0,0,0.45); }
  }
  .cell.flash { animation: flashDenied 0.5s ease; }
  @keyframes popIn {
    0% { transform: scale(0.6); opacity: 0; }
    60% { transform: scale(1.08); }
    100% { transform: scale(1); opacity: 1; }
  }
  .status { margin-top: 14px; font-size: 18px; font-weight: 700; min-height: 22px; animation: popIn 0.3s ease; }
  .hint { margin-top: 8px; font-size: 12px; opacity: 0.65; text-align: center; transition: opacity 0.3s ease; }
  /* 概率提示按钮 */
  .prob-btn{
    display:inline-flex; align-items:center; gap:6px;
    background:#2a3140; color:#9aa4b8; border:1px solid #3d4557;
    padding:8px 14px; border-radius:6px; cursor:pointer;
    font-size:13px; font-weight:600; font-family:inherit;
    transition:background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
  }
  .prob-btn::before{
    content:'\\2715'; flex:none; font-size:12px; font-weight:700; line-height:1;
    color:#6b7488; transition:color 0.18s ease, text-shadow 0.18s ease;
  }
  .prob-btn:hover{background:#333d50; color:#b3bdcd; transform:translateY(-1px); box-shadow:none;}
  .prob-btn:active{transform:translateY(0);}
  .prob-btn.on{
    background:#0e3a52; color:#d3efff; border-color:#4fc3f7;
    box-shadow:0 0 10px rgba(79,195,247,0.25);
  }
  .prob-btn.on::before{content:'\\2713'; color:#4fc3f7; text-shadow:0 0 6px rgba(79,195,247,0.9);}
  .prob-btn.on:hover{background:#134a6b; color:#eaf8ff;}
  /* 概率悬浮提示 */
  .prob-tip{
    position:fixed; z-index:200; pointer-events:none; white-space:nowrap;
    background:rgba(74,82,96,0.96); color:#fff; border:1px solid #4fc3f7;
    border-radius:6px; padding:4px 8px; font-size:12px; font-weight:700;
    box-shadow:0 4px 12px rgba(0,0,0,0.5);
    opacity:0; transition:opacity 0.1s ease;
  }
  .prob-tip.show{opacity:1;}
</style>
</head>
<body>
  <h1 id="title"></h1>
  <div class="card">
    <div class="toolbar">
      <div class="stat mines"><span class="ico">💣</span><b id="mines">0</b></div>
      <div class="stat time"><span class="ico">⏱</span><b id="time">0</b></div>
      <button id="restart">🔄 <span id="restartLabel"></span></button>
      <button type="button" id="probToggle" class="prob-btn"></button>
    </div>
    <div class="board" id="board"></div>
    <div class="status" id="status"></div>
    <div class="hint" id="hint"></div>
  </div>
  <div class="prob-tip" id="probTip"></div>

<script>
  const vscode = acquireVsCodeApi();
  const data = ${labels};
  let D = data.d;
  let S = data.state;
  const probTip = document.getElementById('probTip');

  // 概率提示按钮：文字取自语言包，开/关用配色 + 状态点区分
  function updateProbBtn() {
    const btn = document.getElementById('probToggle');
    if (!btn) { return; }
    btn.textContent = D.prob;
    btn.classList.toggle('on', !!S.probEnabled);
    btn.title = S.probEnabled ? D.probOn : D.probOff;
    btn.setAttribute('aria-pressed', S.probEnabled ? 'true' : 'false');
  }

  function fmtProb(prob) {
    const v = Math.min(1, Math.max(0, prob)) * 100;
    if (v <= 0.05) { return '0%'; }
    if (v >= 99.95) { return '100%'; }
    if (v < 1) { return '<1%'; }
    if (v < 10) { return v.toFixed(1) + '%'; }
    return Math.round(v) + '%';
  }

  function hideTip() { if (probTip) { probTip.classList.remove('show'); } }

  function showTip(el, r, c) {
    if (!S.probEnabled || !S.prob || !probTip) { return; }
    const cell = S.grid[r][c];
    if (cell.revealed || cell.flagged) { return; }
    const p = S.prob[r + ',' + c];
    if (p === undefined) { return; }
    const rect = el.getBoundingClientRect();
    probTip.textContent = '💣 ' + fmtProb(p);
    const cx = Math.min(window.innerWidth - 30, Math.max(30, rect.left + rect.width / 2));
    probTip.style.left = cx + 'px';
    if (rect.top < 40) {
      probTip.style.top = (rect.bottom + 4) + 'px';
      probTip.style.transform = 'translate(-50%, 0)';
    } else {
      probTip.style.top = (rect.top - 4) + 'px';
      probTip.style.transform = 'translate(-50%, -100%)';
    }
    probTip.classList.add('show');
  }

  function render() {
    document.getElementById('title').textContent = D.title + ' · ' + S.difficulty;
    document.getElementById('mines').textContent = S.remaining;
    document.getElementById('time').textContent = S.seconds;
    document.getElementById('restartLabel').textContent = D.reset;
    document.getElementById('hint').textContent = D.reveal + ' ' + D.flag;
    updateProbBtn();
    hideTip();

    const board = document.getElementById('board');
    board.style.gridTemplateColumns = 'repeat(' + S.cols + ', 28px)';
    board.innerHTML = '';
    for (let r = 0; r < S.rows; r++) {
      for (let c = 0; c < S.cols; c++) {
        const cell = S.grid[r][c];
        const el = document.createElement('div');
        el.className = 'cell';
        if (cell.revealed) {
          el.classList.add('revealed');
          if (cell.mine) {
            el.classList.add('mine');
            el.textContent = '💣';
          } else if (cell.adjacent > 0) {
            el.classList.add('n' + cell.adjacent);
            el.textContent = cell.adjacent;
          }
        } else if (cell.flagged) {
          el.classList.add('flag');
          el.textContent = '🚩';
        }
        el.dataset.r = r;
        el.dataset.c = c;
        let pressTimer = null;
        let longFired = false;
        const startPress = () => {
          longFired = false;
          pressTimer = setTimeout(() => {
            longFired = true;
            vscode.postMessage({ command: 'flag', row: r, col: c });
          }, 450);
        };
        const cancelPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
        // Left click: if already revealed -> chord, else reveal.
        // (suppressed when a long-press already fired a flag)
        el.addEventListener('click', () => {
          if (longFired) { longFired = false; return; }
          if (cell.revealed) {
            vscode.postMessage({ command: 'chord', row: r, col: c });
          } else {
            vscode.postMessage({ command: 'reveal', row: r, col: c });
          }
        });
        // Right click -> flag.
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          vscode.postMessage({ command: 'flag', row: r, col: c });
        });
        // Long-press (mouse) -> flag.
        el.addEventListener('mousedown', (e) => {
          if (e.button !== 0) { return; } // left button only
          startPress();
        });
        el.addEventListener('mouseup', cancelPress);
        el.addEventListener('mouseleave', cancelPress);
        // Long-press (touch) -> flag.
        el.addEventListener('touchstart', startPress, { passive: true });
        el.addEventListener('touchend', (e) => {
          cancelPress();
          if (longFired) { e.preventDefault(); }
        });
        el.addEventListener('touchmove', cancelPress);
        el.addEventListener('touchcancel', cancelPress);
        // 概率提示：悬停未翻开格子显示雷概率
        el.addEventListener('mouseenter', () => showTip(el, r, c));
        el.addEventListener('mouseleave', hideTip);
        board.appendChild(el);
      }
    }

    const st = document.getElementById('status');
    if (S.status === 'won') { st.textContent = D.win; st.style.color = '#4caf50'; }
    else if (S.status === 'lost') { st.textContent = D.lose; st.style.color = '#f44336'; }
    else { st.textContent = ''; }
  }

  document.getElementById('restart').addEventListener('click', () =>
    vscode.postMessage({ command: 'restart' }));

  // 概率提示开关
  document.getElementById('probToggle').addEventListener('click', () =>
    vscode.postMessage({ command: 'toggleProb' }));

  function flashCells(cells) {
    cells.forEach(([r, c]) => {
      const el = document.querySelector('.cell[data-r="' + r + '"][data-c="' + c + '"]');
      if (!el) { return; }
      el.classList.remove('flash');
      // force reflow so the animation can restart
      void el.offsetWidth;
      el.classList.add('flash');
      el.addEventListener('animationend', () => el.classList.remove('flash'), { once: true });
    });
  }

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (m.command === 'tick') { S.seconds = m.seconds; document.getElementById('time').textContent = m.seconds; }
    else if (m.command === 'flash') { flashCells(m.cells || []); }
  });

  render();
</script>
</body>
</html>`;
  }
}
