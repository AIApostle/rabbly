import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquarePlus,
  Share2,
  BookOpen,
  HelpCircle,
} from 'lucide-react';

interface AudioControlBarProps {
  isMuted: boolean;
  onToggleMute: () => void;
  isSpeakerMuted: boolean;
  onToggleSpeaker: () => void;
  onAskQuestion: (question: string) => void;
  suggestedQuestions: string[];
  onOpenClassroom: () => void;
  onToggleNotes: () => void;
  isNotesOpen: boolean;
  participantCount: number;
  isClassroomMode?: boolean;
}

export const AudioControlBar: React.FC<AudioControlBarProps> = ({
  isMuted,
  onToggleMute,
  isSpeakerMuted,
  onToggleSpeaker,
  onAskQuestion,
  suggestedQuestions,
  onOpenClassroom,
  onToggleNotes,
  isNotesOpen,
  participantCount,
  isClassroomMode = false,
}) => {
  const [showQuestionsMenu, setShowQuestionsMenu] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');

  const handleSubmitCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;
    onAskQuestion(customQuestion.trim());
    setCustomQuestion('');
    setShowQuestionsMenu(false);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
      {/* Quick Questions Popup Menu */}
      {showQuestionsMenu && (
        <div className="mb-3 w-[460px] max-w-[90vw] glass-dropdown rounded-2xl p-4 border border-indigo-500/30 shadow-2xl backdrop-blur-2xl bg-slate-900/95 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Ask Rabbly a Question
              </span>
            </div>
            <button
              onClick={() => setShowQuestionsMenu(false)}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-2.5">
            Click a suggested question or type your own. Rabbly will answer verbally and illustrate on the board.
          </p>

          {/* Quick chips */}
          <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto pr-1">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onAskQuestion(q);
                  setShowQuestionsMenu(false);
                }}
                className="w-full text-left p-2 rounded-xl text-xs bg-slate-800/80 hover:bg-indigo-950/60 border border-slate-700/60 hover:border-indigo-500/40 text-slate-200 transition-all cursor-pointer flex items-start gap-2"
              >
                <span className="text-indigo-400 font-bold">Q{idx + 1}:</span>
                <span className="leading-snug">{q}</span>
              </button>
            ))}
          </div>

          {/* Custom question input */}
          <form onSubmit={handleSubmitCustomQuestion} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask anything about this concept..."
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              className="flex-1 bg-slate-800/90 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all cursor-pointer shadow-md"
            >
              Ask
            </button>
          </form>
        </div>
      )}

      {/* Main Bottom Dock */}
      <div className="glass-panel rounded-2xl px-3 sm:px-4 py-2 shadow-2xl border border-slate-700/60 backdrop-blur-2xl bg-slate-900/85 flex items-center gap-2 sm:gap-3">
        {/* Student Microphone Toggle - ICON ONLY with hover tooltip */}
        <div className="relative group">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute yourself' : 'Mute microphone'}
            className={`p-2.5 rounded-xl transition-all duration-300 cursor-pointer shadow-md active:scale-95 flex items-center justify-center ${
              isMuted
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25'
                : 'bg-emerald-500 text-slate-950 font-bold ring-4 ring-emerald-500/30 shadow-emerald-500/30 hover:bg-emerald-400'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Tooltip on hover */}
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-[11px] text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg font-medium">
            {isMuted ? 'Unmute yourself' : 'Mute microphone'}
          </div>
        </div>

        {/* Audio Speaker Output Toggle - Icon only with hover tooltip */}
        <div className="relative group">
          <button
            onClick={onToggleSpeaker}
            aria-label={isSpeakerMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer flex items-center justify-center"
          >
            {isSpeakerMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-300" />
            )}
          </button>
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-[11px] text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg font-medium">
            {isSpeakerMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
          </div>
        </div>

        <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5"></div>

        {/* Ask Question Popup Button */}
        <button
          onClick={() => setShowQuestionsMenu(!showQuestionsMenu)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
            showQuestionsMenu
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
              : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-750 hover:text-white'
          }`}
        >
          <MessageSquarePlus className="w-3.5 h-3.5 text-indigo-400" />
          <span>Ask Question</span>
        </button>

        <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5"></div>

        {/* Lesson Notes & Curriculum Drawer Toggle - Icon with tooltip */}
        <div className="relative group">
          <button
            onClick={onToggleNotes}
            aria-label="Curriculum & Notes"
            className={`p-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center justify-center ${
              isNotesOpen
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </button>
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-[11px] text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg font-medium">
            Curriculum & Notes
          </div>
        </div>

        {/* Classroom Collaboration Button - ONLY Rendered in Classroom Mode */}
        {isClassroomMode && (
          <>
            <div className="w-[1px] h-6 bg-slate-700/60 mx-0.5"></div>
            <div className="relative group">
              <button
                onClick={onOpenClassroom}
                aria-label="Classroom Members & Invite"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 text-indigo-200 border border-indigo-500/40 hover:border-indigo-400 transition-all cursor-pointer shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-300" />
                <span>Classroom</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-500/40 text-[10px] text-white font-bold">
                  {participantCount}
                </span>
              </button>
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-[11px] text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg font-medium">
                Room Members ({participantCount})
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
