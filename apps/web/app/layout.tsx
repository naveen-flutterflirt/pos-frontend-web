import type { Metadata } from 'next';
import './globals.css';
import { OutletProvider } from '../context/OutletContext';

export const metadata: Metadata = {
  title: 'BizBox Console — Admin & Operations Management',
  description: 'Enterprise POS multi-outlet management, menu, inventory and GST reporting.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-100 flex">
        <OutletProvider>{children}</OutletProvider>
      </body>
    </html>
  );
}

