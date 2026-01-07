"use client";

import { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, ExternalLink, Loader2, Youtube, Play, ArrowRight, History, Layout, Trash2, Brain, Zap, TrendingUp, Search, BookOpen, Download } from 'lucide-react';
import { GeminiModelType } from '@/types/gemini';
import MermaidDiagram from '@/components/MermaidDiagram';

interface ChannelVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  url: string;
}

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  summary: string;
  date: number;
}

type TabType = 'summarize' | 'history' | 'channel' | 'research';

export default function Home() {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('summarize');

  // Main feature state
  const [url, setUrl] = useState('');
  const [focusPrompt, setFocusPrompt] = useState('');
  const [modelType, setModelType] = useState<GeminiModelType>('gemini-3-flash-preview');
  const [outputMode, setOutputMode] = useState<'report' | 'article' | 'notebook-source'>('report');
  const [result, setResult] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentThumbnail, setCurrentThumbnail] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(''); // 'gemini' | 'openai' | ''
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Channel Monitor state
  const [channelInput, setChannelInput] = useState('');
  const [channelSortBy, setChannelSortBy] = useState<'date' | 'viewCount'>('date');
  const [channelVideos, setChannelVideos] = useState<ChannelVideo[]>([]);
  const [channelName, setChannelName] = useState('');
  const [channelLoading, setChannelLoading] = useState(false);

  const [channelError, setChannelError] = useState('');
  const [channelCheckedVideos, setChannelCheckedVideos] = useState<Set<string>>(new Set());
  const [channelBatchLoading, setChannelBatchLoading] = useState(false);
  const [channelResultText, setChannelResultText] = useState('');

  // Research state
  const [researchVideos, setResearchVideos] = useState<ChannelVideo[]>([]);
  const [researchQuery, setResearchQuery] = useState('AI副業');
  const [researchTimeRange, setResearchTimeRange] = useState<'24h' | '7d'>('24h');
  const [researchIsGlobal, setResearchIsGlobal] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchResultText, setResearchResultText] = useState('');

  // Batch processing state
  const [checkedVideos, setCheckedVideos] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('notebooklm_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const saveToHistory = (item: Omit<HistoryItem, 'id' | 'date'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      date: Date.now()
    };
    const updated = [newItem, ...history].slice(0, 50); // Keep last 50
    setHistory(updated);
    localStorage.setItem('notebooklm_history', JSON.stringify(updated));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('notebooklm_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    if (confirm('履歴をすべて削除しますか？')) {
      setHistory([]);
      localStorage.removeItem('notebooklm_history');
    }
  };

  const handleProcess = async (targetUrl?: string) => {
    const processUrl = targetUrl || url;
    if (!processUrl) return;

    if (targetUrl) setUrl(targetUrl);
    setActiveTab('summarize');

    setLoading(true);
    setProgressStep('gemini');
    setError('');
    setResult('');

    try {
      // Step 1: Gemini (Extraction & Organization)
      const res1 = await fetch('/api/process/step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: processUrl,
          focusPrompt: focusPrompt,
          modelType: modelType,
          outputMode: outputMode
        }),
      });

      if (!res1.ok) {
        const data = await res1.json();
        const errorMessage = data.error || 'Failed at Step 1 (Gemini)';
        const hint = data.hint ? `\nHint: ${data.hint}` : '';
        throw new Error(errorMessage + hint);
      }

      const step1Data = await res1.json();
      const organizedContent = step1Data.organizedContent;
      setCurrentTitle(step1Data.title || '');
      setCurrentThumbnail(step1Data.thumbnail || '');

      // Step 2: OpenAI (Strategic Refinement)
      setProgressStep('openai');
      const res2 = await fetch('/api/process/step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizedContent }),
      });

      if (!res2.ok) {
        const data = await res2.json();
        throw new Error(data.error || 'Failed at Step 2 (OpenAI)');
      }

      const finalData = await res2.json();
      setResult(finalData.summary);

      // Save to history
      saveToHistory({
        url: processUrl,
        title: step1Data.title || 'Untitled',
        thumbnail: step1Data.thumbnail || '',
        summary: finalData.summary
      });

      // Scroll to result
      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err: any) {
      setError(err.message || 'An error occurred while processing');
    } finally {
      setLoading(false);
      setProgressStep('');
    }
  };

  const fetchChannelVideos = async () => {
    if (!channelInput) return;

    setChannelLoading(true);
    setChannelError('');
    setChannelVideos([]);
    setChannelCheckedVideos(new Set());
    setChannelResultText('');

    try {
      const response = await fetch('/api/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channelInput,
          sortBy: channelSortBy
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch channel');
      }

      const data = await response.json();
      setChannelVideos(data.videos);
      setChannelName(data.channelName);
    } catch (err: any) {
      setChannelError(err.message);
    } finally {
      setChannelLoading(false);
    }
  };

  const toggleChannelVideoSelection = (videoId: string) => {
    const newSet = new Set(channelCheckedVideos);
    if (newSet.has(videoId)) {
      newSet.delete(videoId);
    } else {
      newSet.add(videoId);
    }
    setChannelCheckedVideos(newSet);
  };

  const selectAllChannelVideos = () => {
    if (channelCheckedVideos.size === channelVideos.length) {
      setChannelCheckedVideos(new Set());
    } else {
      setChannelCheckedVideos(new Set(channelVideos.map(v => v.id)));
    }
  };

  const handleChannelBatchProcess = async () => {
    if (channelCheckedVideos.size === 0) return;

    setChannelBatchLoading(true);
    try {
      const targetVideos = channelVideos.filter(v => channelCheckedVideos.has(v.id));
      const urls = targetVideos.map(v => v.url);

      setChannelResultText('NotebookLM用のソースコードを生成中... (複数動画の字幕取得・要約統合)\n※動画数によっては1〜2分かかる場合があります。そのままお待ちください...');

      const response = await fetch('/api/batch-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, outputMode }),
      });

      if (!response.ok) {
        throw new Error('Batch process failed');
      }

      const data = await response.json();
      setChannelResultText(data.result);

    } catch (e: any) {
      console.error(e);
      setChannelResultText(`Error: ${e.message}`);
    } finally {
      setChannelBatchLoading(false);
    }
  };

  const handleResearch = async () => {
    setResearchLoading(true);
    setResearchVideos([]);
    setResearchResultText('');

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: researchQuery,
          timeRange: researchTimeRange,
          isGlobal: researchIsGlobal
        })
      });

      if (!response.ok) {
        let errorMessage = `HTTP Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || JSON.stringify(errorData);
        } catch (parseError) {
          // If JSON parse fails, try text
          try {
            const text = await response.text();
            if (text) errorMessage = text.slice(0, 100); // Limit length
          } catch (e) {
            // ignore
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const videos: ChannelVideo[] = data.videos;

      setResearchVideos(videos);

      // Generate Markdown List
      const timeLabel = researchTimeRange === '24h' ? '24時間以内' : '1週間以内';
      const regionLabel = researchIsGlobal ? '全世界' : '国内のみ';
      let markdown = `## 最新の「${researchQuery}」トレンド動画 (${timeLabel} / ${regionLabel})\nNow capturing top 10 trending videos for query: ${researchQuery} (${timeLabel} / ${regionLabel})\n\n`;
      if (videos.length === 0) {
        markdown += "※ 直近24時間で該当する動画は見つかりませんでした。\n";
      } else {
        videos.forEach((v, i) => {
          markdown += `${i + 1}. [${v.title}](${v.url})\n`;
          markdown += `   - View Count Sort / Published: ${new Date(v.publishedAt).toLocaleString()}\n`;
        });
        markdown += "\n### URLリスト (NotebookLM用)\n";
        videos.forEach(v => {
          markdown += `${v.url}\n`;
        });
      }

      setResearchResultText(markdown);
      setCheckedVideos(new Set()); // Reset selection

    } catch (e: any) {
      console.error(e);
      setResearchResultText(`❌ エラーが発生しました:\n${e.message}\n\n(Time: ${new Date().toLocaleTimeString()})`);
    } finally {
      setResearchLoading(false);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    const newSet = new Set(checkedVideos);
    if (newSet.has(videoId)) {
      newSet.delete(videoId);
    } else {
      newSet.add(videoId);
    }
    setCheckedVideos(newSet);
  };

  const selectAllVideos = () => {
    if (checkedVideos.size === researchVideos.length) {
      setCheckedVideos(new Set());
    } else {
      setCheckedVideos(new Set(researchVideos.map(v => v.id)));
    }
  };

  const handleBatchProcess = async () => {
    if (checkedVideos.size === 0) return;

    setBatchLoading(true);
    try {
      const targetVideos = researchVideos.filter(v => checkedVideos.has(v.id));
      const urls = targetVideos.map(v => v.url);

      setResearchResultText('NotebookLM用のソースコードを生成中... (複数動画の字幕取得・要約統合)\n※動画数によっては1〜2分かかる場合があります。そのままお待ちください...');

      const response = await fetch('/api/batch-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, outputMode }),
      });

      if (!response.ok) {
        throw new Error('Batch process failed');
      }

      const data = await response.json();
      setResearchResultText(data.result);

    } catch (e: any) {
      console.error(e);
      setResearchResultText(`Error: ${e.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  const copyToClipboard = async (textToCopy?: string) => {
    const text = textToCopy || result;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    if (!result) return;
    const element = document.createElement("a");
    const file = new Blob([result], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${currentTitle || 'summary'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setUrl(item.url);
    setResult(item.summary);
    setCurrentTitle(item.title);
    setCurrentThumbnail(item.thumbnail);
    setActiveTab('summarize');
    setTimeout(() => {
      document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handlePreFill = (targetUrl: string) => {
    setUrl(targetUrl);
    setActiveTab('summarize');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="container">
      <div className="animate-in" style={{ animationDelay: '0.1s', textAlign: 'center', marginBottom: '3rem' }}>
        <h1>Input & Notebook LM 連携ツール</h1>
        <p className="subtitle">YouTube・Web記事から抽出した知識を収益化資産へ変換。</p>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-menu animate-in" style={{ animationDelay: '0.15s' }}>
        <button
          onClick={() => setActiveTab('summarize')}
          className={`btn ${activeTab === 'summarize' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '12px', padding: '10px 20px' }}
        >
          <Sparkles size={18} /> 要約ツール
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '12px', padding: '10px 20px' }}
        >
          <History size={18} /> 履歴
        </button>
        <button
          onClick={() => setActiveTab('channel')}
          className={`btn ${activeTab === 'channel' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '12px', padding: '10px 20px' }}
        >
          <Youtube size={18} /> チャンネル監視
        </button>
        <button
          onClick={() => setActiveTab('research')}
          className={`btn ${activeTab === 'research' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '12px', padding: '10px 20px' }}
        >
          <TrendingUp size={18} /> 自動リサーチ 🔎
        </button>
        <a
          href="https://notebooklm.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ borderRadius: '12px', padding: '10px 20px', textDecoration: 'none', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ExternalLink size={18} /> NotebookLM
        </a>
      </div>

      {/* Main Extractor Section */}
      {activeTab === 'summarize' && (
        <div className="animate-in">
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0' }}>
                対象URL (YouTube / note / Web記事)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#94a3b8', fontSize: '0.9rem' }}>
                重点フォーカス機能 (オプション)
              </label>
              <textarea
                className="glass-input"
                placeholder="例：この動画のマーケティング手法に特に注目して要約して / 未経験者向けのポイントを抽出して"
                value={focusPrompt}
                onChange={(e) => setFocusPrompt(e.target.value)}
                style={{ minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 500, color: '#94a3b8', fontSize: '0.9rem' }}>
                AIモデル選択 (Gemini 3 シリーズ)
              </label>
              <div className="grid-2">
                <div
                  className={`glass-panel hover-scale ${modelType === 'gemini-3-flash-preview' ? 'selected-model' : ''}`}
                  onClick={() => setModelType('gemini-3-flash-preview')}
                  style={{ padding: '12px', cursor: 'pointer', border: modelType === 'gemini-3-flash-preview' ? '2px solid var(--primary)' : undefined }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Zap size={16} color="#3b82f6" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Gemini 3 Flash</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', margin: 0 }}>高速・大量要約に最適</p>
                </div>
                <div
                  className={`glass-panel hover-scale ${modelType === 'gemini-3-pro-preview' ? 'selected-model' : ''}`}
                  onClick={() => setModelType('gemini-3-pro-preview')}
                  style={{ padding: '12px', cursor: 'pointer', border: modelType === 'gemini-3-pro-preview' ? '2px solid var(--accent)' : undefined }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Brain size={16} color="#a78bfa" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Gemini 3 Pro (Deep Think)</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', margin: 0 }}>深い戦略分析・思考重視</p>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 500, color: '#94a3b8', fontSize: '0.9rem' }}>
                  出力フォーマット
                </label>
                <div className="grid-3">
                  <div
                    className={`glass-panel hover-scale ${outputMode === 'report' ? 'selected-model' : ''}`}
                    onClick={() => setOutputMode('report')}
                    style={{ padding: '12px', cursor: 'pointer', border: outputMode === 'report' ? '2px solid var(--primary)' : undefined }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Layout size={16} color="#3b82f6" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>資産化レポート</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', margin: 0 }}>ポイント要約 + マネタイズ案</p>
                  </div>
                  <div
                    className={`glass-panel hover-scale ${outputMode === 'article' ? 'selected-model' : ''}`}
                    onClick={() => setOutputMode('article')}
                    style={{ padding: '12px', cursor: 'pointer', border: outputMode === 'article' ? '2px solid var(--accent)' : undefined }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Brain size={16} color="#a78bfa" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>深堀り解説記事</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', margin: 0 }}>約3,000文字の有料note下書き</p>
                  </div>
                  <div
                    className={`glass-panel hover-scale ${outputMode === 'notebook-source' ? 'selected-model' : ''}`}
                    onClick={() => setOutputMode('notebook-source')}
                    style={{ padding: '12px', cursor: 'pointer', border: outputMode === 'notebook-source' ? '2px solid #10b981' : undefined }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <BookOpen size={16} color="#10b981" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>NotebookLMソース</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', margin: 0 }}>純粋学習・事実のみ抽出</p>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => handleProcess()}
                disabled={loading || !url}
              >
                {loading ? (
                  <>
                    <Loader2 className="loading-spinner" />
                    <span>
                      {progressStep === 'gemini' ? 'Geminiが情報を整理中...' : 'OpenAIが戦略を立案中...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>抽出・要約を実行 (Gemini 3)</span>
                  </>
                )}
              </button>

              {error && (
                <div style={{ marginTop: '1rem', color: '#ef4444', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  ⚠️ {error}
                </div>
              )}
            </div>

            {/* Result Section */}
            {result && (
              <div id="result-section" className="glass-panel animate-in" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                    {currentThumbnail && (
                      <img
                        src={currentThumbnail}
                        alt=""
                        style={{ width: '120px', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--glass-border)' }}
                      />
                    )}
                    <div>
                      <h2 style={{ marginBottom: '4px', fontSize: '1.25rem' }}>資産化レポート</h2>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--secondary)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {currentTitle}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={downloadTxt}
                      style={{ fontSize: '0.9rem', padding: '8px 16px', flexShrink: 0 }}
                      title="テキストファイルとしてダウンロード"
                    >
                      <Download size={16} /> .txt
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => copyToClipboard()}
                      style={{ fontSize: '0.9rem', padding: '8px 16px', flexShrink: 0 }}
                    >
                      {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                      {copied ? 'コピー完了' : 'コピーする'}
                    </button>
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <textarea
                    className="glass-input"
                    readOnly
                    value={result}
                    style={{
                      minHeight: '600px',
                      fontFamily: 'monospace',
                      lineHeight: 1.6,
                      fontSize: '0.95rem',
                      borderColor: copied ? '#10b981' : undefined
                    }}
                  />
                </div>

                <div style={{ marginTop: '1rem', marginBottom: '2rem', fontSize: '0.9rem', color: 'var(--secondary)' }}>
                  👉 このテキストをコピーして、NotebookLMのソースとして貼り付けてください。
                </div>

                {/* Diagram Section */}
                {(() => {
                  const match = result.match(/```mermaid\n([\s\S]*?)\n```/);
                  if (match && match[1]) {
                    return <MermaidDiagram code={match[1]} />;
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        </div>
      )
      }

      {/* History Tab */}
      {
        activeTab === 'history' && (
          <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>要約履歴</h2>
              {history.length > 0 && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', color: '#ef4444' }}
                  onClick={clearHistory}
                >
                  <Trash2 size={14} /> 履歴をクリア
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--secondary)' }}>
                履歴がありません。まずはURLを要約してみましょう。
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="glass-panel hover-scale"
                    style={{ overflow: 'hidden', cursor: 'pointer', padding: 0 }}
                    onClick={() => loadFromHistory(item)}
                  >
                    <div style={{ position: 'relative', paddingTop: '56.25%', background: '#1e293b' }}>
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ExternalLink size={32} color="#475569" />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '1rem', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                          {item.title}
                        </h3>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-icon"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: 'var(--primary)', flexShrink: 0 }}
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>
                          {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          className="btn-icon"
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          style={{ color: '#ef4444', opacity: 0.6 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      {/* Channel Monitor Section */}
      {
        activeTab === 'channel' && (
          <div className="glass-panel animate-in" style={{ padding: '2rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Youtube color="#ef4444" /> チャンネル最新動画監視
            </h2>
            <p style={{ color: 'var(--secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              チャンネルIDまたはハンドル（例: @username）を入力して、最新の動画リストから直接要約を実行できます。
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <button
                  onClick={() => setChannelSortBy('date')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    background: channelSortBy === 'date' ? 'var(--primary)' : 'transparent',
                    color: channelSortBy === 'date' ? 'white' : 'var(--secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                >
                  最新動画 (10件)
                </button>
                <button
                  onClick={() => setChannelSortBy('viewCount')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    background: channelSortBy === 'viewCount' ? 'var(--accent)' : 'transparent',
                    color: channelSortBy === 'viewCount' ? 'white' : 'var(--secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                >
                  人気の動画 (10選)
                </button>
              </div>
            </div>

            <div className="input-group">
              <input
                type="text"
                className="glass-input"
                placeholder="チャンネルID または @handle"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
              />
              <button
                className="btn btn-secondary"
                onClick={fetchChannelVideos}
                disabled={channelLoading || !channelInput}
                style={{ minWidth: '100px' }}
              >
                {channelLoading ? <Loader2 className="loading-spinner" /> : '取得'}
              </button>
            </div>

            {channelError && (
              <div style={{ marginBottom: '1rem', color: '#ef4444', fontSize: '0.9rem' }}>{channelError}</div>
            )}

            {channelResultText && (
              <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.3)', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => copyToClipboard(channelResultText)}
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    <Copy size={14} /> Markdownをコピー
                  </button>
                </div>
                <textarea
                  className="glass-input"
                  readOnly
                  value={channelResultText}
                  style={{ minHeight: '300px', fontSize: '0.9rem', fontFamily: 'monospace' }}
                />
              </div>
            )}

            {channelVideos.length > 0 && (
              <div className="animate-in">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#94a3b8' }}>
                  {channelName} の{channelSortBy === 'date' ? '最新動画' : '人気動画'}
                </h3>

                <div className="toolbar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={channelCheckedVideos.size === channelVideos.length && channelVideos.length > 0}
                      onChange={selectAllChannelVideos}
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      すべて選択 ({channelCheckedVideos.size}/{channelVideos.length})
                    </span>
                  </div>
                  <select
                    className="glass-input"
                    value={outputMode}
                    onChange={(e) => setOutputMode(e.target.value as any)}
                    style={{ fontSize: '0.85rem', padding: '8px', width: 'auto', marginRight: '8px', cursor: 'pointer' }}
                  >
                    <option value="notebook-source">NotebookLMソース</option>
                    <option value="report">資産化レポート</option>
                    <option value="article">深堀り解説記事</option>
                  </select>
                  <button
                    className="btn btn-primary"
                    onClick={handleChannelBatchProcess}
                    disabled={channelBatchLoading || channelCheckedVideos.size === 0}
                    style={{ fontSize: '0.85rem', padding: '8px 16px', background: channelBatchLoading ? '#cbd5e1' : undefined }}
                  >
                    {channelBatchLoading ? <Loader2 className="loading-spinner" size={16} /> : <Sparkles size={16} />}
                    {channelBatchLoading ? '生成中...' : '一括生成を実行'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {channelVideos.map((video) => {
                    const isChecked = channelCheckedVideos.has(video.id);
                    return (
                      <div
                        key={video.id}
                        style={{
                          background: isChecked ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0,0,0,0.2)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: isChecked ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                          position: 'relative',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => toggleChannelVideoSelection(video.id)}
                      >
                        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }} // Handled by parent div click
                            style={{ transform: 'scale(1.5)', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                        </div>

                        <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isChecked ? 0.8 : 1 }}
                          />
                        </div>
                        <div style={{ padding: '12px' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', lineHeight: 1.4, height: '40px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {video.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginBottom: '12px' }}>
                            {new Date(video.publishedAt).toLocaleDateString()}
                          </div>
                          <button
                            className="btn btn-secondary"
                            style={{ width: '100%', fontSize: '0.85rem', padding: '8px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreFill(video.url);
                            }}
                          >
                            <Sparkles size={14} /> この動画のみ要約（設定へ）
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* Research Tab */}
      {
        activeTab === 'research' && (
          <div className="glass-panel animate-in" style={{ padding: '2rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp color="#10b981" /> トレンド自動収集
            </h2>
            <p style={{ color: 'var(--secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              指定したキーワードに関する直近24時間の動画を再生数順に自動取得し、NotebookLM用リストを収集します。
            </p>

            <div className="grid-2-1-1" style={{ marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0' }}>
                  検索キーワード
                </label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="例: AI副業, ChatGPT, 資産運用"
                  value={researchQuery}
                  onChange={(e) => setResearchQuery(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0' }}>
                  対象期間
                </label>
                <select
                  className="glass-input"
                  value={researchTimeRange}
                  onChange={(e) => setResearchTimeRange(e.target.value as '24h' | '7d')}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="24h">24時間 (Daily)</option>
                  <option value="7d">1週間 (Weekly)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0' }}>
                  対象エリア
                </label>
                <select
                  className="glass-input"
                  value={researchIsGlobal ? 'global' : 'domestic'}
                  onChange={(e) => setResearchIsGlobal(e.target.value === 'global')}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="domestic">国内 (JP)</option>
                  <option value="global">世界 (Global)</option>
                </select>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleResearch}
              disabled={researchLoading || !researchQuery}
              style={{ width: '100%', marginBottom: '2rem' }}
            >
              {researchLoading ? <Loader2 className="loading-spinner" /> : <><Search size={18} /> 自動リサーチを実行</>}
            </button>

            {researchResultText && (
              <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => copyToClipboard(researchResultText)}
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    <Copy size={14} /> Markdownをコピー
                  </button>
                </div>
                <textarea
                  className="glass-input"
                  readOnly
                  value={researchResultText}
                  style={{ minHeight: '300px', fontSize: '0.9rem', fontFamily: 'monospace' }}
                />
              </div>
            )}

            {researchVideos.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <div className="toolbar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={checkedVideos.size === researchVideos.length && researchVideos.length > 0}
                      onChange={selectAllVideos}
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      すべて選択 ({checkedVideos.size}/{researchVideos.length})
                    </span>
                  </div>
                  <select
                    className="glass-input"
                    value={outputMode}
                    onChange={(e) => setOutputMode(e.target.value as any)}
                    style={{ fontSize: '0.85rem', padding: '8px', width: 'auto', marginRight: '8px', cursor: 'pointer' }}
                  >
                    <option value="notebook-source">NotebookLMソース</option>
                    <option value="report">資産化レポート</option>
                    <option value="article">深堀り解説記事</option>
                  </select>
                  <button
                    className="btn btn-primary"
                    onClick={handleBatchProcess}
                    disabled={batchLoading || checkedVideos.size === 0}
                    style={{ fontSize: '0.85rem', padding: '8px 16px', background: batchLoading ? '#cbd5e1' : undefined }}
                  >
                    {batchLoading ? <Loader2 className="loading-spinner" size={16} /> : <Sparkles size={16} />}
                    {batchLoading ? '生成中...' : '一括生成を実行'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {researchVideos.map((video) => {
                    const isChecked = checkedVideos.has(video.id);
                    return (
                      <div
                        key={video.id}
                        style={{
                          background: isChecked ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0,0,0,0.2)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: isChecked ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                          position: 'relative',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => toggleVideoSelection(video.id)}
                      >
                        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }} // Handled by parent div click
                            style={{ transform: 'scale(1.5)', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                        </div>

                        <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isChecked ? 0.8 : 1 }}
                          />
                        </div>
                        <div style={{ padding: '12px' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', lineHeight: 1.4, height: '40px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {video.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginBottom: '12px' }}>
                            {new Date(video.publishedAt).toLocaleDateString()}
                          </div>
                          <button
                            className="btn btn-secondary"
                            style={{ width: '100%', fontSize: '0.85rem', padding: '8px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreFill(video.url);
                            }}
                          >
                            <Sparkles size={14} /> この動画のみ要約（設定へ）
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )
      }
    </main >
  );
}
