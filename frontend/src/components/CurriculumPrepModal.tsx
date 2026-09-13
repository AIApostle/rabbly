import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
  Clock,
  Layers,
  FileText,
} from 'lucide-react';
import type { LessonPlan } from '../types';

interface CurriculumPrepModalProps {
  topic: string;
  plan?: LessonPlan | null;
  isGenerating?: boolean;
  onReady: () => void;
  isClassroom?: boolean;
  roomCode?: string;
}

export const CurriculumPrepModal: React.FC<CurriculumPrepModalProps> = ({
  topic,
  plan,
  isGenerating = false,
  onReady,
  isClassroom = false,
  roomCode,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(20);

  const steps = [
    {
      title: 'Analyzing Prompt & Study Context',
      desc: 'Extracting key concepts, learning level, and attached reference materials...',
    },
    {
      title: isClassroom ? 'Structuring Classroom Modules & Takeaways' : 'Agent Structuring Progressive Modules',
      desc: 'Generating sequential milestones, pedagogical breakdown, and takeaways...',
    },
    {
      title: 'Formulating Deep Lecture Notes',
      desc: 'Synthesizing formulas, structural architecture, and summary notes...',
    },
    {
      title: isClassroom ? 'Preparing Collaborative Classroom' : 'Preparing Whiteboard Workspace',
      desc: isClassroom ? 'Setting up interactive whiteboard and room participant roster...' : 'Setting up clean canvas layout and module curriculum drawer...',
    },
  ];

  // Animate progress smoothly while generating
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 40) return prev + 12;
          if (prev < 70) return prev + 6;
          if (prev < 90) return prev + 2;
          return prev;
        });
      }, 500);

      const stepTimer1 = setTimeout(() => setCurrentStep(1), 1200);
      const stepTimer2 = setTimeout(() => setCurrentStep(2), 2800);

      return () => {
        clearInterval(interval);
        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);
      };
    } else {
      // When generation finishes
      setCurrentStep(3);
      setProgress(100);
    }
  }, [isGenerating]);

  const hasModules = plan?.modules && plan.modules.length > 0;
  const isComplete = !isGenerating && hasModules;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border border-indigo-500/40 shadow-2xl bg-[#14161d] relative my-auto overflow-hidden">
        {/* Glowing background aura */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 blur-3xl pointer-events-none"></div>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-4 text-center flex-1">
          {/* Animated Avatar */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center text-2xl sm:text-3xl shadow-xl shadow-indigo-500/30">
              🐰
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${
                  isComplete ? 'bg-emerald-400' : 'bg-cyan-400 animate-ping'
                } opacity-75`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-4 w-4 ${
                  isComplete ? 'bg-emerald-500' : 'bg-cyan-500'
                }`}
              ></span>
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border mb-1.5 font-mono transition-colors">
              {isComplete ? (
                <span className="text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                  {isClassroom ? '✓ Classroom Modules & Takeaways Ready' : '✓ Modules & Notes Generated'}
                </span>
              ) : (
                <span className="text-indigo-400 bg-indigo-500/10 border-indigo-500/30 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{isClassroom ? 'Agent Structuring Classroom' : 'Agent Synthesizing Curriculum'}</span>
                </span>
              )}
            </div>
            {isClassroom && roomCode && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-[11px] font-mono text-indigo-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Room: <strong className="text-white font-bold">{roomCode}</strong></span>
                </span>
              </div>
            )}
            <h2 className="text-lg sm:text-2xl font-extrabold text-white font-['Outfit'] line-clamp-1">
              {plan?.topic || topic || (isClassroom ? 'Preparing Classroom' : 'Generating Curriculum')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-md mx-auto">
              {isComplete
                ? (isClassroom
                    ? 'Classroom curriculum modules and key takeaways are ready. Click below to enter the live classroom.'
                    : 'Curriculum modules and deep lecture notes are ready. Enter the whiteboard to study.')
                : (isClassroom
                    ? 'The AI agent is analyzing your topic and generating structured classroom modules, key takeaways, and notes...'
                    : 'The AI agent is analyzing your prompt and generating structured progressive modules and notes...')}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isComplete
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400'
              }`}
              style={{ width: `${Math.min(100, Math.round(progress))}%` }}
            />
          </div>

          {/* Step Progress Checklist */}
          <div className="space-y-2 text-left pt-1">
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStep || isComplete;
              const isCurrent = idx === currentStep && !isComplete;

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-2.5 rounded-2xl border transition-all duration-300 ${
                    isCurrent
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30'
                      : isCompleted
                      ? 'bg-slate-800/40 border-slate-700/40'
                      : 'bg-slate-900/30 border-slate-800/40 opacity-40'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-600"></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`text-xs font-bold ${
                          isCurrent
                            ? 'text-indigo-200'
                            : isCompleted
                            ? 'text-slate-200'
                            : 'text-slate-500'
                        }`}
                      >
                        {step.title}
                      </h3>
                      {isCompleted && (
                        <span className="text-[10px] text-emerald-400 font-mono">Done</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5 truncate">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Generated Modules Showcase */}
          {hasModules && (
            <div className="pt-2 text-left space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Generated Modules ({plan.modules.length})</span>
                </span>
                <span className="text-[10px] text-indigo-300 font-mono font-medium">
                  {plan.estimatedMinutes} mins total • {plan.level}
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {plan.modules.map((mod, i) => (
                  <div
                    key={mod.id || i}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/70 hover:border-indigo-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-white line-clamp-1">
                        {mod.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {mod.duration}
                      </span>
                    </div>
                    {mod.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {mod.description}
                      </p>
                    )}
                    {mod.keyTakeaways && mod.keyTakeaways.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                        {mod.keyTakeaways.map((takeaway, k) => (
                          <span
                            key={k}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60"
                          >
                            • {takeaway}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Notes Indicator */}
              {plan.lectureNotes && plan.lectureNotes.length > 0 && (
                <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-300">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-medium text-[11px]">
                      {plan.lectureNotes.length} Lecture Notes & Formulas Generated
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400">Available in Board Drawer</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 sm:p-5 pt-3 border-t border-slate-800/80 bg-[#14161d]/95 backdrop-blur-md rounded-b-3xl shrink-0">
          {isComplete ? (
            <button
              onClick={onReady}
              id="enter-class-btn"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-500/20 hover:shadow-indigo-600/40 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.98] ring-2 ring-emerald-400/50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isClassroom ? 'Enter Classroom' : 'Enter Whiteboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              disabled
              id="enter-class-locked-btn"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-slate-800/90 text-slate-400 font-semibold text-xs sm:text-sm border border-slate-700/70 cursor-not-allowed select-none opacity-90"
            >
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <span>
                {isClassroom
                  ? `Structuring Classroom Modules (${Math.min(100, Math.round(progress))}%)`
                  : `Generating Modules & Notes (${Math.min(100, Math.round(progress))}%)`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
