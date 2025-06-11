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
  try {
    if (!walletContext.wallet?.adapter) {
      throw new Error('ウォレットが正しく接続されていません');
    }

    if (!walletContext.publicKey) {
      throw new Error('ウォレットが正しく接続されていません');
    }

    // コミットメントレベルを'finalized'に設定した新しいコネクションを作成
    const finalizedConnection = new Connection(connection.rpcEndpoint, {
      commitment: 'finalized',
      confirmTransactionInitialTimeout: 60000, // タイムアウトを60秒に延長
    });
    
    const metaplex = Metaplex.make(finalizedConnection)
      .use(walletAdapterIdentity(walletContext.wallet.adapter as WalletAdapter));

    // トランザクションの作成と署名を実行
    const { nft, response } = await metaplex.nfts().create({
      uri: metadataUri,
      name,
      symbol,
      sellerFeeBasisPoints: 0,
      isMutable: true,
    });

    console.log('Transaction created:', {
      signature: response.signature,
      timestamp: new Date().toISOString()
    });

    // トランザクションの確認を待機（finalizedコミットメントを使用）
    const confirmation = await finalizedConnection.confirmTransaction(response.signature, 'finalized');

    if (confirmation.value.err) {
      throw new Error(`トランザクションの確認に失敗しました: ${confirmation.value.err}`);
    }

    console.log('NFT minted successfully:', {
      nftAddress: nft.address.toString(),
      signature: response.signature,
      timestamp: new Date().toISOString()
    });
    return nft;
  } catch (error) {
    console.error('Minting error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
} 