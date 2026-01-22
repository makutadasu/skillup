export type GeminiModelType =
    | 'gemini-3-pro-preview' // 戦略分析・思考重視 (Gemini 3 Pro)
    | 'gemini-3-flash-preview' // 高速・大量要約重視 (Flash)
    | 'gemini-2.0-flash-exp' // 次世代高速モデル (Stable)
    | 'gemini-1.5-flash' // 安定版高速モデル
    | 'gemini-1.5-pro'; // 安定版高精度モデル

export interface SummaryRequest {
    url: string;
    focusPoint?: string; // 重点フォーカス機能（オプション）
    modelType?: GeminiModelType;
}
