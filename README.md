# 詰め将棋 NFT ドロップ

Solanaブロックチェーン上で詰め将棋のNFTをミントするプラットフォームです。

## 機能

- 詰め将棋のNFTミント
- Phantomウォレットとの連携
- IPFSを使用したメタデータと画像の保存
- トランザクション状態のリアルタイム監視
- ネットワーク状態の表示

## 技術スタック

- Next.js 15.3.3
- React 19
- TypeScript
- Solana Web3.js
- Metaplex SDK
- Tailwind CSS
- Pinata (IPFS)

## 開発環境のセットアップ

1. リポジトリのクローン
```bash
git clone [リポジトリURL]
cd shogi-checkmate-nft-drop
```

2. 依存関係のインストール
```bash
npm install
```

3. 環境変数の設定
`.env.local`ファイルを作成し、以下の環境変数を設定：
```
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key
```

4. 開発サーバーの起動
```bash
npm run dev
```

## デプロイ

このプロジェクトはVercelにデプロイすることを推奨します。

1. Vercelにプロジェクトをインポート
2. 環境変数を設定
3. デプロイを実行

## ライセンス

MIT

## 注意事項

- このプロジェクトはSolana Devnetで動作します
- テスト用のSOLは[Solana Faucet](https://solfaucet.com/)から取得できます
- Phantomウォレットのインストールが必要です
