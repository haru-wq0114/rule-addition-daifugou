import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SocketProvider } from '@/app/components/providers/SocketProvider';

export const metadata: Metadata = {
  title: 'ルール追加大富豪',
  description: 'ルールを追加しながら遊ぶ大富豪カードゲーム',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
