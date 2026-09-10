// Core Minesweeper game logic (framework-agnostic, runs in webview).

export interface Difficulty {
  id: string;
  label: string;
  labelCn: string;
  rows: number;
  cols: number;
  mines: number;
}

export const DIFFICULTIES: Difficulty[] = [
  { id: 'easy', label: 'Easy', labelCn: '简单', rows: 9, cols: 9, mines: 10 },
  { id: 'medium', label: 'Medium', labelCn: '中等', rows: 16, cols: 16, mines: 40 },
  { id: 'hard', label: 'Hard', labelCn: '困难', rows: 16, cols: 30, mines: 99 }
];

export interface Cell {
  row: number;
  col: number;
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';

export class Minesweeper {
  rows: number;
  cols: number;
  mines: number;
  grid: Cell[][] = [];
  status: GameStatus = 'ready';
  revealedCount = 0;
  flaggedCount = 0;

  constructor(rows: number, cols: number, mines: number) {
    this.rows = rows;
    this.cols = cols;
    this.mines = mines;
    this.reset();
  }

  reset(): void {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({ row: r, col: c, mine: false, revealed: false, flagged: false, adjacent: 0 });
      }
      this.grid.push(row);
    }
    this.status = 'ready';
    this.revealedCount = 0;
    this.flaggedCount = 0;
  }

  // Place mines avoiding the first clicked cell and its neighbors.
  private placeMines(safeR: number, safeC: number): void {
    const safe = new Set<string>();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = safeR + dr;
        const c = safeC + dc;
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          safe.add(`${r},${c}`);
        }
      }
    }
    let placed = 0;
    while (placed < this.mines) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      if (safe.has(`${r},${c}`) || this.grid[r][c].mine) { continue; }
      this.grid[r][c].mine = true;
      placed++;
    }
    // compute adjacency
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].mine) { continue; }
        let n = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) { continue; }
            if (this.grid[nr][nc].mine) { n++; }
          }
        }
        this.grid[r][c].adjacent = n;
      }
    }
  }

  reveal(r: number, c: number): void {
    if (this.status === 'won' || this.status === 'lost') { return; }
    const cell = this.grid[r][c];
    if (cell.revealed || cell.flagged) { return; }

    if (this.status === 'ready') {
      this.placeMines(r, c);
      this.status = 'playing';
    }

    if (cell.mine) {
      cell.revealed = true;
      this.status = 'lost';
      this.revealAllMines();
      return;
    }

    this.floodReveal(r, c);
    this.checkWin();
  }

  private floodReveal(r: number, c: number): void {
    const cell = this.grid[r][c];
    if (cell.revealed || cell.flagged || cell.mine) { return; }
    cell.revealed = true;
    this.revealedCount++;
    if (cell.adjacent === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) { continue; }
          if (nr === r && nc === c) { continue; }
          this.floodReveal(nr, nc);
        }
      }
    }
  }

  toggleFlag(r: number, c: number): void {
    if (this.status === 'won' || this.status === 'lost') { return; }
    const cell = this.grid[r][c];
    if (cell.revealed) { return; }
    cell.flagged = !cell.flagged;
    this.flaggedCount += cell.flagged ? 1 : -1;
  }

  // Return the 8 (or fewer at edges) neighbor coordinates of a cell.
  getNeighbors(r: number, c: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) { continue; }
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) { continue; }
        out.push([nr, nc]);
      }
    }
    return out;
  }

  /**
   * Chord / clear: only valid on an already-revealed, non-mine cell.
   * If the number of flags around it is >= the cell's number, reveal all
   * neighboring cells that are not flagged (classic "safe clear").
   * Returns true if the chord actually cleared cells, false if the
   * precondition was not met (caller should play a "denied" flash effect).
   */
  chord(r: number, c: number): boolean {
    if (this.status === 'won' || this.status === 'lost') { return false; }
    const cell = this.grid[r][c];
    if (!cell.revealed || cell.mine || cell.adjacent === 0) { return false; }

    const neighbors = this.getNeighbors(r, c);
    const flagged = neighbors.filter(([nr, nc]) => this.grid[nr][nc].flagged).length;
    if (flagged < cell.adjacent) {
      return false; // precondition not met -> caller flashes
    }

    // Reveal all non-flagged, non-revealed neighbors.
    for (const [nr, nc] of neighbors) {
      const n = this.grid[nr][nc];
      if (n.flagged || n.revealed) { continue; }
      if (n.mine) {
        n.revealed = true;
        this.status = 'lost';
        this.revealAllMines();
        return true;
      }
      this.floodReveal(nr, nc);
    }
    this.checkWin();
    return true;
  }

  private revealAllMines(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].mine) { this.grid[r][c].revealed = true; }
      }
    }
  }

  private checkWin(): void {
    const total = this.rows * this.cols;
    if (this.revealedCount === total - this.mines) {
      this.status = 'won';
      // auto-flag remaining mines
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c].mine && !this.grid[r][c].flagged) {
            this.grid[r][c].flagged = true;
            this.flaggedCount++;
          }
        }
      }
    }
  }

  remainingMines(): number {
    return this.mines - this.flaggedCount;
  }
}

