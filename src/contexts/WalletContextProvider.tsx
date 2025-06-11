'use client';

import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

// カスタムスタイルのインポート
import '../styles/wallet-adapter.css';

interface Props {
  children: ReactNode;
}

export const WalletContextProvider: FC<Props> = ({ children }) => {
  // Devnetのエンドポイントを設定
  const network = WalletAdapterNetwork.Devnet;
  
  // HeliusのRPCエンドポイントを使用
  const endpoint = useMemo(() => {
    const rpcEndpoint = process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl(network);
    console.log('Using RPC endpoint:', rpcEndpoint);
    return rpcEndpoint;
  }, [network]);

  // Phantomウォレットアダプターの設定
  const wallets = useMemo(() => {
    console.log('Initializing Phantom wallet adapter');
    return [new PhantomWalletAdapter()];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true} onError={(error) => {
        console.error('ウォレットエラー:', error);
        if (error.name === 'WalletConnectionError') {
          console.log('ウォレットの接続が必要です。Phantomウォレットをインストールして接続してください。');
        } else if (error.name === 'WalletNotSelectedError') {
          console.log('ウォレットが選択されていません。');
        } else if (error.name === 'WalletNotConnectedError') {
          console.log('ウォレットが接続されていません。');
        } else if (error.name === 'WalletDisconnectedError') {
          console.log('ウォレットが切断されました。');
        }
      }}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}; 