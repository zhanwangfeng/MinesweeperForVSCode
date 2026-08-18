// Lightweight i18n for webview content (en / cn).
export type Lang = 'en' | 'cn';

export interface Dict {
  title: string;
  mines: string;
  time: string;
  difficulty: string;
  newGame: string;
  reset: string;
  switchLang: string;
  win: string;
  lose: string;
  flag: string;
  reveal: string;
  clickToStart: string;
  language: string;
  en: string;
  cn: string;
  currentDifficulty: string;
}

const en: Dict = {
  title: 'Minesweeper',
  mines: 'Mines',
  time: 'Time',
  difficulty: 'Difficulty',
  newGame: 'New Game',
  reset: 'Restart',
  switchLang: 'Switch Language',
  win: 'You Win! 🎉',
  lose: 'Game Over 💥',
  flag: 'Right-click / long-press to flag.',
  reveal: 'Left-click to reveal.',
  clickToStart: 'Select a difficulty on the left to start.',
  language: 'Language',
  en: 'English',
  cn: '中文',
  currentDifficulty: 'Current'
};

const cn: Dict = {
  title: '扫雷',
  mines: '雷数',
  time: '时间',
  difficulty: '难度',
  newGame: '新游戏',
  reset: '重新开始',
  switchLang: '切换语言',
  win: '你赢了！🎉',
  lose: '游戏结束 💥',
  flag: '右键 / 长按 插旗。',
  reveal: '左键 翻开。',
  clickToStart: '在左侧选择难度开始游戏。',
  language: '语言',
  en: 'English',
  cn: '中文',
  currentDifficulty: '当前'
};

export function getDict(lang: Lang): Dict {
  return lang === 'cn' ? cn : en;
}
