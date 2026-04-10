import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Noodles — 2D Canvas AI Chat',
  description: 'A Flowith-like 2D infinite canvas for multi-threaded AI conversations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