// ============ Probability Analysis ============
// 计算每个未翻开（且未插旗）格子是雷的概率。
// 思路：把已翻开的数字格作为约束，把「边界格」按约束连通性拆分为若干连通分量，
// 对每个分量枚举所有满足约束的布雷方案；再把「不在边界上的格子」用组合数并入，
// 最后在全局雷数约束下做多项式卷积得到每种情况下被踩中的方案数。

export interface ProbabilityConstraint {
  cells: number[];
  required: number;
}

interface SolvedComponent {
  cells: number[];
  P: number[];
  cellMine: number[][];
}

function polyMul(a: number[], b: number[]): number[] {
  const res = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    if (!ai) { continue; }
    for (let j = 0; j < b.length; j++) {
      const bj = b[j];
      if (bj) { res[i + j] += ai * bj; }
    }
  }
  return res;
}

// 取多项式 a*b 中 x^k 的系数
function polyCoefAt(a: number[], b: number[], k: number): number {
  let s = 0;
  const lo = Math.max(0, k - (b.length - 1));
  const hi = Math.min(a.length - 1, k);
  for (let i = lo; i <= hi; i++) {
    const bj = b[k - i];
    if (bj) { s += a[i] * bj; }
  }
  return s;
}

function binom(n: number, k: number): number {
  if (k < 0 || k > n || n < 0) { return 0; }
  k = Math.min(k, n - k);
  let res = 1;
  for (let i = 1; i <= k; i++) { res = res * (n - k + i) / i; }
  return res;
}

