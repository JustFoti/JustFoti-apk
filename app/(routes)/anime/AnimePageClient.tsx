'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { MALAnimeListItem } from '@/lib/services/mal-listings';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { PageTransition } from '@/components/layout/PageTransition';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { usePresenceContext } from '@/components/analytics/PresenceProvider';

interface CategoryData {
  items: MALAnimeListItem[];
  total: number;
}

interface AnimePageClientProps {
  popular: CategoryData;
  topRated: CategoryData;
  airing: CategoryData;
  action: CategoryData;
  fantasy: CategoryData;
  romance: CategoryData;
  movies: CategoryData;
}

export default function AnimePageClient({
  popular, topRated, airing, action, fantasy, romance, movies,
}: AnimePageClientProps) {
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const presenceContext = usePresenceContext();

  useEffect(() => {
    if (presenceContext?.setBrowsingContext) {
      presenceContext.setBrowsingContext('Anime');
    }
  }, []);

  const handleContentClick = useCallback((item: MALAnimeListItem, source: string) => {
    trackEvent('content_clicked', { content_id: item.mal_id, source });
    router.push(`/anime/${item.mal_id}`);
  }, [router, trackEvent]);

  const handleSearch = useCallback((query: string) => {
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}`);
  }, [router]);

  const handleSeeAll = useCallback((filter: string, genre?: string) => {
    const params = new URLSearchParams({ type: filter === 'movies' ? 'anime-movies' : 'anime' });
    if (filter && filter !== 'movies') params.set('filter', filter);
    if (genre) params.set('genre', genre);
    router.push(`/browse?${params.toString()}`);
  }, [router]);

  const contentSections = [
    { title: 'Currently Airing', data: airing, filter: 'airing', accentColor: 'pink' as const },
    { title: 'Popular Anime', data: popular, filter: 'popular', accentColor: 'fuchsia' as const },
    { title: 'Top Rated', data: topRated, filter: 'top_rated', accentColor: 'purple' as const },
    { title: 'Action', data: action, filter: '', genre: 'action', accentColor: 'red' as const },
    { title: 'Fantasy', data: fantasy, filter: '', genre: 'fantasy', accentColor: 'violet' as const },
    { title: 'Romance', data: romance, filter: '', genre: 'romance', accentColor: 'rose' as const },
    { title: 'Anime Movies', data: movies, filter: 'movies', accentColor: 'amber' as const },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0a0812] overflow-x-hidden">
        <Navigation onSearch={handleSearch} />
        <section className="relative pt-16 md:pt-20 pb-12 md:pb-16 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-black mb-3 md:mb-4">
                <span className="bg-gradient-to-r from-pink-300 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">Anime</span>
              </h1>
              <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">From shonen epics to slice-of-life gems</p>
            </motion.div>
          </div>
        </section>
        <main className="pb-20 space-y-2">
          {contentSections.filter(s => s.data?.items?.length > 0).map((section) => (
            <ContentRow key={section.title} title={section.title} data={section.data} onItemClick={handleContentClick} onSeeAll={() => handleSeeAll(section.filter, section.genre)} accentColor={section.accentColor} />
          ))}
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}


const accentColors: Record<string, { bg: string; text: string }> = {
  pink: { bg: 'bg-pink-500', text: 'text-pink-400' },
  fuchsia: { bg: 'bg-fuchsia-500', text: 'text-fuchsia-400' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-400' },
  red: { bg: 'bg-red-500', text: 'text-red-400' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-400' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-400' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-400' },
};

function ContentRow({ title, data, onItemClick, onSeeAll, accentColor = 'pink' }: { 
  title: string; data: CategoryData; onItemClick: (item: MALAnimeListItem, source: string) => void; onSeeAll: () => void; accentColor?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const colors = accentColors[accentColor] || accentColors.pink;
  if (!data?.items?.length) return null;

  return (
    <section className="py-4 md:py-6 px-3 md:px-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-3 md:mb-5">
          <button onClick={onSeeAll} className="text-base sm:text-lg md:text-2xl font-bold text-white flex items-center gap-2">
            {title} <span className={`text-xs sm:text-sm font-normal ${colors.text}`}>({data.total.toLocaleString()})</span>
          </button>
        </div>
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-4" style={{ scrollbarWidth: 'none' }}>
          {data.items.map((item) => (
            <motion.div key={item.mal_id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} onClick={() => onItemClick(item, title)} className="flex-shrink-0 w-[120px] sm:w-32 md:w-36 lg:w-44 cursor-pointer group">
              <div className="relative rounded-lg overflow-hidden bg-gray-900 shadow-lg">
                <img src={item.images?.jpg?.large_image_url || '/placeholder-poster.jpg'} alt={item.title || ''} className="w-full aspect-[2/3] object-cover" loading="lazy" />
                {(item.score ?? 0) > 0 && (
                  <div className="absolute top-1.5 right-1.5 px-1 py-0.5 bg-black/70 rounded text-[10px] font-semibold text-pink-400">
                    {item.score?.toFixed(1)}
                  </div>
                )}
              </div>
              <div className="mt-2 px-0.5">
                <h3 className="text-white font-medium text-xs sm:text-sm line-clamp-1">{item.title_english || item.title}</h3>
                <p className="text-gray-500 text-[10px] mt-0.5">{item.year || ''}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
