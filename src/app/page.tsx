'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import { uploadToIPFS, createMetadata, mintNFT } from '@/utils/nft';
import { toast } from 'react-hot-toast';
import { tsumeShogiNFTs, TsumeShogiNFT } from '@/config/tsume-shogi';
import Image from 'next/image';

interface NetworkStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  slot: number | null;
  blockHeight: number | null;
  lastBlockTime: number | null;
  error: string | null;
}

export default function Home() {
  const walletContext = useWallet();
  const { publicKey, wallet, connecting, connected, disconnecting } = walletContext;
  const { connection } = useConnection();
  const [isMinting, setIsMinting] = useState<number | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'disconnecting'>('disconnected');
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    status: 'healthy',
    slot: null,
    blockHeight: null,
    lastBlockTime: null,
    error: null,
  });

  // ネットワーク状態の監視
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkNetworkStatus = async () => {
      try {
        // スロット情報の取得
        const slot = await connection.getSlot('processed');
        
        // ブロック高さの取得
        const blockHeight = await connection.getBlockHeight('processed');
        
        // 最新のブロック時間の取得
        const blockTime = await connection.getBlockTime(slot);

        // ネットワークの健全性を判断
        let status: NetworkStatus['status'] = 'healthy';
        let error: string | null = null;

        if (!blockTime) {
          status = 'degraded';
          error = 'ブロック時間の取得に遅延があります';
        }

        // ブロック時間が30秒以上前の場合
        if (blockTime && Date.now() / 1000 - blockTime > 30) {
          status = 'degraded';
          error = 'ブロックの生成が遅延しています';
        }

        setNetworkStatus({
          status,
          slot,
          blockHeight,
          lastBlockTime: blockTime,
          error,
        });
      } catch (error) {
        console.error('Network status check failed:', error);
        setNetworkStatus(prev => ({
          ...prev,
          status: 'unhealthy',
          error: 'ネットワークの状態確認に失敗しました',
        }));
      }
    };

    // 初回実行
    checkNetworkStatus();

    // 5秒ごとに状態を更新
    intervalId = setInterval(checkNetworkStatus, 5000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [connection]);

  // ウォレット接続状態の監視
  useEffect(() => {
    if (connecting) {
      setWalletStatus('connecting');
      setWalletError(null);
    } else if (disconnecting) {
      setWalletStatus('disconnecting');
    } else if (connected && wallet) {
      setWalletStatus('connected');
      setWalletError(null);
    } else {
      setWalletStatus('disconnected');
    }
  }, [connecting, disconnecting, connected, wallet]);

  // ウォレット接続エラーのハンドリング
  useEffect(() => {
    const handleError = (error: Error) => {
      console.error('Wallet error:', error);
      if (error.message.includes('ユーザーがリクエストを拒否しました')) {
        setWalletError('ウォレットの接続が拒否されました。もう一度お試しください。');
      } else if (error.message.includes('Wallet not found')) {
        setWalletError('Phantomウォレットがインストールされていません。');
      } else if (error.message.includes('ブロックハッシュが無効')) {
        setWalletError('ウォレットの接続が不安定です。再接続してください。');
      } else {
        setWalletError(`ウォレットエラー: ${error.message}`);
      }
    };

    const handleDisconnect = () => {
      console.log('Wallet disconnected');
      setWalletStatus('disconnected');
      setWalletError('ウォレットが切断されました。再接続してください。');
    };

    window.addEventListener('error', (event) => handleError(event.error));
    wallet?.adapter?.on('disconnect', handleDisconnect);

    return () => {
      window.removeEventListener('error', (event) => handleError(event.error));
      wallet?.adapter?.off('disconnect', handleDisconnect);
    };
  }, [wallet]);

  useEffect(() => {
    console.log('Wallet connection status:', {
      connected,
      publicKey: publicKey?.toString(),
      timestamp: new Date().toISOString()
    });
  }, [connected, publicKey]);

  const handleMint = async (tsumeShogi: TsumeShogiNFT) => {
    if (!publicKey || !wallet) {
      toast.error('ウォレットを接続してください');
      return;
    }

    if (walletStatus !== 'connected') {
      toast.error('ウォレットの接続が不安定です。再接続してください。');
      return;
    }

    let toastId: string | undefined;
    let metadataUri: string | null = null;

    try {
      // ミント開始前にウォレットの接続状態を再確認
      if (!wallet.adapter.connected) {
        throw new Error('ウォレットの接続が切れました。再接続してください。');
      }

      setIsMinting(tsumeShogi.id);
      toastId = toast.loading('NFTをミント中...');

      // 画像をIPFSにアップロード
      console.log('Fetching image from:', tsumeShogi.imagePath);
      const response = await fetch(tsumeShogi.imagePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log('Image blob size:', blob.size);
      const file = new File([blob], `tsume-${tsumeShogi.id}.jpg`, { type: 'image/jpeg' });
      console.log('Created file:', file.name, 'size:', file.size);
      const imageUrl = await uploadToIPFS(file);
      toast.success('画像のアップロードが完了しました', { id: toastId });

      // メタデータを作成
      metadataUri = await createMetadata(
        tsumeShogi.name,
        tsumeShogi.description,
        imageUrl,
        [
          { trait_type: 'Category', value: '詰め将棋' },
          { trait_type: 'Difficulty', value: tsumeShogi.difficulty },
          { trait_type: 'Moves', value: tsumeShogi.moves.toString() },
        ]
      );
      toast.success('メタデータの作成が完了しました', { id: toastId });

      // メタデータの生成が完了したら、すぐにミントを開始
      if (metadataUri) {
        // NFTをミント
        const nft = await mintNFT(
          connection,
          walletContext,
          metadataUri,
          tsumeShogi.name,
          'TSHOGI'
        );

        toast.success('NFTのミントが完了しました！', { id: toastId });
        console.log('Minted NFT:', nft);
      } else {
        throw new Error('メタデータの生成に失敗しました');
      }
    } catch (error) {
      console.error('Minting error:', error);
      if (toastId) {
        const errorMessage = error instanceof Error ? error.message : 'ミント中にエラーが発生しました';
        if (errorMessage.includes('ブロックハッシュが無効')) {
          toast.error('トランザクションの有効期限が切れました。もう一度お試しください。', { id: toastId });
        } else if (errorMessage.includes('ウォレットの接続が切れました')) {
          setWalletStatus('disconnected');
          toast.error('ウォレットの接続が切れました。再接続してください。', { id: toastId });
        } else {
          toast.error(errorMessage, { id: toastId });
        }
      } else {
        toast.error('ミント中にエラーが発生しました');
      }
    } finally {
      setIsMinting(null);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">詰め将棋 NFT ドロップ</h1>
        
        {/* ネットワーク状態の表示 */}
        <div className="mb-4 p-3 rounded-lg text-center">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            networkStatus.status === 'healthy' ? 'bg-green-100 text-green-800' :
            networkStatus.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            <span className="mr-2">●</span>
            {networkStatus.status === 'healthy' ? 'ネットワーク正常' :
             networkStatus.status === 'degraded' ? 'ネットワーク遅延' :
             'ネットワーク異常'}
          </div>
          {networkStatus.error && (
            <div className="mt-2 text-sm text-gray-600">
              {networkStatus.error}
            </div>
          )}
          <div className="mt-2 text-sm text-gray-600">
            {networkStatus.slot && `スロット: ${networkStatus.slot.toLocaleString()}`}
            {networkStatus.blockHeight && ` | ブロック高さ: ${networkStatus.blockHeight.toLocaleString()}`}
            {networkStatus.lastBlockTime && ` | 最終ブロック: ${new Date(networkStatus.lastBlockTime * 1000).toLocaleTimeString()}`}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-full max-w-xs">
            <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 w-full" />
          </div>
          {walletStatus !== 'connected' && (
            <div className={`p-3 rounded-lg text-center w-full max-w-xs ${
              walletStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
              walletStatus === 'disconnecting' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {walletStatus === 'connecting' ? 'ウォレットを接続中...' :
               walletStatus === 'disconnecting' ? 'ウォレットを切断中...' :
               walletError || 'ウォレットを接続してください'}
            </div>
          )}
          {!wallet && (
            <div className="text-yellow-600 bg-yellow-100 p-3 rounded-lg text-center w-full max-w-xs">
              <p className="mb-2">Phantomウォレットがインストールされていません。</p>
              <a 
                href="https://phantom.app/download" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-block"
              >
                Phantomをインストール
              </a>
            </div>
          )}
        </div>

        {publicKey && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tsumeShogiNFTs.map((tsumeShogi) => (
              <div key={tsumeShogi.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="relative w-full h-64">
                  <Image
                    src={tsumeShogi.imagePath}
                    alt={tsumeShogi.name}
                    width={400}
                    height={400}
                    className="object-contain w-full h-full"
                    priority={tsumeShogi.id <= 3}
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2">{tsumeShogi.name}</h2>
                  <p className="text-gray-600 mb-4">{tsumeShogi.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {tsumeShogi.difficulty}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {tsumeShogi.moves}手詰め
                    </span>
                  </div>
                  <button
                    onClick={() => handleMint(tsumeShogi)}
                    disabled={isMinting === tsumeShogi.id}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isMinting === tsumeShogi.id ? 'ミント中...' : 'ミントする'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