// 枚举单个连通分量的所有合法布雷方案
// 返回 { cells, P, cellMine }：P[k] 表示用 k 颗雷的方案数，
// cellMine[j][k] 表示第 j 个格子被布雷且总共用 k 颗雷的方案数
function solveComponent(
  cells: number[],
  cons: ProbabilityConstraint[],
  deadline: number
): SolvedComponent | null {
  const n = cells.length;
  const local = new Map<number, number>();
  for (let i = 0; i < n; i++) { local.set(cells[i], i); }

  const Lcons = cons.map((c) => ({
    cells: c.cells.map((id) => local.get(id) as number),
    required: c.required
  }));

  const assign = new Array<number>(n).fill(-1); // -1 未知 / 0 非雷 / 1 雷
  const P = new Array<number>(n + 1).fill(0);
  const cellMine: number[][] = [];
  for (let i = 0; i < n; i++) { cellMine.push(new Array<number>(n + 1).fill(0)); }

  let steps = 0;
  let aborted = false;
  // 每 2048 次调用检查一次时间预算，避免极端局面卡死页面
  const tick = () => {
    if ((++steps & 2047) === 0 && Date.now() > deadline) { aborted = true; }
    return aborted;
  };

  // 单元传播：把能唯一确定的格子直接定下来；返回 false 表示矛盾
  function propagate(changes: number[]): boolean {
    let changed = true;
    while (changed) {
      changed = false;
      for (const cs of Lcons) {
        let minesSet = 0;
        const unknown: number[] = [];
        for (const i of cs.cells) {
          if (assign[i] === 1) { minesSet++; }
          else if (assign[i] === -1) { unknown.push(i); }
        }
        const need = cs.required - minesSet;
        if (need < 0 || need > unknown.length) { return false; }
        if (unknown.length === 0) { continue; }
        if (need === 0) {
          for (const i of unknown) { assign[i] = 0; changes.push(i); }
          changed = true;
        } else if (need === unknown.length) {
          for (const i of unknown) { assign[i] = 1; changes.push(i); }
          changed = true;
        }
      }
    }
    return true;
  }

  function undo(changes: number[]): void {
    for (let k = changes.length - 1; k >= 0; k--) { assign[changes[k]] = -1; }
  }

  function search(): void {
    if (tick()) { return; }
    const changes: number[] = [];
    if (!propagate(changes)) { undo(changes); return; }

    // 选择分支数最少的约束
    let bestUnknown: number[] | null = null;
    let bestNeed = 0;
    let bestCombos = Infinity;
    for (const cs of Lcons) {
      let minesSet = 0;
      const unknown: number[] = [];
      for (const i of cs.cells) {
        if (assign[i] === 1) { minesSet++; }
        else if (assign[i] === -1) { unknown.push(i); }
      }
      const need = cs.required - minesSet;
      if (unknown.length === 0) {
        if (need !== 0) { undo(changes); return; }
        continue;
      }
      if (need < 0 || need > unknown.length) { undo(changes); return; }
      const combos = binom(unknown.length, need);
      if (combos < bestCombos) { bestCombos = combos; bestUnknown = unknown; bestNeed = need; }
    }

    if (!bestUnknown) {
      // 所有约束满足，记录一组完整方案（此时该分量所有格子都已确定）
      let total = 0;
      for (let i = 0; i < n; i++) { if (assign[i] === 1) { total++; } }
      P[total] += 1;
      for (let i = 0; i < n; i++) { if (assign[i] === 1) { cellMine[i][total] += 1; } }
      undo(changes);
      return;
    }

    const unknown = bestUnknown;
    const need = bestNeed;
    const un = unknown.length;
    const chosen: number[] = [];
    const recChoose = (start: number, depth: number): void => {
      if (tick()) { return; }
      if (depth === need) {
        const inner: number[] = [];
        for (const i of unknown) { assign[i] = 0; inner.push(i); }
        for (const i of chosen) { assign[i] = 1; }
        search();
        undo(inner);
        return;
      }
      for (let i = start; i <= un - (need - depth); i++) {
        chosen.push(unknown[i]);
        recChoose(i + 1, depth + 1);
        chosen.pop();
        if (aborted) { return; }
      }
    };
    recChoose(0, 0);

    undo(changes);
  }

  search();
  if (aborted) { return null; }
  return { cells: cells, P: P, cellMine: cellMine };
}

/**
 * 计算概率，返回 Map<cellIndex, probability>，index = row * cols + col。
 * 只包含「未翻开且未插旗」的格子；无法求解时返回 null。
 */
