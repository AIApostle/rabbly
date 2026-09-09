import React, { useState, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  UploadCloud,
  FileText,
  Users,
  User,
  Zap,
  Mic,
  Layout,
  X
} from 'lucide-react';

interface IntakeHeroProps {
  onStartLesson: (topic: string, isClassroom: boolean, file?: File | null) => void;
}

export const IntakeHero: React.FC<IntakeHeroProps> = ({ onStartLesson }) => {
  const [topicPrompt, setTopicPrompt] = useState('');
  const [isClassroom, setIsClassroom] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presetTopics = [
    {
      title: 'Transformers & Self-Attention',
      desc: 'How LLMs attend to context and compute embeddings',
      icon: '🧠',
      key: 'transformers',
    },
    {
      title: 'Quantum Superposition & Entanglement',
      desc: 'Qubits, Hadamard gates, and Bell states',
      icon: '⚛️',
      key: 'quantum',
    },
    {
      title: 'Distributed Rate Limiter (System Design)',
      desc: 'Token bucket algorithms with Redis and Lua',
      icon: '⚡',
      key: 'rate-limiter',
    },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setUploadedFile(file);
      if (!topicPrompt) {
        setTopicPrompt(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadedFile(file);
      if (!topicPrompt) {
        setTopicPrompt(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicPrompt.trim()) return;
    onStartLesson(topicPrompt.trim(), isClassroom, uploadedFile);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-[#0b0f19]">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      <div className="absolute top-1/3 left-1/4 w-[420px] h-[420px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[130px] pointer-events-none -z-10"></div>

      {/* Nav Brand Header */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/30">
            🐰
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Rabbly
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Agentic Tutor
              </span>
            </h1>
            <p className="text-xs text-slate-400">Real-time voice & interactive whiteboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Powered by Gemini Live</span>
          </div>
        </div>
      </div>

      {/* Hero Headline */}
      <div className="text-center max-w-3xl mb-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Interactive Blackboard Teaching Experience</span>
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Learn anything with an AI tutor that{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            talks & draws live
          </span>
          .
        </h2>
        <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Type a topic or upload your syllabus. Rabbly prepares structured notes, launches the whiteboard, and explains concepts visually while speaking in real time.
        </p>
      </div>

      {/* Main Intake Form Container */}
      <div className="w-full max-w-2xl glass-panel rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-700/80 backdrop-blur-2xl bg-slate-900/90 relative">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Prompt Input Bar */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              What do you want to learn?
            </label>
            <div className="relative">
              <input
                type="text"
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                placeholder="e.g., Explain Transformer Attention mechanisms from scratch..."
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 rounded-2xl px-5 py-4 text-base text-white placeholder-slate-500 shadow-inner focus:outline-none transition-all pr-12"
              />
              <button
                type="submit"
                disabled={!topicPrompt.trim()}
                className="absolute right-2.5 top-2.5 bottom-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-95"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preset Chips */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
              Popular topics to try:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {presetTopics.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    setTopicPrompt(preset.title);
                  }}
                  className="p-3 rounded-xl bg-slate-800/60 hover:bg-indigo-950/40 border border-slate-700/60 hover:border-indigo-500/50 text-left transition-all cursor-pointer group"
                >
                  <div className="text-lg mb-1">{preset.icon}</div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {preset.title}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {preset.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Document Upload Area (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Or upload lecture material / textbook / notes (Optional)
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
                isDragging
                  ? 'border-indigo-400 bg-indigo-950/30'
                  : uploadedFile
                  ? 'border-emerald-500/50 bg-emerald-950/20'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-800/40 hover:bg-slate-800/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              {uploadedFile ? (
                <div className="flex items-center justify-between px-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-emerald-400" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">{uploadedFile.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {(uploadedFile.size / 1024).toFixed(1)} KB • Ready for syllabus extraction
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                    }}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-2">
                  <UploadCloud className="w-7 h-7 text-indigo-400" />
                  <p className="text-xs text-slate-200 font-medium">
                    Drag and drop your PDF or syllabus here, or <span className="text-indigo-400 underline">browse</span>
                  </p>
                  <p className="text-[10px] text-slate-500">Supports PDF, Markdown, Text files</p>
                </div>
              )}
            </div>
          </div>

          {/* Personal vs Study Group Mode Toggle */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsClassroom(false)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  !isClassroom
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>1-on-1 Session</span>
              </button>
              <button
                type="button"
                onClick={() => setIsClassroom(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isClassroom
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Collaborative Classroom</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400">
              {isClassroom ? 'Creates a shareable room code' : 'Private isolated session'}
            </span>
          </div>
        </form>
      </div>

      {/* Feature Highlights Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mt-12 w-full">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white mb-1">Bidirectional Live Voice</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Muted by default to avoid noise. Unmute whenever you have questions to interrupt naturally.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Layout className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white mb-1">Read-Only Whiteboard</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Clean, distraction-free digital whiteboard. Only Rabbly writes and draws shapes via JSON commands.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white mb-1">Classroom Multiplayer</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Generate an invite link to study with friends. Whiteboard and audio synchronize live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
