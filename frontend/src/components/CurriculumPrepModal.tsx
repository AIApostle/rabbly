import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
  Clock,
  Layers,
} from 'lucide-react';
import type { LessonPlan } from '../types';

interface CurriculumPrepModalProps {
  topic: string;
  plan?: LessonPlan;
  onReady: () => void;
}

export const CurriculumPrepModal: React.FC<CurriculumPrepModalProps> = ({
  topic,
  plan,
  onReady,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(15);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    {
      title: 'Analyzing Sources & Topic Context',
      desc: 'Extracting conceptual relationships, dependencies, and reference materials...',
    },
    {
      title: 'Structuring Curriculum Modules',
      desc: 'Generating progressive milestones, key takeaways, and difficulty pacing...',
    },
    {
      title: 'Synthesizing Whiteboard & Formula Layout',
      desc: 'Preparing initial canvas layout, mathematical equations, and written step explanations...',
    },
    {
      title: 'Connecting AI Voice & Audio Engine',
      desc: 'Calibrating speech synthesis and low-latency student voice channel...',
    },
  ];

  // Default fallback modules if not in plan
  const modules = plan?.modules && plan.modules.length > 0 ? plan.modules : [
    {
      id: 'mod-1',
      title: 'Core Foundations & Conceptual Intuition',
      duration: '4 mins',
      description: 'Understanding the problem statement, high-level mechanics, and historical context.',
    },
    {
      id: 'mod-2',
      title: 'Mathematical Architecture & Key Mechanics',
      duration: '8 mins',
      description: 'Step-by-step vector operations, attention weights, and formulas drawn on whiteboard.',
    },
    {
      id: 'mod-3',
      title: 'Real-World Scenarios & Interactive Q&A',
      duration: '6 mins',
      description: 'Practical implementations, edge cases, and spontaneous student questions.',
    },
  ];

  useEffect(() => {
    // Step-by-step sequential analysis
    const t1 = setTimeout(() => {
      setCurrentStep(1);
      setProgress(40);
    }, 900);

    const t2 = setTimeout(() => {
      setCurrentStep(2);
      setProgress(70);
    }, 2000);

    const t3 = setTimeout(() => {
      setCurrentStep(3);
      setProgress(90);
    }, 3100);

    const t4 = setTimeout(() => {
      setCurrentStep(4);
      setProgress(100);
      setIsComplete(true);
    }, 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

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
              <span className={`absolute inline-flex h-full w-full rounded-full ${isComplete ? 'bg-emerald-400' : 'bg-cyan-400 animate-ping'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-4 w-4 ${isComplete ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border mb-1.5 font-mono transition-colors">
              {isComplete ? (
                <span className="text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                  ✓ Analysis Complete • Ready to Teach
                </span>
              ) : (
                <span className="text-indigo-400 bg-indigo-500/10 border-indigo-500/30 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Synthesizing Curriculum & Whiteboard</span>
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-extrabold text-white font-['Outfit'] line-clamp-1">
              {topic || 'Preparing Study Session'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-md mx-auto">
              {isComplete
                ? 'All modules generated and whiteboard synchronized. Click Enter Class to begin.'
                : 'Analyzing your prompt and sources to assemble modular checkpoints and interactive canvas drawings...'}
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
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step Progress Checklist */}
          <div className="space-y-2 text-left pt-1">
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;

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
                      <h3 className={`text-xs font-bold ${isCurrent ? 'text-indigo-200' : isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
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

          {/* Generated Modules Showcase (Revealed as analysis progresses) */}
          {currentStep >= 2 && (
            <div className="pt-1 text-left space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Generated Modules ({modules.length})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Est. ~{modules.length * 6} mins
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {modules.slice(0, 3).map((mod, i) => (
                  <div
                    key={mod.id || i}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-300">
                        Module 0{i + 1}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 mt-0.5">
                        {mod.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{mod.duration || '6m'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Action Footer: Guaranteed to be visible on any viewport */}
        <div className="p-4 sm:p-5 pt-3 border-t border-slate-800/80 bg-[#14161d]/95 backdrop-blur-md rounded-b-3xl shrink-0">
          {isComplete ? (
            <button
              onClick={onReady}
              id="enter-class-btn"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-500/20 hover:shadow-indigo-600/40 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.98] ring-2 ring-emerald-400/50 animate-pulse"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Enter Class</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              disabled
              id="enter-class-locked-btn"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-slate-800/90 text-slate-400 font-semibold text-xs sm:text-sm border border-slate-700/70 cursor-not-allowed select-none opacity-90"
            >
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <span>Enter Class (Analyzing & Generating: {Math.min(100, Math.round(progress))}%)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
