import { NextResponse } from 'next/server';
import { refineWithOpenAI } from '@/lib/llm_hybrid';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { organizedContent } = await request.json();

        if (!organizedContent) {
            return NextResponse.json({ error: 'Organized content is required' }, { status: 400 });
        }

        console.log('Step 2: Refining with OpenAI...');
        const result = await refineWithOpenAI(organizedContent);

        return NextResponse.json({ summary: result });

    } catch (error: any) {
        console.error('Step 2 Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error (Step 2)' },
            { status: 500 }
        );
    }
}
