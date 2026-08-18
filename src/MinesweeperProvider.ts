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

export class MinesweeperProvider implements vscode.TreeDataProvider<DifficultyTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<DifficultyTreeItem | undefined | void>();
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

  getTreeItem(element: DifficultyTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: DifficultyTreeItem): DifficultyTreeItem[] {
    if (element) { return []; }
    return DIFFICULTIES.map(
      (d) => new DifficultyTreeItem(d, d.id === this.currentId, this.lang)
    );
  }
}
