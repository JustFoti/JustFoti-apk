import { Metadata } from 'next';
import LiveTVClient from './LiveTVClient';

export const metadata: Metadata = {
  title: 'Live TV - Flyx | 850+ Channels',
  description: 'Watch 850+ live TV channels including sports, news, entertainment, and more. Stream live events, matches, and shows ad-free on Flyx.',
  keywords: ['live tv', 'streaming', 'sports', 'news', 'entertainment', 'live channels', 'flyx'],
  openGraph: {
    title: 'Live TV - Flyx | 850+ Channels',
    description: 'Watch 850+ live TV channels including sports, news, entertainment, and more. Stream live events ad-free.',
    url: 'https://tv.vynx.cc/livetv',
    siteName: 'Flyx 2.0',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live TV - Flyx | 850+ Channels',
    description: 'Watch 850+ live TV channels including sports, news, entertainment, and more. Stream live events ad-free.',
  },
};

export default function LiveTVPage() {
  return <LiveTVClient />;
}
