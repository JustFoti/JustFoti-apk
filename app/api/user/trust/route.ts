/**
 * User Trust API - Get historical trust data for a user
 * 
 * GET /api/user/trust?userId=xxx
 * 
 * Returns the user's historical behavioral data including:
 * - Mouse entropy average
 * - Total samples collected
 * - Human score (0-100)
 * - First seen / last seen timestamps
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDB, getDB } from '@/lib/db/neon-connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    
    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();
    const isNeon = db.isUsingNeon();
    
    const query = isNeon
      ? `SELECT 
           user_id,
           first_seen,
           last_seen,
           mouse_entropy_avg,
           total_mouse_samples,
           total_scroll_samples,
           human_score,
           last_validation_score
         FROM user_activity 
         WHERE user_id = $1 
         LIMIT 1`
      : `SELECT 
           user_id,
           first_seen,
           last_seen,
           mouse_entropy_avg,
           total_mouse_samples,
           total_scroll_samples,
           human_score,
           last_validation_score
         FROM user_activity 
         WHERE user_id = ? 
         LIMIT 1`;
    
    const results = await adapter.query(query, [userId]);
    
    if (results.length === 0) {
      return NextResponse.json({
        found: false,
        userId,
        humanScore: 50, // Default for new users
        mouseEntropyAvg: 0,
        totalSamples: 0,
        isNewUser: true,
      });
    }
    
    const user = results[0];
    const now = Date.now();
    const accountAge = now - (user.first_seen || now);
    const daysSinceFirstSeen = accountAge / (1000 * 60 * 60 * 24);
    
    // Calculate trust level based on history
    let trustLevel: 'new' | 'low' | 'medium' | 'high' | 'verified' = 'new';
    const humanScore = user.human_score || 50;
    const totalSamples = (user.total_mouse_samples || 0) + (user.total_scroll_samples || 0);
    
    if (daysSinceFirstSeen < 1 || totalSamples < 100) {
      trustLevel = 'new';
    } else if (humanScore < 30) {
      trustLevel = 'low';
    } else if (humanScore < 60) {
      trustLevel = 'medium';
    } else if (humanScore < 80) {
      trustLevel = 'high';
    } else {
      trustLevel = 'verified';
    }
    
    return NextResponse.json({
      found: true,
      userId: user.user_id,
      humanScore,
      mouseEntropyAvg: user.mouse_entropy_avg || 0,
      totalMouseSamples: user.total_mouse_samples || 0,
      totalScrollSamples: user.total_scroll_samples || 0,
      lastValidationScore: user.last_validation_score || 0,
      firstSeen: user.first_seen,
      lastSeen: user.last_seen,
      accountAgeDays: daysSinceFirstSeen,
      trustLevel,
      isNewUser: daysSinceFirstSeen < 1,
    });
    
  } catch (error) {
    console.error('[UserTrust] Error:', error);
    return NextResponse.json({ error: 'Failed to get trust data' }, { status: 500 });
  }
}
