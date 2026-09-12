# Changelog

All notable changes to the "minesweeper-for-vscode" extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.2.8] - 2026-09-12

### Fixed (Online Multiplayer)

- **Pick popup on revealed cells** — clicking an already-revealed cell no longer opens the pick popup. Clicking one now also dismisses any popup that is already open (previously the popup stayed visible because the revealed cell's click handler called `stopPropagation`, so the document-level close handler never saw the click).
- **Overlay flicker** — the Game Over leaderboard and the "waiting for players" lobby overlay no longer flash when the host adds a bot or changes the board size. The overlay used to be fully rebuilt on every `render()`, replaying its entrance animation; it is now built once per phase and only refreshes its dynamic text in place.
- **Leaderboard layout** — the Game Over leaderboard is now constrained inside its parent panel with proper margins, and its player list scrolls independently when there are too many players to fit.

## [1.2.7] - 2026-09-12

### Added
- Multiplayer nickname persistence: the name you set in the lobby is now stored in the extension's `globalState` and automatically pre-filled the next time you open or rejoin a room (host or client), so you no longer have to retype it after a reload, a reconnect, or restarting the panel.

## [1.2.6] - 2026-09-12

### Fixed
- Manifest localization now actually resolves `%...%` placeholders. In 1.2.5 the `localizations` translation `id` was corrected, but the base `package.nls.json` file was still missing from the VSIX because `files` only whitelisted `package.nls.zh-cn.json`. Without the base file VS Code cannot resolve manifest placeholders, so command/view titles continued to show raw strings such as `%command.setLanguage.title%` and `%view.container.title%`. Added `package.nls.json` to `files` and removed the now-redundant `contributes.localizations` entry (that contribution point is for language packs; an extension localizes its own manifest through `package.nls*.json` files).

## [1.2.5] - 2026-09-12

### Fixed
- Chinese (zh-cn) localization of the extension manifest now works. The `localizations` contribution used a bare extension name as the translation `id`, so VS Code could not associate `package.nls.zh-cn.json` with this extension and command titles showed raw placeholders (e.g. `%command.setLanguage.title%`). The `id` is now the full `publisher.name` (`zhanwangfeng.minesweeper-for-vscode`).

## [1.2.4] - 2026-09-12

### Removed
- The **Debug mode** checkbox that was shown in the room sidebar (host controls). It is a development-only switch: the underlying `DEBUG` flag is kept for local debugging, but it is no longer exposed anywhere in the user interface.

### Changed
- Multiplayer player list now also groups by player kind: after **you** and the **host**, real players are listed before **bots**, and bots are shown last. The join order is still kept within each group.

## [1.2.3] - 2026-09-12

### Fixed
- The root `LICENSE` file is now bundled into the VSIX. Since `files` acts as a whitelist, `vsce` only force-includes `package.json` and the README, so `LICENSE` was previously left out of the package and `vsce` warned "LICENSE, LICENSE.md, or LICENSE.txt not found".

### Changed
- `npm run package` now compiles the TypeScript sources only **once**: `vsce` already runs the `vscode:prepublish` script (which runs `tsc`), so the redundant explicit `npm run compile` was removed from the `package`/`publish` npm scripts.
- `vsce package` / `vsce publish` now run without interactive prompts: added the `repository` field to `package.json` (silences the "A 'repository' field is missing" prompt) and listed `LICENSE` in `files`.

## [1.2.2] - 2026-09-12

### Changed
- The multiplayer player list is now sorted for readability: **you are always shown first**; if you are not the host, the **host is shown second**, and everyone else keeps their join order.
- Nicknames can now only be changed **in the lobby**. Once a match has started the ✎ rename button next to your name in the player list (and the client nickname box in the sidebar) is hidden, and any unfinished rename is discarded — so nobody can change their name mid-match.

## [1.2.1] - 2026-09-12

### Fixed
- Fixed the published package missing the `ws` runtime dependency: installing from the Marketplace left the extension unable to activate (TreeView showed "There is no data provider registered" and command titles rendered as `%command...%` placeholders). `node_modules/ws` is now explicitly bundled, so LAN online multiplayer and the in-room editable nickname work on a fresh install.
- Corrected `MinesweeperPanel` webview `localResourceRoots` that pointed at a non-existent `src/webview` directory.

## [1.2.0] - 2026-09-11

### Added
- LAN online multiplayer with a host-authoritative, turn-based mode: an unlimited number of players share one board and compete on a score leaderboard.
- Two new TreeView entries: **Create Room (Online)** (starts a room, shows the local `IP:PORT` on port `18766`) and **Join Room (Online)** (joins by entering the host's `IP:PORT`). Two matching commands `minesweeper.multiCreate` / `minesweeper.multiJoin` are registered.
- In-room lobby showing every player's nickname, address and connection status; the host picks the board size (小 / 中 / 大, i.e. Small / Medium / Large; 9×9 / 16×16 / 20×20) inside the webview and starts the match once at least one player has joined.
- Round-based gameplay: each round every player picks one unrevealed cell and marks it as **Mine** or **Not a mine** within a 20-second limit. When everyone has picked or the timer expires, all picked cells are revealed together: a correct guess scores `+1`, a wrong guess `-1`, and players who did not pick keep their score.
- Live visualization of everyone's picks (color-coded per player) plus a round result overlay (green/red glow) and score-change popups.
- Whole-match countdown that scales with the board size (小 / Small 9×9 = 3 min, 中 / Medium 16×16 = 6 min, 大 / Large 20×20 = 9 min); the game ends on timeout or when every cell has been revealed, then a leaderboard ranked by score is shown with gold/silver/bronze highlighting.
- Disconnect handling: a player who leaves mid-round has their pick dropped and the lobby updated, while their score is preserved and the match continues.
- Host-only **Add Bot** button for solo testing: adds a local random bot to the room. Bots count as regular players (so the host can start a match alone), pick a random unrevealed cell with a random guess after a short random delay each round, and need no network connection.
- The board now opens with one random safe cell already revealed (preferring a cell with no adjacent mines so the opening cascades), mirroring the single-player first click.
- Revealing a safe cell with no adjacent mine now cascades through its neighbours (flood fill) at round resolution, exactly like the single-player game, instead of only opening the single picked cell.
- The round result toast at the bottom of the window now reports **only the local player's own outcome** (`Correct +1` / `Wrong -1` / `No pick`) instead of listing every player's result.
- A player only sees the other players' picks **after making their own pick** for the round — picks are hidden until you commit, so nobody can free-ride on others' choices.
- Each player's current-round choice is shown as an icon (💣 mine / ✓ not a mine) in the player list, and every picked cell shows a live tally: a **green number (top-left)** counts players who guessed *not a mine*, a **red number (bottom-right)** counts players who guessed *mine*.
- When everyone has picked before the round timer expires, the answers are now held for about 3 seconds (configurable via `REVEAL_DELAY_MS`) so players can study the board before the reveal, instead of resolving instantly.
- Fixed a picker popup glitch where it snapped sideways once: the popup is now centered under the cursor by measuring its width (no `translateX` transform fighting the open animation).
- Dark glassmorphism UI with a 20-second ring countdown, total-time countdown, beveled board cells and restrained animations; all styles are inlined and follow the VSCode theme variables.
- Chinese localization for the online UI and the two new command titles (创建房间(联机) / 加入房间(联机)).
- Editable nickname: every player (the host included) can set their own display name after joining by clicking the ✎ button next to their name in the player list; for clients the change is sent to the host and broadcast to all, while the host updates its own name directly. Names are capped at 16 characters.

### Changed
- Online difficulty labels are now **小 / 中 / 大** (Small / Medium / Large) instead of Easy / Medium / Hard.
- The large board is now **20×20** (was 16×30); mine density stays at roughly a third of all cells.
- Match length now scales with the board size — **小 = 3 min, 中 = 6 min, 大 = 9 min** (a 1:2:3 ratio) — instead of a flat 3 minutes for every board.
- Players (including bots) who join **after a match has started** are tagged *Waiting for next game* and only become active in the following match; they cannot pick during the current one and are excluded from the round's "everyone picked" check.
- Clicking outside the pick popup now dismisses it.
- New scoring model that scales with player count: each cell is worth `max(5, ceil(playerCount / 2))`; correct guesses share `+max(1, ceil(pot / correctCount))` and wrong guesses share `−max(1, ceil(pot / wrongCount / 3))`, instead of a flat ±1.
- Score-delta animation in the player list at settlement: each player's score shows a floating `+N` (red, bonus) / `−N` (green, penalty) badge to the right of their score, auto-hidden after 3 seconds without delaying the next round.
- The score-change badge takes priority over the per-player choice icon: the choice icon is hidden while a player's delta is showing, and reappears only after the badge fades, so the two never overlap.
- Added a generic "Debug mode" toggle in the host controls. When enabled, every bot commits to the same randomly chosen cell (so the resolve/scoring flow can be exercised deterministically). The flag is a shared hook for future debug features.

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
