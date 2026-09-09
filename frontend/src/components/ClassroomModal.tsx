import React, { useState } from 'react';
import { X, Copy, Check, Users, Link2, ShieldCheck, MicOff, Mic } from 'lucide-react';
import type { ClassroomParticipant } from '../types';

interface ClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  participants: ClassroomParticipant[];
}

export const ClassroomModal: React.FC<ClassroomModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  participants,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `https://rabbly.ai/classroom/${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-dropdown rounded-3xl p-6 border border-slate-700/80 shadow-2xl bg-slate-900/95 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Classroom Collaboration</h2>
              <p className="text-xs text-slate-400">Invite friends to learn together in real time</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Room Code & Share Link */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Room Code</span>
              <p className="text-lg font-mono font-extrabold text-indigo-300 tracking-widest">{roomCode}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Isolated Room</span>
            </div>
          </div>

          {/* Share Link with Copy */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-slate-200 font-mono focus:outline-none"
              />
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white transition-all shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Information box */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
          💡 <strong className="text-white">How it works:</strong> Everyone in this study room sees the teacher's whiteboard illustrations update live and hears the lecture together. Your mic is muted by default so you can listen comfortably.
        </div>

        {/* Active Members List */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-300">
              Students in Room ({participants.length}/8)
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white border border-slate-600">
                    {p.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white">{p.name}</span>
                      {p.isHost && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                          HOST
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">Joined {p.joinedAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.isMuted ? (
                    <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400" title="Muted">
                      <MicOff className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400" title="Mic Open">
                      <Mic className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
