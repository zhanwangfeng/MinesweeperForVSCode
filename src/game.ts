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
