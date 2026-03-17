
import { NextResponse } from 'next/server';
import { getYoutubeTranscript } from '@/lib/youtube';
import { processWithGemini } from '@/lib/llm_hybrid';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow longer execution time

export async function POST(request: Request) {
    try {
        const { urls, outputMode = 'notebook-source' } = await request.json();

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: 'Valid URLs array is required' }, { status: 400 });
        }

        console.log(`[Batch] Processing ${urls.length} videos... Mode: ${outputMode}`);

        // Process videos in parallel
        const results = await Promise.all(urls.map(async (url: string) => {
            try {
                // 1. Get Transcript
                console.log(`[Batch] Fetching transcript for: ${url}`);
                const data = await getYoutubeTranscript(url);

                if (!data || !data.content) {
                    return `## [Error] ${url}\nTranscript not found or empty.`;
                }

                // 2. Summarize for NotebookLM
                // Using Flash model for speed
                console.log(`[Batch] Summarizing: ${data.title}`);

                let focusPrompt = 'NotebookLMのソースとして客観的な事実を中心に抽出してください。';
                if (outputMode === 'report') {
                    focusPrompt = 'マネタイズの観点から、収益化に繋がる重要なポイントを抽出してください。';
                } else if (outputMode === 'article') {
                    focusPrompt = '読者が深い学びを得られるよう、背景知識や具体的なアクションを含めて解説してください。';
                }

                const summary = await processWithGemini(
                    data.content,
                    'youtube',
                    focusPrompt,
                    'gemini-3-flash-preview',
                    url,
                    outputMode
                );

                return summary;

            } catch (error: any) {
                console.error(`[Batch] Error processing ${url}:`, error);
                return `## [Error] ${url}\nFailed to process: ${error.message}`;
            }
        }));

        // Combine all results
        const combinedMarkdown = `# NotebookLM Source Collection\nGenerated at: ${new Date().toLocaleString()}\n\n---\n\n` + results.join('\n\n---\n\n');

        return NextResponse.json({
            result: combinedMarkdown,
            count: urls.length,
            successCount: results.filter(r => !r.startsWith('## [Error]')).length
        });

    } catch (error: any) {
        console.error('Batch Process Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error (Batch)' },
            { status: 500 }
        );
    }
}
