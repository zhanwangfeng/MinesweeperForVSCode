import * as vscode from 'vscode';
import { DIFFICULTIES, Difficulty } from './game';
import { Lang } from './i18n';

// Tree item representing a difficulty level.
export class DifficultyTreeItem extends vscode.TreeItem {
  constructor(
    public readonly difficulty: Difficulty,
    public readonly current: boolean,
    public readonly lang: Lang
  ) {
    const label = lang === 'cn' ? difficulty.labelCn : difficulty.label;
    super(label, vscode.TreeItemCollapsibleState.None);
    this.id = difficulty.id;
    this.contextValue = 'difficulty';
    this.description = current ? '•' : undefined;
    this.tooltip = `${label} — ${difficulty.rows}x${difficulty.cols}, ${difficulty.mines} mines`;
    this.iconPath = new vscode.ThemeIcon(current ? 'check' : 'circle-outline');
    this.command = {
      command: 'minesweeper.selectDifficulty',
      title: 'Select Difficulty',
      arguments: [difficulty]
    };
  }
}

// Tree item for the online (LAN) multiplayer entry points. Kept intentionally
// small: it only references the two multiplayer commands by id, so the
// multiplayer implementation stays isolated under src/multi/.
class MultiActionTreeItem extends vscode.TreeItem {
  constructor(label: string, icon: string, command: string, tooltip: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'multiAction';
    this.iconPath = new vscode.ThemeIcon(icon);
    this.tooltip = tooltip;
    this.command = { command, title: label };
  }
}

export class MinesweeperProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private currentId: string, private lang: Lang) {}

  setCurrent(id: string): void {
    this.currentId = id;
    this._onDidChangeTreeData.fire();
  }

  setLang(lang: Lang): void {
    this.lang = lang;
    this._onDidChangeTreeData.fire();
  }

  getCurrentId(): string {
    return this.currentId;
  }

  getCurrentLang(): Lang {
    return this.lang;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (element) { return []; }
    const items: vscode.TreeItem[] = DIFFICULTIES.map(
      (d) => new DifficultyTreeItem(d, d.id === this.currentId, this.lang)
    );
    const cn = this.lang === 'cn';
    items.push(
      new MultiActionTreeItem(
        cn ? '创建房间(联机)' : 'Create Room (Online)',
        'add',
        'minesweeper.multiCreate',
        cn ? '在本机创建一个局域网联机房间' : 'Create a LAN multiplayer room on this machine'
      ),
      new MultiActionTreeItem(
        cn ? '加入房间(联机)' : 'Join Room (Online)',
        'link-external',
        'minesweeper.multiJoin',
        cn ? '输入房主 IP:端口 加入局域网房间' : 'Join a LAN room by entering the host IP:port'
      )
    );
    return items;
  }
}
