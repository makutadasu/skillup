export type GeminiModelType =
    | 'gemini-3-flash-preview' // 最新・高速 (Preview)
    | 'gemini-2.5-flash'; // 安定版・高速 (GA)

export interface SummaryRequest {
    url: string;
    focusPoint?: string; // 重点フォーカス機能（オプション）
    modelType?: GeminiModelType;
}