export function computeProbabilities(g: Minesweeper): Map<number, number> | null {
  const cols = g.cols;
  const idx = (r: number, c: number) => r * cols + c;

  const unrevealed: Array<[number, number]> = [];
  const revealedCells: Array<[number, number]> = [];
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = g.grid[r][c];
      if (cell.revealed) { revealedCells.push([r, c]); }
      else if (!cell.flagged) { unrevealed.push([r, c]); } // 插旗的格子视为雷，跳过
    }
  }

  const F = g.flaggedCount;        // 旗子全部当作雷
  const K = g.mines - F;           // 还需在未翻开且未插旗的格子中布置的雷数
  const N = unrevealed.length;
  if (K < 0 || K > N) { return null; }

  // 一个格子都还没翻开：没有任何信息，所有格子概率按 0 处理
  if (revealedCells.length === 0) {
    const zero = new Map<number, number>();
    for (const [r, c] of unrevealed) { zero.set(idx(r, c), 0); }
    return zero;
  }

  // 尚未开始（未布雷）：所有格子等概率
  if (g.status === 'ready') {
    const map = new Map<number, number>();
    const p = N > 0 ? K / N : 0;
    for (const [r, c] of unrevealed) { map.set(idx(r, c), p); }
    return map;
  }

  // 根据已翻开数字格构建约束
  const constraints: ProbabilityConstraint[] = [];
  const frontierSet = new Set<number>();
  for (const [r, c] of revealedCells) {
    const cell = g.grid[r][c];
    if (cell.mine || cell.adjacent === 0) { continue; }
    let flags = 0;
    const cs: number[] = [];
    for (const [nr, nc] of g.getNeighbors(r, c)) {
      const nb = g.grid[nr][nc];
      if (nb.revealed) { continue; }
      if (nb.flagged) { flags++; }
      else { cs.push(idx(nr, nc)); }
    }
    if (cs.length === 0) {
      if (cell.adjacent - flags !== 0) { return null; }
      continue;
    }
    const required = cell.adjacent - flags;
    if (required < 0 || required > cs.length) { return null; }
    constraints.push({ cells: cs, required: required });
    for (const id of cs) { frontierSet.add(id); }
  }

  const O = N - frontierSet.size; // 不在任何数字格邻域内的格子数

  // 并查集：按约束把边界格拆成连通分量
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    while (parent.get(x) !== x) {
      const p = parent.get(x) ?? x;
      parent.set(x, parent.get(p) ?? p);
      x = parent.get(x) ?? x;
    }
    return x;
  };
  for (const id of frontierSet) { parent.set(id, id); }
  for (const cons of constraints) {
    for (let i = 1; i < cons.cells.length; i++) {
      const a = find(cons.cells[0]);
      const b = find(cons.cells[i]);
      if (a !== b) { parent.set(a, b); }
    }
  }

  const compMap = new Map<number, { cells: number[]; cons: ProbabilityConstraint[] }>();
  for (const id of frontierSet) {
    const root = find(id);
    if (!compMap.has(root)) { compMap.set(root, { cells: [], cons: [] }); }
    (compMap.get(root) as { cells: number[]; cons: ProbabilityConstraint[] }).cells.push(id);
  }
  for (const cons of constraints) {
    const root = find(cons.cells[0]);
    if (!compMap.has(root)) { compMap.set(root, { cells: [], cons: [] }); }
    (compMap.get(root) as { cells: number[]; cons: ProbabilityConstraint[] }).cons.push(cons);
  }

  const comps: SolvedComponent[] = [];
  const deadline = Date.now() + 1500; // 全局分析时间预算
  for (const item of compMap.values()) {
    const res = solveComponent(item.cells, item.cons, deadline);
    if (!res) { return null; }
    comps.push(res);
  }

  // 各分量多项式的前缀/后缀积
  const p = comps.length;
  const prefix: number[][] = new Array(p + 1);
  prefix[0] = [1];
  for (let i = 0; i < p; i++) { prefix[i + 1] = polyMul(prefix[i], comps[i].P); }
  const suffix: number[][] = new Array(p + 1);
  suffix[p] = [1];
  for (let i = p - 1; i >= 0; i--) { suffix[i] = polyMul(comps[i].P, suffix[i + 1]); }
  const prodAll = prefix[p];

  // 非边界格：任选 j 个布雷，方案数 C(O, j)
  const outPoly = new Array<number>(O + 1);
  for (let j = 0; j <= O; j++) { outPoly[j] = binom(O, j); }

  const totalPoly = polyMul(prodAll, outPoly);
  const T = K < totalPoly.length ? totalPoly[K] : 0;
  if (!T || !isFinite(T)) { return null; }

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const map = new Map<number, number>();

  // 非边界格：完全对称，概率相同
  if (O > 0) {
    const outCellPoly = new Array<number>(O + 1).fill(0);
    for (let j = 1; j <= O; j++) { outCellPoly[j] = binom(O - 1, j - 1); }
    const probOut = clamp(polyCoefAt(prodAll, outCellPoly, K) / T);
    for (const [r, c] of unrevealed) {
      const id = idx(r, c);
      if (!frontierSet.has(id)) { map.set(id, probOut); }
    }
  }

  // 边界格
  for (let i = 0; i < p; i++) {
    const comp = comps[i];
    const R = polyMul(polyMul(prefix[i], suffix[i + 1]), outPoly);
    for (let j = 0; j < comp.cells.length; j++) {
      map.set(comp.cells[j], clamp(polyCoefAt(R, comp.cellMine[j], K) / T));
    }
  }

  return map;
}

export function formatProb(prob: number): string {
  const v = Math.min(1, Math.max(0, prob)) * 100;
  if (v <= 0.05) { return '0%'; }
  if (v >= 99.95) { return '100%'; }
  if (v < 1) { return '<1%'; }
  if (v < 10) { return v.toFixed(1) + '%'; }
  return Math.round(v) + '%';
}
