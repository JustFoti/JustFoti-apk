import { Suspense } from 'react';
import { Metadata } from 'next';
import WatchPageClient from './WatchPageClient';

export const metadata: Metadata = {
  title: 'Watch - Flyx',
  description: 'Stream your favorite movies and TV shows',
};

export default function WatchPage() {
  return (
    <Suspense fallback={<div>Loading player...</div>}>
      <WatchPageClient />
    </Suspense>
  );
}
