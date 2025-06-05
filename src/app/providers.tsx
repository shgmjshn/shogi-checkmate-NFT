'use client';

import { WalletContextProvider } from '@/contexts/WalletContextProvider';

export default function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletContextProvider>{children}</WalletContextProvider>;
} 