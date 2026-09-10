import React, { useState } from 'react';
import { X, CheckCircle2, Circle, Clock, BookOpen, FileText, Lightbulb, ChevronRight } from 'lucide-react';
import type { LessonPlan } from '../types';

interface LessonDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plan: LessonPlan;
  activeModuleIndex: number;
}

export const LessonDrawer: React.FC<LessonDrawerProps> = ({
  isOpen,
  onClose,
  plan,
  activeModuleIndex,
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'notes' | 'source'>('modules');

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-96 max-w-[90vw] glass-dropdown border-l border-slate-700/80 bg-slate-900/95 shadow-2xl flex flex-col backdrop-blur-2xl animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Lesson Curriculum</h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              {plan.subject && (
                <>
                  <span className="px-2 py-0.2 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-semibold font-mono text-[10px]">
                    {plan.subject}
                  </span>
                  <span>•</span>
                </>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {plan.estimatedMinutes} mins
              </span>
              <span>•</span>
              <span className="text-indigo-300 font-medium">{plan.level}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 px-4 pt-2 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('modules')}
          className={`pb-2.5 transition-all cursor-pointer border-b-2 ${
            activeTab === 'modules'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Modules ({plan.modules.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-2.5 transition-all cursor-pointer border-b-2 ${
            activeTab === 'notes'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Key Notes & Formulas
        </button>
        <button
          onClick={() => setActiveTab('source')}
          className={`pb-2.5 transition-all cursor-pointer border-b-2 ${
            activeTab === 'source'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Source Material
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'modules' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              {plan.overview}
            </p>

            {plan.modules.map((mod, index) => {
              const isActive = index === activeModuleIndex;
              const isPast = index < activeModuleIndex;

              return (
                <div
                  key={mod.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30 shadow-lg'
                      : isPast
                      ? 'bg-slate-800/30 border-slate-700/40 opacity-75'
                      : 'bg-slate-800/50 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {isPast ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : isActive ? (
                        <span className="relative flex h-3.5 w-3.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500"></span>
                        </span>
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <h3 className={`text-xs font-bold ${isActive ? 'text-indigo-200' : 'text-slate-200'}`}>
                        {mod.title}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 px-1.5 py-0.5 rounded bg-slate-800">
                      {mod.duration}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 ml-5 leading-relaxed mb-2">
                    {mod.description}
                  </p>

                  {/* Key takeaways */}
                  <div className="ml-5 space-y-1">
                    {mod.keyTakeaways.map((point, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                        <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Synthesized lecture notes, formulas, and architectural references for this lesson.</span>
            </div>

            <div className="space-y-2.5">
              {plan.lectureNotes.map((note, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap"
                >
                  <span className="text-indigo-400 font-bold block mb-1">Key Note #{index + 1}</span>
                  {note}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'source' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Primary Learning Source</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Topic: <span className="text-indigo-300 font-semibold">{plan.topic}</span>
              </p>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-mono">
                Source Document: Ingestion Pipeline Verified (PDF & Text notes parsed). Knowledge graph initialized for real-time whiteboard projection.
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
