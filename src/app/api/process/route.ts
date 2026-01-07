import { NextResponse } from 'next/server';
import { getYoutubeTranscript } from '@/lib/youtube';
import { scrapeWebPage } from '@/lib/scraper';
import { generateSummary } from '@/lib/llm';

export const runtime = 'nodejs'; // Ensure Node.js runtime for cheerio/openai

export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        let extractedData;

        // Determine if YouTube
        const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');

        if (isYoutube) {
            console.log('Processing YouTube URL:', url);
            extractedData = await getYoutubeTranscript(url);
        } else {
            console.log('Processing Web URL:', url);
            extractedData = await scrapeWebPage(url);
        }

        if (!extractedData || !extractedData.content) {
            return NextResponse.json({ error: 'Failed to extract content' }, { status: 400 });
        }

        console.log('Content extracted, length:', extractedData.content.length);
        console.log('Title:', extractedData.title);

        const summary = await generateSummary(extractedData.title, extractedData.content);

        return NextResponse.json({ summary });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
