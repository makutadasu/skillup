import { NextResponse } from 'next/server';
import { getChannelVideos } from '@/lib/youtube';
import { getNoteUserRSS } from '@/lib/note';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { channelId, sortBy = 'date' } = await request.json();

        if (!channelId) {
            return NextResponse.json({ error: 'Channel ID or Handle is required' }, { status: 400 });
        }

        console.log(`Fetching videos for channel: ${channelId} (Sort: ${sortBy})`);

        // Check if it is a Note URL
        if (channelId.includes('note.com')) {
            const { channelName, items } = await getNoteUserRSS(channelId);
            // Map items to match ChannelVideo interface (they are already compatible but explicit mapping is safe)
            const serializedItems = items.map(item => ({
                id: item.url, // Use URL as ID for note
                title: item.title,
                thumbnail: item.thumbnail,
                publishedAt: item.publishedAt,
                url: item.url
            }));
            return NextResponse.json({ channelName, videos: serializedItems });
        }

        const data = await getChannelVideos(channelId, sortBy);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Channel API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch channel videos' },
            { status: 500 }
        );
    }
}
