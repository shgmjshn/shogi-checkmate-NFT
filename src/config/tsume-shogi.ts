export interface TsumeShogiNFT {
  id: number;
  name: string;
  description: string;
  imagePath: string;
  difficulty: '初心者' | '初級者' | '中級者';
  moves: number;
  solution: string;
}

export const tsumeShogiNFTs: TsumeShogiNFT[] = [
  {
    id: 1,
    name: '初級詰め将棋 #1',
    description: '1手詰めの基本的な詰まし方である頭金です。',
    imagePath: '/images/tsume-shogi/tsume-1.jpg',
    difficulty: '初心者',
    moves: 1,
    solution: '5二金まで',
  },
  {
    id: 2,
    name: '初級詰め将棋 #2',
    description: '基本的な詰まし方である肩金です。',
    imagePath: '/images/tsume-shogi/tsume-2.jpg',
    difficulty: '初心者',
    moves: 1,
    solution: '2二金まで',
  },
  // 必要に応じて追加の詰め将棋を設定
  {
    id: 3,
    name: '初級詰め将棋 #3',
    description: '基本的な詰まし方である腹金です。',
    imagePath: '/images/tsume-shogi/tsume-3.jpg',
    difficulty: '初心者',
    moves: 1,
    solution: '2二金まで',
  },
]; 