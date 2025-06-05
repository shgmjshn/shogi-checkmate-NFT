import { NextRequest, NextResponse } from 'next/server';
import pinataSDK from '@pinata/sdk';
import { Readable } from 'stream';

const pinata = new pinataSDK(
  process.env.NEXT_PUBLIC_PINATA_API_KEY || '',
  process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 400 }
      );
    }

    if (type === 'metadata') {
      const metadata = JSON.parse(await file.text());
      const result = await pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: {
          name: 'metadata.json',
        },
      });
      return NextResponse.json({ ipfsUrl: `ipfs://${result.IpfsHash}` });
    } else {
      // File → Buffer → Readable Stream
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const stream = Readable.from(buffer);

      const result = await pinata.pinFileToIPFS(stream, {
        pinataMetadata: {
          name: file.name,
        },
      });
      return NextResponse.json({ ipfsUrl: `ipfs://${result.IpfsHash}` });
    }
  } catch (error: any) {
    console.error('Upload error:', error, error?.message, error?.stack);
    return NextResponse.json(
      { error: 'アップロードに失敗しました', detail: error?.message },
      { status: 500 }
    );
  }
} 