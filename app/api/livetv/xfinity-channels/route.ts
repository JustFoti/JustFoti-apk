/**
 * Xfinity Channels API
 * 
 * Returns the list of available Xfinity-style cable channels
 * with their Stalker portal mappings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  STALKER_CHANNEL_MAPPING, 
  STALKER_CATEGORIES,
  getChannelsByCategory,
  type StalkerChannelMapping 
} from '@/app/lib/data/stalker-channel-mapping';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase();
    
    // Get all channels
    let channels: StalkerChannelMapping[] = Object.values(STALKER_CHANNEL_MAPPING);
    
    // Filter by category
    if (category && category !== 'all') {
      channels = channels.filter(ch => ch.category === category);
    }
    
    // Filter by search
    if (search) {
      channels = channels.filter(ch => 
        ch.name.toLowerCase().includes(search) ||
        ch.id.toLowerCase().includes(search)
      );
    }
    
    // Group by category for response
    const grouped = getChannelsByCategory();
    
    // Build category stats
    const categoryStats = Object.entries(STALKER_CATEGORIES).map(([id, info]) => ({
      id,
      name: info.name,
      icon: info.icon,
      count: grouped[id]?.length || 0,
    }));
    
    // Format channels for response
    const formattedChannels = channels.map(ch => ({
      id: ch.id,
      name: ch.name,
      category: ch.category,
      categoryInfo: STALKER_CATEGORIES[ch.category as keyof typeof STALKER_CATEGORIES] || { name: ch.category, icon: '📺' },
      hasEast: !!ch.east,
      hasWest: !!ch.west,
      eastName: ch.east?.name,
      westName: ch.west?.name,
      isHD: ch.east?.name?.includes('HD') || ch.east?.name?.includes('FHD') || false,
    }));
    
    return NextResponse.json({
      success: true,
      channels: formattedChannels,
      categories: categoryStats,
      stats: {
        totalChannels: Object.keys(STALKER_CHANNEL_MAPPING).length,
        totalCategories: Object.keys(STALKER_CATEGORIES).length,
      }
    });
    
  } catch (error: any) {
    console.error('Xfinity channels error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
