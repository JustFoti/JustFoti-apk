/**
 * Curated anime categories for the anime browse page
 * 
 * These are manually curated MAL IDs for high-quality anime.
 * Update seasonally or when new popular anime releases.
 * 
 * Last updated: January 2026
 */

export interface AnimeCategory {
  id: string;
  name: string;
  description: string;
  malIds: number[];
}

export const ANIME_CATEGORIES: AnimeCategory[] = [
  {
    id: 'popular',
    name: 'Popular Now',
    description: 'Currently trending anime',
    malIds: [
      40748,  // Jujutsu Kaisen
      51009,  // Jujutsu Kaisen S2
      57658,  // Jujutsu Kaisen S3
      52299,  // Solo Leveling
      58567,  // Solo Leveling S2
      38000,  // Demon Slayer
      47778,  // Demon Slayer S2
      51019,  // Demon Slayer S3
      16498,  // Attack on Titan
      25777,  // Attack on Titan S2
      35760,  // Attack on Titan S3
      40028,  // Attack on Titan Final
      31964,  // My Hero Academia
      33486,  // My Hero Academia S2
      36456,  // My Hero Academia S3
      38408,  // My Hero Academia S4
      41587,  // My Hero Academia S5
      49918,  // My Hero Academia S6
      50265,  // Spy x Family
      53887,  // Spy x Family S2
    ],
  },
  {
    id: 'top-rated',
    name: 'Top Rated',
    description: 'Highest rated anime of all time',
    malIds: [
      5114,   // Fullmetal Alchemist: Brotherhood
      9253,   // Steins;Gate
      11061,  // Hunter x Hunter (2011)
      820,    // Ginga Eiyuu Densetsu
      1535,   // Death Note
      28977,  // Gintama°
      38524,  // Shingeki no Kyojin Season 3 Part 2
      9969,   // Gintama'
      32281,  // Kimi no Na wa
      37510,  // Mob Psycho 100 II
    ],
  },
  {
    id: 'action',
    name: 'Action',
    description: 'High-octane action anime',
    malIds: [
      40748,  // Jujutsu Kaisen
      16498,  // Attack on Titan
      31964,  // My Hero Academia
      38000,  // Demon Slayer
      11061,  // Hunter x Hunter
      820,    // Ginga Eiyuu Densetsu
      1535,   // Death Note
    ],
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Magical and fantastical worlds',
    malIds: [
      51009,  // Jujutsu Kaisen S2
      38000,  // Demon Slayer
      11061,  // Hunter x Hunter
      9253,   // Steins;Gate
      5114,   // Fullmetal Alchemist: Brotherhood
    ],
  },
  {
    id: 'romance',
    name: 'Romance',
    description: 'Heartwarming love stories',
    malIds: [
      50265,  // Spy x Family
      9253,   // Steins;Gate
      28977,  // Gintama°
      37510,  // Mob Psycho 100 II
    ],
  },
];

/**
 * Get MAL IDs for a specific category
 */
export function getCategoryIds(categoryId: string): number[] {
  const category = ANIME_CATEGORIES.find(c => c.id === categoryId);
  return category?.malIds || [];
}

/**
 * Get all unique MAL IDs across all categories
 */
export function getAllUniqueIds(): number[] {
  const allIds = ANIME_CATEGORIES.flatMap(c => c.malIds);
  return [...new Set(allIds)];
}
