import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';

// ── Title template: "Saturn Dashboard — <Page Name>" ──────────────────────
export const metadata: Metadata = {
  title: {
    template: 'Saturn Dashboard — %s',
    default:  'Saturn Dashboard',
  },
  description: 'Versatile Admin Dashboard with cosmic design',
  manifest: '/manifest.json',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#0a0a18',
  width: 'device-width',
  initialScale: 1,
};

// Inline script: apply saved theme BEFORE paint — avoid flash
const themeScript = `
(function(){
  try{
    var t=localStorage.getItem('saturn_theme')||'dark';
    var r=t==='auto'?(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):t;
    document.documentElement.setAttribute('data-theme',r);
  }catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
