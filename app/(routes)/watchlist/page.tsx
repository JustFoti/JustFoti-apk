import { Metadata } from 'next';
import WatchlistPageClient from './WatchlistPageClient';

export const metadata: Metadata = {
  title: 'My Watchlist | FlyX',
  description: 'Your personal watchlist - save movies and shows to watch later',
};

export default function WatchlistPage() {
  return <WatchlistPageClient />;
}
