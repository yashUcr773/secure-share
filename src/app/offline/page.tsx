import { Metadata } from 'next';
import OfflinePageClient from '@/components/OfflinePageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Offline - SecureShare',
  description: 'You are currently offline',
};

export default function OfflinePage() {
  return <OfflinePageClient />;
}
