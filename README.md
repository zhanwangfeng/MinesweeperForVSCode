# Minesweeper for VSCode

[![VS Marketplace](https://vsmarketplacebadges.dev/version-short/zhanwangfeng.minesweeper-for-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=zhanwangfeng.minesweeper-for-vscode)
[![Installs](https://vsmarketplacebadges.dev/installs/zhanwangfeng.minesweeper-for-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=zhanwangfeng.minesweeper-for-vscode)
[![Downloads](https://vsmarketplacebadges.dev/downloads/zhanwangfeng.minesweeper-for-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=zhanwangfeng.minesweeper-for-vscode)
[![Rates](https://vsmarketplacebadges.dev/rating-star/zhanwangfeng.minesweeper-for-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=zhanwangfeng.minesweeper-for-vscode)

A classic Minesweeper game that runs inside Visual Studio Code.

- GitHub: https://github.com/zhanwangfeng/MinesweeperForVSCode
- VSCode: https://marketplace.visualstudio.com/items?itemName=zhanwangfeng.minesweeper-for-vscode

## Features

- **Activity Bar entry** — a mine icon opens the Minesweeper view container.
- **Main "Open Game" button** — opens (or focuses) the game in a webview.
- **TreeView difficulty selector** — choose Easy / Medium / Hard; the current selection is highlighted and a "Select" action is available per item.
- **Webview game board** — left-click to reveal, right-click to flag, flood-fill, timers, and win/lose detection.
- **Chord / clear** — left-click an already-revealed number to auto-clear its neighbors once enough flags are placed.
- **Mine odds (probability) hints** — an **Odds** toggle button in the toolbar; when enabled, hovering an unrevealed cell shows a floating `💣 33%` tooltip with the exact chance that the cell is a mine.
- **Language switching (en / cn)** — a toolbar button toggles the UI language; also respects the `minesweeper.language` setting (`auto` / `en` / `cn`) which follows the VSCode locale.

## Usage

1. Press the mine icon in the Activity Bar (or run command **Minesweeper: Open Game**).
2. Pick a difficulty from the TreeView on the left.
3. Play in the webview. Use **Restart** to reset and **Switch Language** to toggle en/cn.
4. Click **Odds** (✕ / ✓) in the toolbar to turn mine-probability hints on or off, then hover any unrevealed cell to see its odds.

## Mine Odds

The odds are **exact**, not a heuristic:

- Every revealed number cell becomes a constraint over its unrevealed neighbors (flags count as known mines and are subtracted from the number).
- Frontier cells are grouped into connected components by shared constraints; every legal mine layout of each component is enumerated with backtracking, unit propagation, and branching on the smallest constraint.
- Cells that touch no number are symmetric, so they are folded in with binomial coefficients instead of being enumerated.
- All components are combined by polynomial convolution under the global remaining-mine count, giving each cell a probability in `[0, 1]`.

Consequences worth knowing:

- `0%` means the cell is provably safe, `100%` means it is provably a mine — both are certainties derived from the current board.
- On an untouched board there is no information yet, so every cell reports `0%` until the first reveal.
- A 1500 ms computation budget guards against pathological hard-mode positions; if it is exceeded, hints for that move are simply skipped.
- Odds are only computed while a game is in progress (not after a win/loss) and only when the toggle is on.

## Commands

| Command | Description |
| --- | --- |
| `Minesweeper: Open Game` | Open or focus the game webview with the current difficulty. |
| `Minesweeper: Restart` | Restart the current game. |
| `Minesweeper: Switch Language` | Toggle the UI between English and Chinese. |
| `Minesweeper: Toggle Mine Odds` | Turn the probability hints on/off (opens the game first if needed). |
| `Minesweeper: Web Version` | Open the browser version at https://codejson.cn/games/mines/. |
| `Minesweeper: Select` | Inline action on a TreeView difficulty item. |

## Build & Run (for development)

```bash
npm install
npm run compile        # compile to dist/
# Press F5 in VSCode to launch the Extension Development Host
```

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `minesweeper.language` | `auto` | UI language: `auto` (follows VSCode locale), `en`, or `cn`. |
