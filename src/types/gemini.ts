export type GeminiModelType =
    | 'gemini-2.5-pro' // 安定版・高精度 (GA)
    | 'gemini-2.5-flash'; // 安定版・高速 (GA)

export interface SummaryRequest {
    url: string;
    focusPoint?: string; // 重点フォーカス機能（オプション）
    modelType?: GeminiModelType;
}
