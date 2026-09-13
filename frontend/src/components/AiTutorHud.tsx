import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import type { AiStatus } from '../types';

interface AiTutorHudProps {
  status: AiStatus;
  speechText?: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  currentTopic?: string;
  elapsedSeconds?: number;
  isClassroom?: boolean;
}

export const AiTutorHud: React.FC<AiTutorHudProps> = ({
  status,
  speechText,
  isPlaying,
  onTogglePlay,
  onRestart,
  isClassroom = false,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'explaining':
        return {
          text: 'Teaching',
          color: 'bg-blue-500/20 text-sky-300 border-blue-500/40',
          dot: 'bg-sky-400',
        };
      case 'diagramming':
        return {
          text: 'Writing',
          color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          dot: 'bg-cyan-400',
        };
      case 'answering':
        return {
          text: 'Answering',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-400',
        };
      case 'thinking':
        return {
          text: 'Thinking...',
          color: 'bg-blue-600/20 text-sky-200 border-blue-400/40',
          dot: 'bg-sky-300',
        };
      default:
        return {
          text: 'Ready',
          color: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
          dot: 'bg-slate-400',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="absolute top-4 left-4 z-20 transition-all duration-300">
      <div className="rounded-2xl p-2 sm:px-3 sm:py-2 shadow-2xl border border-slate-700/70 backdrop-blur-xl bg-slate-900/90 flex items-center gap-2.5">
        {/* Rabbly Tutor Avatar */}
        <div
          className="relative flex items-center justify-center cursor-help"
          title={speechText ? `Rabbly: ${speechText}` : 'Rabbly AI Tutor'}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-base shadow-sm">
            🐰
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {/* Name & Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white tracking-wide">Rabbly</span>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
            <span>{badge.text}</span>
          </div>
        </div>

        <div className="w-[1px] h-5 bg-slate-700/60 mx-0.5"></div>

        {/* Lecture Controls */}
        <div className="flex items-center gap-1.5">
          {/* Pause is only available in 1-on-1 sessions, not in collaborative classrooms */}
          {!isClassroom && (
            <button
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause Lecture' : 'Resume Lecture'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
          )}

          <button
            onClick={onRestart}
            title="Restart Lecture"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/80 transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
