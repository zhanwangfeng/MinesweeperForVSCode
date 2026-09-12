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
- **Online multiplayer (LAN)** — host-authoritative, turn-based mine guessing over your local network. Unlimited players share one board, pick one unrevealed cell per round and mark it as **Mine** or **Not a mine**, and compete on a score leaderboard.

## Usage

1. Press the mine icon in the Activity Bar (or run command **Minesweeper: Open Game**).
2. Pick a difficulty from the TreeView on the left.
3. Play in the webview. Use **Restart** to reset and **Switch Language** to toggle en/cn.
4. Click **Odds** (✕ / ✓) in the toolbar to turn mine-probability hints on or off, then hover any unrevealed cell to see its odds.

## Online Multiplayer (LAN)

Two extra TreeView entries appear below the difficulty items:

- **Create Room (Online)** — starts a room on your machine and shows your local `IP:PORT` (default port `18766`). Share it with the other players.
- **Join Room (Online)** — asks for the host's `IP:PORT` and joins that room.

### How a match works

1. The host opens the room webview and shares the `IP:PORT` shown in the header; players join by entering it there.
2. Everyone (including the host) appears in the lobby with their nickname, address and connection status. There is **no player limit**.
3. The **host** picks the board size inside the webview — **小 / 中 / 大** (Small / Medium / Large), i.e. **9×9 / 16×16 / 20×20** — and clicks **Start Game** once at least one other player has joined.
4. The board opens with **one random safe cell already revealed** — if it has no adjacent mines the reveal cascades through its neighbours, exactly like the first click of the single-player game.
5. Each round every player **picks one unrevealed cell** and marks it as **Mine** or **Not a mine**. A round lasts **20 seconds**. You only see the other players' picks **after you have made your own pick** — so nobody can free-ride on others' choices.
6. When everyone has picked — or the 20-second timer runs out — all picked cells are revealed together. If everyone has already picked but time remains, the picks are held for about **3 seconds** so you can study the board before the answer is shown. A picked cell that turns out to be a safe cell with **no adjacent mines cascades open** over its neighbours, exactly like the single-player game, so the board keeps opening up as you play.
7. Scoring scales with the number of players. Every cell is worth **`max(5, ceil(playerCount / 2))`** points (the pot), where `playerCount` is the active pool. That pot is split among the players who picked that cell: each **correct** guess earns **`+max(1, ceil(pot / correctCount))`** (shared equally), and each **wrong** guess loses **`−max(1, ceil(pot / wrongCount / 3))`** (a third of the pot, shared equally). Players who did not pick in time keep their score unchanged. The result toast at the bottom of the window reports **only your own outcome** for the round.
8. Revealed cells show their true identity (a mine, or the adjacent-mine count) and can no longer be picked. Each player's current pick is shown as an icon in the **player list** (💣 = mine, ✓ = not a mine), and every picked cell shows a live tally: a **green number top-left** = players who guessed *not a mine*, and a **red number bottom-right** = players who guessed *mine*.
9. The whole match lasts **3 / 6 / 9 minutes** for **小 / 中 / 大** (it scales with the board size). It ends when the timer reaches `0:00` or when every cell has been revealed, then a leaderboard is shown ranked by score (gold / silver / bronze for the top three).
10. If a player disconnects mid-round, their pick for that round is dropped and the lobby is updated, but their score is kept and the match continues.
11. Players (including bots) who join **after a match has started** are tagged **Waiting for next game** in the player list — they cannot pick during the current match and only become active when the next match begins.

### Test bots

The host can click **Add Bot** in the room sidebar at any time to drop a local bot into the room. A bot counts as a regular player (it appears in the lobby, the board and the leaderboard, and keeps its score across games), so a single person can start a match and exercise the whole flow — **Start Game** becomes available as soon as one bot has joined.

Bots are simple: each round a bot waits a short random moment, then picks a **random unrevealed cell** and a **random guess** (a coin flip between *Mine* and *Not a mine*). They never use the odds hints or any board knowledge, and they need no network connection — they live entirely in the host's webview.

Networking note: the host's machine must be reachable from the other players on the same network (firewall allowing the chosen TCP port).

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
| `Minesweeper: Create Room (Online)` | Start a LAN multiplayer room and show your local `IP:PORT`. |
| `Minesweeper: Join Room (Online)` | Join a LAN multiplayer room by entering the host's `IP:PORT`. |

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
