import React, { useState, useEffect } from 'react';
import { whiteboardMcpServer } from '../mcp/whiteboardMcpServer';
import { Terminal, Play, RotateCcw, X, Eye, ChevronUp, ChevronDown } from 'lucide-react';

export const WhiteboardMcpDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState(whiteboardMcpServer.getLogs());
  const [activeTab, setActiveTab] = useState<'tools' | 'logs'>('tools');
  const [stateViewerJson, setStateViewerJson] = useState<string | null>(null);

  useEffect(() => {
    const unsub = whiteboardMcpServer.subscribeLogs(() => {
      setLogs(whiteboardMcpServer.getLogs());
    });
    return unsub;
  }, []);

  const handleTestTrigonometry = async () => {
    // 1. Clear board via MCP
    await whiteboardMcpServer.callTool('clear_board');

    // 2. Draw right-angled triangle via MCP
    await whiteboardMcpServer.callTool('draw_geometry', {
      shape: 'right_triangle',
      x: 100,
      y: 120,
      base: 320,
      height: 220,
      color: 'light-blue',
      labels: {
        hypotenuse: 'Hypotenuse (c)',
        opposite: 'Opposite (b)',
        adjacent: 'Adjacent (a)',
        angle: 'θ',
      },
    });

    // 3. Write trigonometric ratios formula via MCP
    await whiteboardMcpServer.callTool('write_formula', {
      title: 'Trigonometric Ratios for Angle θ',
      formula: 'sin(θ) = Opposite / Hypotenuse = b / c\ncos(θ) = Adjacent / Hypotenuse = a / c\ntan(θ) = Opposite / Adjacent = b / a\n\nPythagorean Theorem: a² + b² = c²',
      x: 540,
      y: 120,
      width: 480,
      height: 220,
      color: 'yellow',
    });
  };

  const handleTestGetState = async () => {
    const result = await whiteboardMcpServer.callTool('get_board_state');
    if (result.content && result.content[0]?.text) {
      setStateViewerJson(result.content[0].text);
      setActiveTab('logs');
    }
  };

  const handleClear = async () => {
    await whiteboardMcpServer.callTool('clear_board');
  };

  const tools = whiteboardMcpServer.listTools();

  return (
    <>
      {/* Floating Toggle Button (Bottom-Right, non-intrusive) */}
      <div className="absolute bottom-20 right-4 z-30">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1d2024]/90 hover:bg-[#282a2f] border border-[#44474f]/50 text-slate-300 hover:text-white shadow-xl backdrop-blur-md text-xs font-mono transition-all cursor-pointer"
          title="Toggle Whiteboard MCP Server Console"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>MCP Server</span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Slide-out MCP Panel */}
      {isOpen && (
        <div className="absolute bottom-32 right-4 z-40 w-96 max-h-[500px] rounded-3xl bg-[#17191e]/95 border border-[#44474f]/60 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Header */}
          <div className="p-3.5 border-b border-[#44474f]/40 flex items-center justify-between bg-[#111318]/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-bold text-white font-['Outfit']">Whiteboard MCP Server</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                v1.0.0
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-[#282a2f] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Switcher & Quick Actions */}
          <div className="px-3 py-2 border-b border-[#44474f]/30 flex items-center justify-between bg-[#111318]/30">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('tools')}
                className={`px-2.5 py-1 rounded-lg font-mono transition-colors cursor-pointer ${
                  activeTab === 'tools' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tools ({tools.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`px-2.5 py-1 rounded-lg font-mono transition-colors cursor-pointer ${
                  activeTab === 'logs' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                JSON-RPC Logs ({logs.length})
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg bg-[#282a2f] hover:bg-[#37393e] text-slate-300 hover:text-white cursor-pointer transition-colors"
                title="Clear board via MCP"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Tab 1: Tools & Quick Test Runner */}
          {activeTab === 'tools' && (
            <div className="p-3 overflow-y-auto space-y-3 flex-1">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                  Quick Agent Actions (Run MCP Tools)
                </span>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={handleTestTrigonometry}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold flex items-center justify-between cursor-pointer shadow-md transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5" />
                      <span>Draw Trigonometry Problem</span>
                    </span>
                    <span className="text-[10px] font-mono opacity-80">draw_geometry</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestGetState}
                    className="w-full py-2 px-3 rounded-xl bg-[#282a2f] hover:bg-[#37393e] text-slate-200 font-semibold flex items-center justify-between cursor-pointer border border-[#44474f]/40 transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      <span>Read Board State</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">get_board_state</span>
                  </button>
                </div>
              </div>

              {/* Tools List */}
              <div className="space-y-2 pt-2 border-t border-[#44474f]/30">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                  Registered MCP Tools
                </span>
                <div className="space-y-1.5">
                  {tools.map((t) => (
                    <div
                      key={t.name}
                      className="p-2 rounded-xl bg-[#111318] border border-[#44474f]/30 space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-sky-300 font-bold">{t.name}</span>
                        <span className="text-[9px] text-slate-500">tool</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{t.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Logs & State Viewer */}
          {activeTab === 'logs' && (
            <div className="p-3 overflow-y-auto space-y-2 flex-1 font-mono text-[11px]">
              {stateViewerJson && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-blue-500/40 space-y-1.5 mb-2">
                  <div className="flex items-center justify-between text-sky-300 font-bold">
                    <span>Latest Board State</span>
                    <button
                      type="button"
                      onClick={() => setStateViewerJson(null)}
                      className="hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <pre className="text-[10px] text-slate-300 overflow-x-auto max-h-36 whitespace-pre-wrap">
                    {stateViewerJson}
                  </pre>
                </div>
              )}

              {logs.length === 0 ? (
                <div className="text-slate-500 italic text-center py-6">No MCP tool calls logged yet.</div>
              ) : (
                logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-[#111318] border border-[#44474f]/30 space-y-0.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{log.timestamp}</span>
                      <span
                        className={`font-bold ${log.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {log.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="font-bold text-cyan-300">{log.method}</div>
                    <pre className="text-[10px] text-slate-400 truncate">
                      {JSON.stringify(log.payload)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
