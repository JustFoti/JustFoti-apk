import { Metadata } from 'next';
import MoviesPageClient from './MoviesPageClient';

export const metadata: Metadata = {
  title: 'Movies | FlyX',
  description: 'Browse and stream the latest movies on FlyX',
};

export default function MoviesPage() {
  return <MoviesPageClient />;
}
