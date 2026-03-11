import type { Metadata, Viewport } from 'next';
import { AppProviders } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: { template: 'Saturn Dashboard — %s', default: 'Saturn Dashboard' },
  description: 'Versatile Admin Dashboard with cosmic design',
  manifest: '/manifest.json',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#0a0a18',
  width: 'device-width',
  initialScale: 1,
};

// Runs before React hydration — prevents flash of wrong theme AND accent
const initScript = `(function(){
  try {
    // Theme
    var t = localStorage.getItem('saturn_theme') || 'dark';
    var r = t === 'auto' ? (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light') : t;
    document.documentElement.setAttribute('data-theme', r);
    // Accent CSS vars
    var presets = [
      {accent:'#7c3aed',accent2:'#06b6d4',from:'#7c3aed',to:'#06b6d4'},
      {accent:'#f97316',accent2:'#f43f5e',from:'#f97316',to:'#f43f5e'},
      {accent:'#10b981',accent2:'#3b82f6',from:'#10b981',to:'#3b82f6'},
      {accent:'#f59e0b',accent2:'#f97316',from:'#f59e0b',to:'#f97316'},
      {accent:'#8b5cf6',accent2:'#ec4899',from:'#8b5cf6',to:'#ec4899'},
      {accent:'#0891b2',accent2:'#2dd4bf',from:'#0891b2',to:'#2dd4bf'},
    ];
    var idx = parseInt(localStorage.getItem('saturn_accent') || '0', 10) || 0;
    var p = presets[Math.min(idx, presets.length-1)];
    var root = document.documentElement;
    function hexRgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)].join(',')}
    root.style.setProperty('--c-accent', p.accent);
    root.style.setProperty('--c-accent2', p.accent2);
    root.style.setProperty('--c-accent-rgb', hexRgb(p.accent));
    root.style.setProperty('--c-accent2-rgb', hexRgb(p.accent2));
    root.style.setProperty('--c-gradient', 'linear-gradient(135deg,'+p.from+','+p.to+')');
    root.style.setProperty('--c-gradient-r', 'linear-gradient(to right,'+p.from+','+p.to+')');
    root.style.setProperty('--c-card-hover', 'rgba('+hexRgb(p.accent)+',0.06)');
    root.style.setProperty('--c-scroll-thumb', p.accent+'60');
    root.style.setProperty('--c-scroll-hover',  p.accent2+'80');
  } catch(e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
