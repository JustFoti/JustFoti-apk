'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { MALAnime } from '@/lib/services/mal';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { PageTransition } from '@/components/layout/PageTransition';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { usePresenceContext } from '@/components/analytics/PresenceProvider';

interface AnimePageClientProps {
  popular: MALAnime[];
  topRated: MALAnime[];
  action: MALAnime[];
  fantasy: MALAnime[];
  romance: MALAnime[];
}

export default function AnimePageClient({
  popular, topRated, action, fantasy, romance,
}: AnimePageClientProps) {
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const presenceContext = usePresenceContext();

  // Track browsing activity - run once on mount
  useEffect(() => {
    if (presenceContext?.setBrowsingContext) {
      presenceContext.setBrowsingContext('Anime');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContentClick = useCallback((anime: MALAnime, source: string) => {
    trackEvent('content_clicked', { content_id: anime.mal_id, source });
    router.push(`/anime/${anime.mal_id}`);
  }, [router, trackEvent]);

  const handleSearch = useCallback((query: string) => {
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}`);
  }, [router]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0a0812] overflow-x-hidden">
        <Navigation onSearch={handleSearch} />
        
        {/* Vibrant Anime Hero */}
        <section className="relative pt-16 md:pt-20 pb-12 md:pb-16 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-pink-900/20 via-purple-900/10 to-[#0a0812]" />
            <div className="absolute top-0 left-1/4 w-64 md:w-[600px] h-64 md:h-[600px] bg-pink-500/10 rounded-full blur-[180px] animate-pulse" />
            <div className="absolute top-20 right-1/3 w-48 md:w-96 h-48 md:h-96 bg-fuchsia-600/10 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-0 right-1/4 w-40 md:w-80 h-40 md:h-80 bg-violet-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 mb-4 md:mb-6 shadow-lg shadow-pink-500/30"
              >
                <span className="text-3xl md:text-4xl">🎌</span>
              </motion.div>

              <h1 className="text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-black mb-3 md:mb-4">
                <span className="bg-gradient-to-r from-pink-300 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent drop-shadow-2xl">
                  Anime
                </span>
              </h1>
              <p className="text-base md:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto px-4">
                Powered by MyAnimeList — Japanese animation at its finest
              </p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-3 md:gap-6 mt-6 md:mt-8 flex-wrap px-4"
              >
                <div className="px-3 md:px-4 py-1.5 md:py-2 bg-pink-500/10 border border-pink-500/20 rounded-full">
                  <span className="text-xs md:text-sm text-pink-400 font-medium">🔥 {popular.length} Popular</span>
                </div>
                <div className="px-3 md:px-4 py-1.5 md:py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
                  <span className="text-xs md:text-sm text-purple-400 font-medium">⭐ {topRated.length} Top Rated</span>
                </div>
              </motion.div>

            </motion.div>
          </div>
        </section>

        {/* Content Sections */}
        <main className="pb-20 space-y-2">
          <ContentRow title="🔥 Popular Anime" data={popular} onItemClick={handleContentClick} accentColor="fuchsia" />
          <ContentRow title="⭐ Top Rated" data={topRated} onItemClick={handleContentClick} accentColor="purple" />
          <ContentRow title="⚔️ Action & Adventure" data={action} onItemClick={handleContentClick} accentColor="red" />
          <ContentRow title="✨ Fantasy & Sci-Fi" data={fantasy} onItemClick={handleContentClick} accentColor="violet" />
          <ContentRow title="💕 Romance" data={romance} onItemClick={handleContentClick} accentColor="rose" />
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
}

const accentColors: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  pink: { bg: 'bg-pink-500', text: 'text-pink-400', glow: 'shadow-pink-500/50', border: 'border-pink-500/30' },
  fuchsia: { bg: 'bg-fuchsia-500', text: 'text-fuchsia-400', glow: 'shadow-fuchsia-500/50', border: 'border-fuchsia-500/30' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-400', glow: 'shadow-purple-500/50', border: 'border-purple-500/30' },
  red: { bg: 'bg-red-500', text: 'text-red-400', glow: 'shadow-red-500/50', border: 'border-red-500/30' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-400', glow: 'shadow-violet-500/50', border: 'border-violet-500/30' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-400', glow: 'shadow-rose-500/50', border: 'border-rose-500/30' },
};

function ContentRow({ 
  title, 
  data, 
  onItemClick,
  accentColor = 'pink',
}: { 
  title: string; 
  data: MALAnime[]; 
  onItemClick: (anime: MALAnime, source: string) => void;
  accentColor?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const colors = accentColors[accentColor] || accentColors.pink;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = window.innerWidth < 640 ? 280 : 600;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!data?.length) return null;

  return (
    <section className="py-4 md:py-6 px-3 md:px-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-3 md:mb-5">
          <div className="text-base sm:text-lg md:text-2xl font-bold text-white flex items-center gap-2 md:gap-3 min-h-[44px]">
            {title}
            <span className={`text-xs sm:text-sm font-normal ${colors.text}`}>({data.length})</span>
          </div>
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 md:w-9 md:h-9 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-white transition-all hover:scale-105"
            >
              ‹
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 md:w-9 md:h-9 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-white transition-all hover:scale-105"
            >
              ›
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-2 px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {data.map((anime, index) => (
            <motion.div
              key={anime.mal_id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}
              onClick={() => onItemClick(anime, title)}
              className="flex-shrink-0 w-[120px] sm:w-32 md:w-36 lg:w-44 cursor-pointer group"
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -8 }}
                className="relative rounded-lg md:rounded-xl overflow-hidden bg-gray-900 shadow-lg"
              >
                <img
                  src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                  alt={anime.title}
                  className="w-full aspect-[2/3] object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <div className={`w-10 h-10 md:w-12 md:h-12 ${colors.bg} rounded-full flex items-center justify-center shadow-lg`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {anime.score && (
                  <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 px-1 md:px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] md:text-xs font-semibold text-pink-400 flex items-center gap-0.5">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    {anime.score.toFixed(1)}
                  </div>
                )}
              </motion.div>
              <div className="mt-2 md:mt-2.5 px-0.5 md:px-1">
                <h3 className="text-white font-medium text-xs sm:text-sm line-clamp-1 group-hover:text-pink-300 transition-colors">
                  {anime.title_english || anime.title}
                </h3>
                <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5">
                  {anime.year || ''} • {anime.episodes || '?'} eps
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
