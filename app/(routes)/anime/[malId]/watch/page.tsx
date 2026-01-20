import { Suspense } from 'react';
import AnimeWatchClient from './AnimeWatchClient';

export default function AnimeWatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><p className="text-white">Loading...</p></div>}>
      <AnimeWatchClient />
    </Suspense>
  );
}
