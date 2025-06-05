import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';
import { Connection } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import type { WalletAdapter } from '@solana/wallet-adapter-base';

// トランザクションサイズの制限（バイト単位）
const MAX_TRANSACTION_SIZE = 1232; // Solanaのトランザクションサイズ制限

// 画像をIPFSにアップロード
export async function uploadToIPFS(file: File): Promise<string> {
  try {
    console.log('Uploading file to IPFS:', file.name);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'file');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('アップロードに失敗しました');
    }

    const data = await response.json();
    console.log('Upload successful, URL:', data.ipfsUrl);
    return data.ipfsUrl;
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw error;
  }
}

// NFTのメタデータを作成
export async function createMetadata(
  name: string,
  description: string,
  imageUrl: string,
  attributes: { trait_type: string; value: string }[] = []
) {
  const metadata = {
    name,
    description,
    image: imageUrl,
    attributes,
  };

  try {
    const formData = new FormData();
    formData.append('file', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('type', 'metadata');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('メタデータのアップロードに失敗しました');
    }

    const data = await response.json();
    return data.ipfsUrl;
  } catch (error) {
    console.error('Metadata upload error:', error);
    throw error;
  }
}

// NFTをミント
export async function mintNFT(
  connection: Connection,
  walletContext: ReturnType<typeof useWallet>,
  metadataUri: string,
  name: string,
  symbol: string
) {
  let retryCount = 0;
  let lastBlockhash: string | null = null;
  let lastValidBlockHeight: number | null = null;

  try {
    if (!walletContext.wallet?.adapter) {
      throw new Error('ウォレットが正しく接続されていません');
    }

    // コミットメントレベルを'processed'に設定した新しいコネクションを作成
    const processedConnection = new Connection(connection.rpcEndpoint, {
      commitment: 'processed',
      confirmTransactionInitialTimeout: 30000,
      wsEndpoint: connection.rpcEndpoint.replace('https', 'wss'),
    });
    
    const metaplex = Metaplex.make(processedConnection)
      .use(walletAdapterIdentity(walletContext.wallet.adapter as WalletAdapter));

    // トランザクションの作成と署名を実行（retryロジックを追加）
    const maxRetries = 3;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        // トランザクション作成前に最新のブロックハッシュを取得
        const { blockhash, lastValidBlockHeight: height } = 
          await processedConnection.getLatestBlockhash('processed');
        lastBlockhash = blockhash;
        lastValidBlockHeight = height;
        
        console.log(`Attempt ${retryCount + 1}: Using blockhash:`, blockhash, 'at height:', height);

        if (!lastBlockhash || !lastValidBlockHeight) {
          throw new Error('ブロックハッシュ情報が取得できませんでした');
        }

        // トランザクションの作成と署名を即時実行
        const { nft, response } = await metaplex.nfts().create({
          uri: metadataUri,
          name,
          symbol,
          sellerFeeBasisPoints: 0,
          isMutable: true,
        });

        // トランザクションの確認を待機（より短いタイムアウト）
        const confirmation = await processedConnection.confirmTransaction({
          signature: response.signature,
          blockhash: lastBlockhash,
          lastValidBlockHeight,
        }, 'processed');

        if (confirmation.value.err) {
          throw new Error(`トランザクションの確認に失敗しました: ${confirmation.value.err}`);
        }

        // トランザクションの最終確認（より短い間隔で試行）
        let status = null;
        let confirmed = false;
        const startTime = Date.now();
        const timeout = 10000; // 10秒のタイムアウト

        while (Date.now() - startTime < timeout) {
          status = await processedConnection.getSignatureStatus(response.signature, {
            searchTransactionHistory: true,
          });
          
          if (status.value && !status.value.err) {
            confirmed = true;
            break;
          }
          
          // より短い間隔で確認
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!confirmed || status?.value?.err) {
          throw new Error(`トランザクションの最終確認に失敗しました: ${status?.value?.err || 'タイムアウト'}`);
        }

        // トランザクションの詳細を取得
        const txInfo = await processedConnection.getTransaction(response.signature, {
          maxSupportedTransactionVersion: 0
        });

        if (txInfo) {
          // トランザクションの詳細をログ出力
          console.log('Transaction details:', {
            signature: response.signature,
            timestamp: new Date().toISOString(),
            slot: txInfo.slot,
            blockTime: txInfo.blockTime,
            fee: txInfo.meta?.fee,
            err: txInfo.meta?.err,
            computeUnits: txInfo.meta?.computeUnitsConsumed,
            accounts: txInfo.meta?.loadedAddresses,
            logs: txInfo.meta?.logMessages?.slice(0, 3)
          });

          // トランザクションのサイズに関する警告
          if (txInfo.meta?.computeUnitsConsumed && txInfo.meta.computeUnitsConsumed > 200000) {
            console.warn('Transaction compute units warning:', {
              computeUnits: txInfo.meta.computeUnitsConsumed,
              message: 'トランザクションの計算量が高い可能性があります'
            });
          }
        }

        console.log('NFT minted successfully:', {
          nftAddress: nft.address.toString(),
          signature: response.signature,
          timestamp: new Date().toISOString()
        });
        return nft;
      } catch (error) {
        lastError = error as Error;
        console.error(`Mint attempt ${retryCount + 1} failed:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          blockhash: lastBlockhash,
          height: lastValidBlockHeight,
          timestamp: new Date().toISOString(),
        });
        
        if (error instanceof Error && 
            (error.message.includes('ブロックハッシュが無効') || 
             error.message.includes('Transaction simulation failed')) && 
            retryCount < maxRetries - 1) {
          retryCount++;
          // 次の試行前に少し待機（より短い時間）
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error('NFTのミントに失敗しました');
  } catch (error) {
    console.error('Minting error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      retryCount,
      blockhash: lastBlockhash,
      height: lastValidBlockHeight,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
} 