# Changelog

All notable changes to the "minesweeper-for-vscode" extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
