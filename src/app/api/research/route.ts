import { NextResponse } from 'next/server';
import { searchVideos } from '@/lib/youtube';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const query = body.query || "AI副業";
        const timeRange = body.timeRange || '24h'; // '24h' or '7d'
        const isGlobal = body.isGlobal || false;

        // Calculate publishedAfter based on timeRange
        const dateLimit = new Date();
        if (timeRange === '7d') {
            dateLimit.setDate(dateLimit.getDate() - 7);
        } else {
            dateLimit.setHours(dateLimit.getHours() - 24);
        }
        const publishedAfter = dateLimit.toISOString();

        console.log(`[Research] Searching for '${query}' after ${publishedAfter} (Global: ${isGlobal})`);

        const videos = await searchVideos(query, publishedAfter, 10, isGlobal);

        return NextResponse.json({
            videos,
            query,
            count: videos.length
        });

    } catch (error: any) {
        console.error('Research API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
