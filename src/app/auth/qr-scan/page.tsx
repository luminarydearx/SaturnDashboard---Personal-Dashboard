import QRScanClient from './QRScanClient';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'QR Login — Saturn Dashboard' };
export default function QRScanPage() { return <QRScanClient />; }
