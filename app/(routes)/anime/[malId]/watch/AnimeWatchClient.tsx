'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { malService } from '@/lib/services/mal';
import type { MALAnime } from '@/lib/services/mal';

const MobileVideoPlayer = dynamic(
  () => import('@/components/player/MobileVideoPlayer'),
  { ssr: false }
);

export default function AnimeWatchClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const malId = parseInt(params.malId as string);
  const episode = parseInt(searchParams.get('episode') || '1');
  
  const [anime, setAnime] = useState<MALAnime | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnime() {
      const data = await malService.getById(malId);
      setAnime(data);
      setLoading(false);
    }
    loadAnime();
  }, [malId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Loading anime...</p>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Anime not found</p>
      </div>
    );
  }

  // Build stream URL - pass MAL ID and episode directly
  const streamUrl = `/api/stream/extract?malId=${malId}&episode=${episode}&provider=animekai`;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 p-4">
          <h1 className="text-2xl font-bold text-white">{anime.title}</h1>
          <p className="text-gray-400">Episode {episode}</p>
        </div>
        
        <MobileVideoPlayer
          tmdbId={String(malId)}
          mediaType="tv"
          season={1}
          episode={episode}
          title={anime.title}
          streamUrl={streamUrl}
        />
      </div>
    </div>
  );
}
