import React from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  Clock,
  Layers,
} from 'lucide-react';
import type { LessonPlan } from '../types';

interface LessonDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plan: LessonPlan | null;
  activeModuleIndex: number;
  onOpenFullNotes?: () => void;
}

export const LessonDrawer: React.FC<LessonDrawerProps> = ({
  isOpen,
  onClose,
  plan,
  activeModuleIndex,
}) => {
  if (!isOpen) return null;

  if (!plan) {
    return (
      <aside className="fixed inset-y-0 right-0 z-30 w-96 max-w-[90vw] border-l border-blue-900/30 bg-[#0c1017]/95 shadow-2xl flex flex-col backdrop-blur-2xl animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-blue-900/30 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white font-['Outfit']">Lesson Modules</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#191e28] hover:bg-[#222936] text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <Layers className="w-10 h-10 text-blue-900/60 mb-3" />
          <p className="text-sm font-medium text-slate-300">No active lesson modules.</p>
          <p className="text-xs text-slate-500 mt-1">Start a lesson to generate roadmap modules.</p>
        </div>
      </aside>
    );
  }

  const cleanSubject = plan.subject && plan.subject.toLowerCase() !== 'general study' && plan.subject.toLowerCase() !== 'general' ? plan.subject : null;
  const currentStepNum = Math.min(activeModuleIndex + 1, plan.modules.length);

  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-96 max-w-[90vw] border-l border-blue-900/30 bg-[#0c1017]/95 shadow-2xl flex flex-col backdrop-blur-2xl animate-in slide-in-from-right duration-300">
      {/* Drawer Header: Clean Modules Roadmap */}
      <div className="p-4 border-b border-blue-900/30 flex items-center justify-between bg-[#111622]/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-blue-600/20 text-sky-400 border border-blue-500/30 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-white font-['Outfit'] truncate">
                Lesson Modules
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-600/20 text-sky-300 border border-blue-500/30 font-semibold">
                {currentStepNum} / {plan.modules.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              {cleanSubject && (
                <>
                  <span className="text-sky-300 font-mono text-[10px] font-medium">
                    {cleanSubject}
                  </span>
                  <span>•</span>
                </>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                ~{plan.estimatedMinutes} mins
              </span>
              <span>•</span>
              <span className="text-sky-300 font-medium">{plan.level}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-[#191e28] hover:bg-[#222936] text-slate-400 hover:text-white transition-all cursor-pointer shrink-0 ml-2"
          title="Close Drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar Strip */}
      <div className="w-full bg-[#111622] h-1">
        <div
          className="bg-gradient-to-r from-blue-600 to-sky-400 h-full transition-all duration-500"
          style={{ width: `${Math.round((currentStepNum / plan.modules.length) * 100)}%` }}
        />
      </div>

      {/* Content Area: Strictly Lesson Modules */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {plan.overview && (
          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-800/30 text-xs text-slate-300 leading-relaxed">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono block mb-1">
              Lesson Objective
            </span>
            {plan.overview}
          </div>
        )}

        <div className="space-y-3">
          {plan.modules.map((mod, index) => {
            const isActive = index === activeModuleIndex;
            const isPast = index < activeModuleIndex;

            return (
              <div
                key={mod.id || index}
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/30 shadow-lg shadow-blue-950/50'
                    : isPast
                    ? 'bg-[#111622]/60 border-blue-950/50 opacity-80'
                    : 'bg-[#131824]/90 border-blue-900/25'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isActive ? (
                      <span className="relative flex h-3.5 w-3.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500"></span>
                      </span>
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <h3
                      className={`text-xs font-bold leading-snug ${
                        isActive ? 'text-sky-200' : isPast ? 'text-slate-300' : 'text-slate-200'
                      }`}
                    >
                      {mod.title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 px-2 py-0.5 rounded-full bg-[#0a0d14] border border-blue-950">
                    {mod.duration}
                  </span>
                </div>

                {mod.description && (
                  <p className="text-xs text-slate-400 leading-relaxed pl-5 mb-2.5">
                    {mod.description}
                  </p>
                )}

                {/* Key Takeaways */}
                {mod.keyTakeaways && mod.keyTakeaways.length > 0 && (
                  <div className="pl-5 pt-2 border-t border-blue-900/20 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
                      Core Concepts
                    </span>
                    <ul className="space-y-1">
                      {mod.keyTakeaways.map((takeaway, tIdx) => (
                        <li
                          key={tIdx}
                          className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-snug"
                        >
                          <span className="w-1 h-1 rounded-full bg-sky-400 mt-1.5 shrink-0"></span>
                          <span>{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
