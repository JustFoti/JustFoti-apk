import { Metadata } from 'next';
import SeriesPageClient from './SeriesPageClient';

export const metadata: Metadata = {
  title: 'TV Series | FlyX',
  description: 'Browse and stream the latest TV series on FlyX',
};

export default function SeriesPage() {
  return <SeriesPageClient />;
}
