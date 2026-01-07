export type GeminiModelType =
    | 'gemini-3-pro-preview' // 戦略分析・思考重視 (Gemini 3 Pro)
    | 'gemini-3-flash-preview';            // 高速・大量要約重視 (Flash)

export interface SummaryRequest {
    url: string;
    focusPoint?: string; // 重点フォーカス機能（オプション）
    modelType?: GeminiModelType;
}
