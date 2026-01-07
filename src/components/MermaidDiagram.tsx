"use client";
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Maximize2, Minimize2, Download } from 'lucide-react';

// Initialize mermaid
// Initialize mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif',
    themeVariables: {
        fontSize: '20px',
        noteFontSize: '20px',
    }
});

interface MermaidDiagramProps {
    code: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code }) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<boolean>(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (code) {
            const renderDiagram = async () => {
                try {
                    setError(false);
                    // Unique ID for each render to prevent conflicts
                    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

                    // Render diagram
                    const { svg } = await mermaid.render(id, code);
                    setSvg(svg);
                } catch (err) {
                    console.error('Mermaid render error:', err);
                    setError(true);
                }
            };

            renderDiagram();
        }
    }, [code]);

    const downloadSvg = () => {
        if (!svg) return;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'summary-diagram.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (error) return null;

    return (
        <div
            className={`glass-panel animate-in ${isExpanded ? 'diagram-expanded' : ''}`}
            style={{
                position: isExpanded ? 'fixed' : 'relative',
                top: isExpanded ? 0 : 'auto',
                left: isExpanded ? 0 : 'auto',
                width: isExpanded ? '100vw' : '100%',
                height: isExpanded ? '100vh' : 'auto',
                zIndex: isExpanded ? 1000 : 1,
                margin: isExpanded ? 0 : '2rem 0',
                padding: '1rem',
                backgroundColor: isExpanded ? 'rgba(15, 23, 42, 0.95)' : '#1e293b', // Ensure 100% opacity (no transparency) for visibility
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--glass-border)',
            }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--glass-border)',
                paddingBottom: '0.5rem'
            }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🧠 構造図解 (Auto-Generated)</span>
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn-icon"
                        onClick={downloadSvg}
                        title="Download SVG"
                        style={{ color: '#fff' }}
                    >
                        <Download size={18} />
                    </button>
                    <button
                        className="btn-icon"
                        onClick={() => setIsExpanded(!isExpanded)}
                        title={isExpanded ? "Close Fullscreen" : "Fullscreen"}
                        style={{ color: '#fff' }}
                    >
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>

            <div
                style={{
                    flex: 1,
                    overflow: 'auto',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: isExpanded ? 'calc(100vh - 80px)' : '300px',
                }}
            >
                {svg ? (
                    <div
                        dangerouslySetInnerHTML={{ __html: svg }}
                        style={{
                            width: '100%',
                            textAlign: 'center',
                            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                        }}
                    />
                ) : (
                    <div style={{ color: 'var(--secondary)' }}>Generating diagram...</div>
                )}
            </div>
        </div>
    );
};

export default MermaidDiagram;
