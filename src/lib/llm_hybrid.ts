import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiModelType } from '@/types/gemini';

// --- Gemini Single Mode: All-in-one Strategic Processing ---
export async function processWithGemini(
    rawText: string,
    contextType: 'youtube' | 'web',
    focusPoint?: string,
    modelType: GeminiModelType = 'gemini-3-flash-preview',
    url?: string, // Optional URL if we want Gemini to use its grounding/access
    outputMode: 'report' | 'article' | 'notebook-source' = 'report' // New parameter for output control
) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel(
        {
            model: modelType,
            generationConfig: {
                temperature: 0.2, // Stable extraction
                topP: 0.95,
            },
            tools: [
                {
                    // @ts-ignore - Support Google Search Grounding
                    googleSearch: {},
                },
            ],
        },
        {
            apiVersion: "v1beta", // Stable v1beta for Pro/Flash models
        }
    );

    // --- Prompts ---

    // 1. Report Mode (Standard)
    const reportPrompt = `
あなたは「個人の知的資産を最大化し、収益化に繋げる戦略家」です。
提供された${contextType === 'youtube' ? '字幕データ' : 'Web記事'}から、以下の2段構成で「マネタイズ資産」としてのレポートを出力してください。

# 重点フォーカス事項
${focusPoint || "特になし"}

# 思考のプロトコル
- 常に「個人のマネタイズ」を最優先の視点とすること。
- NotebookLMが読み取りやすいよう、構造化されたMarkdown形式を維持すること。
- 冗長な挨拶は省き、即座に以下のフォーマットで回答を開始すること。

# 出力フォーマット（厳守）

## ■ セクション1：内容のまとめ（Quick Summary）
※10秒で全体を把握するための要約。
- **3行要約:** 内容の本質を極限まで凝縮。
- **重要トピック:** 抽出した事実やデータ（3〜5点）。

## ■ セクション2：個人マネタイズ特化の構造化（Monetization Asset）
※NotebookLMへのインプットおよび収益化に直結する資産化フォーマット。

### ① 資産の本質（Core Value）
- この情報が解決できる悩みと、提供できるベネフィット。

### ② 独自の知識抽出（Key Insights）
- 再現性のあるノウハウ、または「あなた独自の視点」となるエッセンス。

### ③ マネタイズ・アングル（Monetization Ideas）
- 具体的な販売・収益化案（有料note, 独自教材, コンサル転用など）。
- **※重要**: 一般的すぎる案だけでなく、必ず「デジタルコンテンツとして完結する販売モデル」や「AIが苦手な層へのニッチな解決策」を1つ以上含めること。

### ④ コンテンツ・フック（Content Hooks）
- SNS（X/Instagram）やブログで引きの強いキャッチコピー3案。

### ⑤ メタデータ (NotebookLM用)
- 知識連結用のタグ（例：#収益化 #AI戦略 #心理学 など）。

### ⑥ 即実行リスト (Immediate Action)
- 今日中にできる「1円以上の価値を生む」具体的なアクション。

### ⑦ 詳細な内容まとめ (Detailed Content Summary)
- 手順・論理構造・ノウハウを詳細に。読んだだけで対象の全体像が完全に理解できるレベル。

### ⑧ 構造図解 (Structural Diagram)
- コンテンツ全体を構造化して理解するための図解を、Mermaid.js形式で作成してください。
- エラーを防ぐため、**必ず \`graph TD\` (フローチャート)** を使用してください。複雑な図解（mindmap等）は避けてください。
- **重要:** ノード内のテキストは必ず二重引用符で囲んでください（例: A["テキスト"]）。これによりSyntax Errorを防げます。
- カッコ \`()\` や \`[]\` などの特殊文字をラベル内で使う場合は、必ずクォートしてください。
- 必ず \`\`\`mermaid\n ... \n\`\`\` のコードブロックで囲んで出力してください。
    `;

    // 2. Article Mode (Deep Analysis / Paid Note Draft)
    const articlePrompt = `
あなたはプロの「トップ編集者兼テクニカルライター」です。
提供された${contextType === 'youtube' ? '字幕データ' : 'Web記事'}を元に、そのまま**「有料note」の下書きとして使える3,000文字程度の深堀り解説記事**を作成してください。
単なる「要約」ではありません。読者が「お金を払ってでも読みたい」と感じる深い洞察と、論理的な構成が必要です。

# 執筆方針
- **文体:** "です・ます"調。知的で、かつ親しみやすいプロフェッショナルなトーン。
- **ターゲット:** 向上心が高く、具体的なアクションや深い学びを求めているビジネスパーソン・クリエイター。
- **コンテンツの深さ:** 表面的な情報をなぞるのではなく、「なぜそうなるのか」「具体的にどうすればいいのか」というWhyとHowを極限まで深掘りしてください。コンテキスト（背景知識）が不足している場合は、あなたの知識で補完してください。
- **構成:** 読者の関心を惹きつけ、納得させ、行動させるストーリーテリングを意識してください。

# 重点フォーカス事項
${focusPoint || "特になし"}

# 出力構成（Markdown形式）

## タイトル
（読者が思わずクリックしたくなる、ベネフィットが明確で引きの強いタイトル）

## 1. はじめに：なぜ今、これが重要なのか
- 読者の現状の悩みや、世の中のトレンドへのフック。
- この記事を読むことで得られる具体的なメリット（Before/After）。

## 2. [本論1] コア・コンセプトの解像度を上げる
- 提示されている情報の「本質」は何なのか。
- 単なる事実の羅列ではなく、構造的な理解を促す解説。

## 3. [本論2] 実践のための具体的なメソッド
- 実際に読者がアクションに移すための手順や、注意すべき落とし穴。
- 成功の鍵となる「微差（ニュアンス）」の言語化。

## 4. [本論3] 視座を高める（応用・展開）
- この知識を他の分野に応用するには？
- 長期的な視点で見たときの価値とは？（マネタイズやキャリアへの影響）

## 5. おわりに：明日からのアクション
- 読者の背中を押す、熱量のあるメッセージ。
- 具体的なNext Step。

---
※記事として読みやすく、見出しや強調（ボールド）を効果的に使ってください。
※文字数は3,000文字程度を目安に、充実した（スカスカではない）内容に仕上げてください。
    `;

    // 3. Notebook Source Mode (Raw Structure / Objective Summary)
    const notebookSourcePrompt = `
あなたは「AIナレッジベース構築のためのデータアナリスト」です。
提供された${contextType === 'youtube' ? '字幕データ' : 'Web記事'}から、NotebookLM等のRAGシステムが知識ソースとして最適に利用できる形式で要約を行ってください。

# 目的
- 複数の動画/記事の内容をNotebookLMに取り込ませるための、高密度かつ構造化されたテキストソースを作成すること。
- 余計な解釈や提案（マネタイズ案など）は含めず、**「事実」「論点」「具体的なノウハウ」「固有名詞」**を正確に抽出すること。

# 重点フォーカス事項
${focusPoint || "特になし"}

# 出力フォーマット（Markdown形式）
※以下の形式で出力してください。挨拶などは不要です。

## [タイトル] (動画/記事タイトル)

### 概要 (Executive Summary)
- このコンテンツが扱っている主題と結論（3行程度）

### 重要なポイント (Key Takeaways)
- (箇条書きで5〜10点。重要な事実、数値、主張を網羅的に)

### 詳細な内容 (Deep Dive)
- 文脈がわかるように、論理構造に沿って内容を詳述する。
- 固有名詞やツール名、ステップバイステップの手順などは漏らさず記述する。

### 関連キーワード/タグ
- (検索やリンクに役立つキーワード)

### 🎙️ NotebookLM用：対談スクリプト (Audio Overview Script)
- このコンテンツの内容について、**「辛口の批評家（懐疑的）」**と**「情熱的な実践者（楽観的）」**の2人が激論を交わすような対話スクリプトを作成してください。
- "Audio Overview"機能が、より深く、記憶に残る音声コンテンツを生成するための「種」となるスクリプトです。
- 単調な解説ではなく、反論や鋭い指摘、それに対する熱いリプライなどを交えて、ドラマチックに展開してください。
    `;

    const systemPrompt = `
${outputMode === 'article' ? articlePrompt : (outputMode === 'notebook-source' ? notebookSourcePrompt : reportPrompt)}

---
# 解析対象
${url ? `対象URL: ${url}\n` : ''}
解析用テキスト: ${rawText}
    `;

    try {
        console.log(`[Gemini 3.0] Processing with ${modelType} (Grounding enabled, Mode: ${outputMode})...`);
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error('Gemini API Error:', error);
        const detailedError = error.message || 'Unknown Gemini API Error';
        throw new Error(`Gemini Error: ${detailedError}`);
    }
}

/**
 * [OpenAI Quota Check Temporary Bypass]
 * Geminiシングルモードへの切り替え中のため、この関数は入力をそのまま返します。
 * OpenAIの残高を戻した際は、以前のロジックに戻すことでハイブリッド運用を再開できます。
 */
export async function refineWithOpenAI(organizedText: string) {
    console.log('[Info] OpenAI execution bypassed. Returning Gemini refined result.');
    return organizedText;
}
