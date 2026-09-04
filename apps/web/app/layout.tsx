import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '../components/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'UNICOM University', template: '%s | UNICOM University' },
  description: 'UNICOM University learning management application',
  referrer: 'no-referrer',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
