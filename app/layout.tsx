import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Revamp Team Placement',
  description: 'AI-assisted project placement for Revamp engineers and team leads.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
