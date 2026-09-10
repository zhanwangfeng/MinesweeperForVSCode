# Changelog

All notable changes to the "minesweeper-for-vscode" extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-09-10

### Added
- Mine odds (probability) hints: a new **Odds** toggle button in the webview toolbar switches the feature on/off; when on, hovering an unrevealed cell shows a floating `💣 33%` tooltip with the exact chance of that cell being a mine.
- Exact probability solver: revealed number cells become constraints, frontier cells are split into connected components, every legal mine layout of each component is enumerated (unit propagation + branch on the smallest constraint), and the remaining "outside" cells are folded in with binomial coefficients under the global mine-count constraint. A 1500 ms budget keeps the UI responsive on hard boards.
- Flagged cells are treated as known mines, so odds stay consistent with your flags.
- Command **Minesweeper: Toggle Mine Odds** (`minesweeper.toggleProbability`) to switch the hints from the Command Palette; it opens the game first if no panel is active.
- Chinese localization for the new UI: `概率` / `已开启：悬停未翻开格子显示雷概率` / `已关闭：点击开启概率提示`, plus `开关雷概率提示` for the command title.

## [1.0.3] - 2026-08-19

### add web game link

## [1.0.2] - 2026-08-18

### fix bug

## [1.0.1] - 2026-08-18

### change icon

## [1.0.0] - 2026-08-18

### Added
- Classic Minesweeper game running inside VS Code.
- Activity Bar entry with a mine icon opening the Minesweeper view container.
- Main "Open Game" button to open/focus the game webview.
- TreeView difficulty selector (Easy / Medium / Hard) with current-selection highlight and inline "Select" action.
- Webview game board: left-click to reveal, right-click / long-press to flag, flood-fill, mine counter, timer, and win/lose detection.
- Chord / clear: left-click an already-revealed number cell to auto-clear neighbors when enough flags are placed; otherwise the non-flagged neighbors play a flash effect.
- Language switching (en / cn): TreeView "Switch Language" button toggles UI language; also respects the `minesweeper.language` setting (`auto` follows the VSCode locale, `en`, or `cn`). TreeView difficulty labels and webview content are localized.
- Polished dark-theme visuals: beveled (no rounded corners) cells with top-left highlight and heavier bottom-right shadow, sunken revealed cells, LED-style counters, and animated win/lose status.
- F5 launch configuration (`.vscode/launch.json` + `tasks.json`) for debugging.
