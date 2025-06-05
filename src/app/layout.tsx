import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ClientProvider from '@/app/providers';
import ToasterProvider from '@/app/toaster-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '詰め将棋 NFT ドロップ',
  description: 'Solanaブロックチェーン上で詰め将棋のNFTをミントするプラットフォーム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ClientProvider>
          {children}
          <ToasterProvider />
        </ClientProvider>
      </body>
    </html>
  );
}
