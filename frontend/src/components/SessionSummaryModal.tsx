import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  FileText,
  RotateCcw,
  X,
  Printer,
} from 'lucide-react';
import type { LessonPlan } from '../types';

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnToDashboard: () => void;
  onRestartSession?: () => void;
  onOpenFullNotes?: () => void;
  topic: string;
  plan?: LessonPlan | null;
  elapsedSeconds: number;
  completedModules: number;
  totalModules: number;
  isClassroom?: boolean;
  roomCode?: string;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  isOpen,
  onClose,
  onReturnToDashboard,
  onRestartSession,
  onOpenFullNotes,
  topic,
  plan,
  elapsedSeconds,
  completedModules,
  totalModules,
  isClassroom = false,
  roomCode,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const cleanTopic = topic || plan?.topic || 'STEM Lesson';
  const effectiveTotal = totalModules || plan?.modules?.length || 4;
  const effectiveCompleted = Math.min(completedModules || effectiveTotal, effectiveTotal);
  const progressPercent = Math.round((effectiveCompleted / Math.max(1, effectiveTotal)) * 100);

  // Generate full markdown text for export
  const buildMarkdownNotes = (): string => {
    let md = `# ${cleanTopic} - Rabbly AI Lecture Notes\n\n`;
    md += `**Date**: ${new Date().toLocaleDateString()} | **Duration**: ${formatTimer(elapsedSeconds)} | **Level**: ${plan?.level || 'Intermediate'}\n`;
    if (isClassroom && roomCode) {
      md += `**Classroom Code**: ${roomCode}\n`;
    }
    md += `\n---\n\n`;

    md += `## Executive Overview\n${plan?.overview || 'Comprehensive STEM lesson covering conceptual foundations, structural mechanics, and practical applications.'}\n\n`;

    if (plan?.modules && plan.modules.length > 0) {
      md += `## Curriculum Roadmap & Milestones\n`;
      plan.modules.forEach((m) => {
        md += `### ${m.title} (${m.duration})\n${m.description}\n`;
        if (m.keyTakeaways && m.keyTakeaways.length > 0) {
          md += `**Key Takeaways**:\n`;
          m.keyTakeaways.forEach((t) => {
            md += `- ${t}\n`;
          });
        }
        md += `\n`;
      });
    }

    if (plan?.lectureNotes && plan.lectureNotes.length > 0) {
      md += `## Detailed Lecture Notes, Formulas & Architectural Schemas\n\n`;
      plan.lectureNotes.forEach((note) => {
        md += `${note}\n\n`;
      });
    }

    if (plan?.suggestedQuestions && plan.suggestedQuestions.length > 0) {
      md += `## Inquiry & Discussion Questions\n`;
      plan.suggestedQuestions.forEach((q, idx) => {
        md += `${idx + 1}. ${q}\n`;
      });
      md += `\n`;
    }

    return md;
  };

  const handleCopy = () => {
    const md = buildMarkdownNotes();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const md = buildMarkdownNotes();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${cleanTopic.replace(/[^a-zA-Z0-9_-]/g, '_')}_Lecture_Notes.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] glass-dropdown rounded-3xl border border-slate-700/80 shadow-2xl bg-[#14161d] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800/80 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Sparkles className="w-6 h-6 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                  {isClassroom ? 'Classroom Concluded' : 'Lesson Completed'}
                </span>
                {isClassroom && roomCode && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/40 text-sky-300">
                    Room: {roomCode}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-['Outfit'] line-clamp-1">
                {cleanTopic}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Time Spent
              </span>
              <span className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Modules
              </span>
              <span className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                {effectiveCompleted}/{effectiveTotal}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Progress
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-['Outfit']">
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Full-Fledged Generated Notes Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Synthesized Lecture Study Guide
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {onOpenFullNotes && (
                  <button
                    type="button"
                    onClick={onOpenFullNotes}
                    className="px-3 py-1.5 rounded-xl bg-[#0842a0]/60 hover:bg-[#0842a0] border border-[#a8c7fa]/40 text-xs font-semibold text-[#a8c7fa] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    title="View full-page notes and export PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Full Notes & PDF</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl bg-[#282a2f] hover:bg-[#33353a] border border-[#44474f]/40 text-xs font-semibold text-[#c4c6d0] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#8e9099]" />
                      <span>Copy MD</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl bg-[#0842a0] hover:bg-[#0a4ec0] text-xs font-semibold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#0842a0]/30"
                >
                  {downloaded ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span>Download .md</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Scrollable Note Content Container */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 max-h-72 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed font-sans pr-2">
              {plan?.overview && (
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-sky-200">
                  <strong className="text-white block mb-1">Executive Summary:</strong>
                  {plan.overview}
                </div>
              )}

              {plan?.lectureNotes && plan.lectureNotes.length > 0 ? (
                plan.lectureNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#111318] border border-slate-800/80 space-y-1.5"
                  >
                    <div className="text-slate-200 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                      {note}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic">No notes generated for this session.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-[#111318] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {onRestartSession ? (
            <button
              type="button"
              onClick={onRestartSession}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Review Whiteboard</span>
            </button>
          ) : (
            <div></div>
          )}

          <div className="w-full sm:w-auto flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={onReturnToDashboard}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Return to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
