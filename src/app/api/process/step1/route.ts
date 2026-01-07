import { NextResponse } from 'next/server';
import { getYoutubeTranscript } from '@/lib/youtube';
import { scrapeWebPage } from '@/lib/scraper';
import { processWithGemini } from '@/lib/llm_hybrid';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { url, focusPrompt, modelType, outputMode } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        let extractedData;
        const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
        const type = isYoutube ? 'youtube' : 'web';

        // 1. Extract Content
        if (isYoutube) {
            console.log('Step 1: Processing YouTube URL:', url);
            extractedData = await getYoutubeTranscript(url);
        } else {
            console.log('Step 1: Processing Web URL:', url);
            extractedData = await scrapeWebPage(url);
        }

        if (!extractedData) {
            return NextResponse.json({ error: 'Extracted data is null' }, { status: 400 });
        }

        if (!extractedData.content) {
            return NextResponse.json({
                error: `Content is empty for ${type}. (Title: ${extractedData.title || 'Unknown'})`,
                hint: 'If it is YouTube, try checking if the video exists and is public.'
            }, { status: 400 });
        }

        // 2. Process with Gemini
        console.log(`Step 1: Sending to Gemini (${modelType || 'default'})...`);
        const organizedContent = await processWithGemini(extractedData.content, type, focusPrompt, modelType, url, outputMode);

        return NextResponse.json({
            organizedContent,
            title: extractedData.title,
            thumbnail: extractedData.thumbnail
        });

    } catch (error: any) {
        console.error('Step 1 Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error (Step 1)' },
            { status: 500 }
        );
    }
}
