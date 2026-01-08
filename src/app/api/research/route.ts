import { NextResponse } from 'next/server';
import { searchVideos } from '@/lib/youtube';
import { searchNoteByHashtag } from '@/lib/note';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const query = body.query || "AI副業";
        const timeRange = body.timeRange || '24h'; // '24h' or '7d'
        const isGlobal = body.isGlobal || false;
        const source = body.source || 'youtube'; // 'youtube', 'note', 'mixed'

        // Calculate publishedAfter based on timeRange
        const dateLimit = new Date();
        if (timeRange === '7d') {
            dateLimit.setDate(dateLimit.getDate() - 7);
        } else {
            dateLimit.setHours(dateLimit.getHours() - 24);
        }
        const publishedAfter = dateLimit.toISOString();

        console.log(`[Research] Searching for '${query}' after ${publishedAfter} (Global: ${isGlobal}, Source: ${source})`);

        let videos: any[] = [];
        const promises = [];

        if (source === 'youtube' || source === 'mixed') {
            promises.push(searchVideos(query, publishedAfter, 10, isGlobal).then(res => res.map(v => ({ ...v, type: 'youtube' }))));
        }

        if (source === 'note' || source === 'mixed') {
            // Note doesn't support "publishedAfter" filter in RSS easily (we get latest 25).
            // We can filter manually after fetch.
            promises.push(searchNoteByHashtag(query).then(items => items.map(item => ({
                id: item.url,
                title: item.title,
                thumbnail: item.thumbnail,
                publishedAt: item.publishedAt,
                url: item.url,
                type: 'note'
            }))));
        }

        const results = await Promise.all(promises);
        videos = results.flat();

        // Sort by date descending if mixed (since viewCount isn't available for Note)
        if (source === 'mixed') {
            videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        }

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
