import OpenAI from 'openai';

export async function generateSummary(title: string, content: string) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API Key is not configured.');
    }

    // Initialize OpenAI client
    // Note: This requires OPENAI_API_KEY environment variable
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // Truncate content if too long (basic protection, though GPT-4o has 128k context)
    const maxLength = 100000;
    const truncatedContent = content.length > maxLength ? content.substring(0, maxLength) + "..." : content;

    const prompt = `
あなたはプロのコンテンツ要約者です。以下のテキスト（動画の字幕またはWeb記事）を読み込み、指定されたフォーマットで出力してください。

# 入力情報
タイトル: ${title}
本文: ${truncatedContent}

# 出力フォーマット
出力は以下のMarkdown形式で記述してください。余計な前置きや挨拶は不要です。

## タイトル
[ここにタイトルを記載]

## 3行サマリー
- [要点1]
- [要点2]
- [要点3]

## NotebookLM用詳細ソース
（ここはNotebookLMが読み込みやすいよう、論理構造を明確にした詳細な要約を記述してください。見出し、箇条書きを活用し、元の文脈や重要なディテール（数値、固有名詞、具体的なエピソード）を漏らさないようにしてください。）

## 今日のアクション
（このコンテンツから学べる、制作・ビジネス現場で今すぐ試すべき具体的なアクションアイテムを1〜3つ記述してください。）
`;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: prompt }],
            model: "gpt-4o",
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to generate summary with AI.');
    }
}
