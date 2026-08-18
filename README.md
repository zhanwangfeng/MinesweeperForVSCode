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
- **Language switching (en / cn)** — a toolbar button toggles the UI language; also respects the `minesweeper.language` setting (`auto` / `en` / `cn`) which follows the VSCode locale.

## Usage

1. Press the mine icon in the Activity Bar (or run command **Minesweeper: Open Game**).
2. Pick a difficulty from the TreeView on the left.
3. Play in the webview. Use **Restart** to reset and **Switch Language** to toggle en/cn.

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
