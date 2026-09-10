import * as vscode from 'vscode';
import { MinesweeperProvider } from './MinesweeperProvider';
import { MinesweeperPanel } from './MinesweeperPanel';
import { DIFFICULTIES, Difficulty } from './game';
import { Lang } from './i18n';

function resolveLang(): Lang {
  const cfg = vscode.workspace.getConfiguration('minesweeper');
  const setting = cfg.get<string>('language', 'auto');
  if (setting === 'cn') { return 'cn'; }
  if (setting === 'en') { return 'en'; }
  const locale = vscode.env.language.toLowerCase();
  return locale.startsWith('zh') ? 'cn' : 'en';
}

export function activate(context: vscode.ExtensionContext) {
  // Default difficulty = easy.
  const provider = new MinesweeperProvider('easy', resolveLang());
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('minesweeper.difficulty', provider)
  );

  function openGame(difficulty: Difficulty) {
    provider.setCurrent(difficulty.id);
    MinesweeperPanel.createOrShow(context.extensionUri, difficulty, resolveLang());
  }

  // Main button: open game with current difficulty.
  context.subscriptions.push(
    vscode.commands.registerCommand('minesweeper.openGame', () => {
      const id = provider.getCurrentId();
      const d = DIFFICULTIES.find((x) => x.id === id) ?? DIFFICULTIES[0];
      openGame(d);
    })
  );

  // Open the web version in the external browser.
  context.subscriptions.push(
    vscode.commands.registerCommand('minesweeper.openWeb', () => {
      vscode.env.openExternal(vscode.Uri.parse('https://codejson.cn/games/mines/'));
    })
  );

  // TreeView item click / inline "Select".
  context.subscriptions.push(
    vscode.commands.registerCommand('minesweeper.selectDifficulty', (d: Difficulty) => {
      openGame(d);
    })
  );

  // Restart current game.
  context.subscriptions.push(
    vscode.commands.registerCommand('minesweeper.restart', () => {
      if (MinesweeperPanel.current) {
        const id = provider.getCurrentId();
        const d = DIFFICULTIES.find((x) => x.id === id) ?? DIFFICULTIES[0];
        MinesweeperPanel.current.setDifficulty(d);
      } else {
        vscode.commands.executeCommand('minesweeper.openGame');
      }
    })
  );

  // Switch language (toggles config + re-renders).
  context.subscriptions.push(
    vscode.commands.registerCommand('minesweeper.setLanguage', async () => {
      const cur = resolveLang();
      const target: Lang = cur === 'cn' ? 'en' : 'cn';
      await vscode.workspace
        .getConfiguration('minesweeper')
        .update('language', target, vscode.ConfigurationTarget.Global);
      provider.setLang(target);
      if (MinesweeperPanel.current) {
        MinesweeperPanel.current.setLang(target);
      }
      vscode.window.showInformationMessage(
        target === 'cn' ? '语言已切换为：中文' : 'Language switched to: English'
      );
    })
  );

  // Toggle the mine-odds (probability) hints in the game panel.
  context.subscriptions.push(
    vscode.commands.registerCommand('minesweeper.toggleProbability', () => {
      if (!MinesweeperPanel.current) {
        vscode.commands.executeCommand('minesweeper.openGame');
      }
      if (MinesweeperPanel.current) {
        MinesweeperPanel.current.toggleProbability();
      }
    })
  );
}

export function deactivate() {}
