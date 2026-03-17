export type GeminiModelType =
    | 'gemini-2.5-pro' // 安定版・高精度 (GA)
    | 'gemini-2.5-flash' // 安定版・高速 (GA)
    | 'gemini-3.1-pro-preview'; // 最新・最高精度 (Preview)

export interface SummaryRequest {
    url: string;
    focusPoint?: string; // 重点フォーカス機能（オプション）
    modelType?: GeminiModelType;
}
