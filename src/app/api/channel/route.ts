import { NextResponse } from 'next/server';
import { getChannelVideos } from '@/lib/youtube';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { channelId, sortBy = 'date' } = await request.json();

        if (!channelId) {
            return NextResponse.json({ error: 'Channel ID or Handle is required' }, { status: 400 });
        }

        console.log(`Fetching videos for channel: ${channelId} (Sort: ${sortBy})`);
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
