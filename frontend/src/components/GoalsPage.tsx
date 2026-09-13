import React, { useState, useRef, useEffect } from 'react';
import {
  Zap,
  Plus,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Paperclip,
  Trash2,
  Sparkles,
  Link2,
  SquarePlay,
  FileText,
  Globe,
  X,
} from 'lucide-react';
import type { ExternalResource } from '../types';
import {
  getLocalSprints,
  loadSprints,
  createSprint,
  updateSprintMilestones,
  deleteSprint,
} from '../services/sprintService';

export interface LearningSprint {
  id: string;
  title: string;
  subject: string;
  timeframe: string;
  daysRemaining: number;
  totalDays: number;
  progressPercent: number;
  milestones: {
    id: string;
    title: string;
    status: 'completed' | 'in-progress' | 'upcoming';
  }[];
  resources: ExternalResource[];
  createdAt: string;
}

// Backward-compatible alias
export type LearningGoal = LearningSprint;

interface SprintsPageProps {
  onStartSprintSession: (sprintTopic: string, resources: ExternalResource[], level: string) => void;
  onBackToChat: () => void;
}

export const SprintsPage: React.FC<SprintsPageProps> = ({
  onStartSprintSession,
  onBackToChat,
}) => {
  const [sprints, setSprints] = useState<LearningSprint[]>(getLocalSprints);

  // Sync learning sprints from backend API on mount
  useEffect(() => {
    let mounted = true;
    loadSprints().then((data) => {
      if (mounted && data) {
        setSprints(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newTimeframe, setNewTimeframe] = useState('3-Day Sprint');
  const [newMilestonesText, setNewMilestonesText] = useState('');
  const [newResources, setNewResources] = useState<ExternalResource[]>([]);

  // Menu and modal states for attachments
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitleInput, setUrlTitleInput] = useState('');
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [youtubeTitleInput, setYoutubeTitleInput] = useState('');

  const plusMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close plus menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    const formattedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const domain = formattedUrl.replace(/^https?:\/\//, '').split('/')[0];
    const title = urlTitleInput.trim() || domain;

    setNewResources((prev) => [
      ...prev,
      {
        id: `url-${Date.now()}`,
        type: 'link',
        title,
        detail: domain,
        url: formattedUrl,
      },
    ]);
    setUrlInput('');
    setUrlTitleInput('');
    setIsUrlModalOpen(false);
  };

  const handleAddYoutube = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrlInput.trim()) return;
    const url = youtubeUrlInput.trim();
    const title = youtubeTitleInput.trim() || 'YouTube Video Lecture';

    setNewResources((prev) => [
      ...prev,
      {
        id: `yt-${Date.now()}`,
        type: 'youtube',
        title,
        detail: 'YouTube Tutorial',
        url,
      },
    ]);
    setYoutubeUrlInput('');
    setYoutubeTitleInput('');
    setIsYoutubeModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      setNewResources((prev) => [
        ...prev,
        {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: 'file',
          title: file.name,
          detail: sizeStr,
        },
      ]);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateSprint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const parsedMilestones = newMilestonesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line, idx) => ({
        id: `m-${Date.now()}-${idx}`,
        title: line,
        status: (idx === 0 ? 'in-progress' : 'upcoming') as 'in-progress' | 'upcoming',
      }));

    const finalMilestones =
      parsedMilestones.length > 0
        ? parsedMilestones
        : [
            { id: 'm1', title: '1. Foundations & Mathematical Intuition', status: 'in-progress' as const },
            { id: 'm2', title: '2. Core Principles & Step-by-Step Breakdown', status: 'upcoming' as const },
            { id: 'm3', title: '3. Synthesis & Real-World Problem Solving', status: 'upcoming' as const },
          ];

    const days = newTimeframe.includes('3') ? 3 : newTimeframe.includes('5') ? 5 : 7;

    const newSprintPayload: Partial<LearningSprint> = {
      title: newTitle.trim(),
      subject: newSubject.trim() || 'General Mastery',
      timeframe: newTimeframe,
      daysRemaining: days,
      totalDays: days,
      progressPercent: 0,
      milestones: finalMilestones,
      resources: newResources,
    };

    createSprint(newSprintPayload).then((persisted) => {
      setSprints((prev) => [persisted, ...prev.filter((s) => s.id !== persisted.id)]);
    });

    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewSubject('');
    setNewMilestonesText('');
    setNewResources([]);
  };

  const handleDeleteSprint = (sprintId: string) => {
    deleteSprint(sprintId);
    setSprints((prev) => prev.filter((s) => s.id !== sprintId));
  };

  const handleToggleMilestone = (sprintId: string, milestoneId: string) => {
    setSprints((prev) =>
      prev.map((sprint) => {
        if (sprint.id !== sprintId) return sprint;
        const updated = sprint.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          const nextStatus =
            m.status === 'completed'
              ? 'in-progress'
              : m.status === 'in-progress'
              ? 'upcoming'
              : 'completed';
          return { ...m, status: nextStatus as 'completed' | 'in-progress' | 'upcoming' };
        });
        const completedCount = updated.filter((m) => m.status === 'completed').length;
        const pct = Math.round((completedCount / updated.length) * 100);
        updateSprintMilestones(sprintId, updated, pct);
        return { ...sprint, milestones: updated, progressPercent: pct };
      })
    );
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col space-y-8">
      {/* Hidden File Input for Sprint Attachments */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.doc,.docx,.md,.markdown"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Header */}
      <div className="pb-4 border-b border-[#44474f]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <Zap className="w-4 h-4" />
            <span>Fast-Track Subject Mastery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            Sprints
          </h1>
          <p className="text-xs sm:text-sm text-[#c4c6d0] mt-0.5 max-w-2xl leading-relaxed">
            Set focused learning sprints to master subjects and concepts quickly (e.g.{' '}
            <span className="text-amber-300 font-mono">Master Calculus in 3 Days</span> or{' '}
            <span className="text-amber-300 font-mono">Build a Transformer in 5 Days</span>). Rabbly guides you through daily milestones using your attached study materials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToChat}
            className="px-3 py-1.5 rounded-xl bg-[#282a2f] hover:bg-[#33353a] text-xs font-medium text-[#c4c6d0] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Sprint</span>
          </button>
        </div>
      </div>

      {/* Sprint Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sprints.map((sprint) => (
          <div
            key={sprint.id}
            className="rounded-3xl bg-[#1d2024] border border-[#44474f]/40 hover:border-amber-500/50 p-6 shadow-xl flex flex-col justify-between space-y-5 transition-all group"
          >
            <div className="space-y-3">
              {/* Header tags */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {sprint.subject}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{sprint.daysRemaining}d left</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSprint(sprint.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete sprint"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h2 className="text-base font-bold text-white font-['Outfit'] leading-snug group-hover:text-amber-200 transition-colors">
                {sprint.title}
              </h2>

              <div className="text-xs text-[#8e9099] flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-[#282a2f] text-slate-300 font-mono text-[11px]">
                  {sprint.timeframe}
                </span>
                <span>•</span>
                <span>Created {sprint.createdAt}</span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#c4c6d0]">Sprint Progress</span>
                  <span className="font-mono font-bold text-amber-400">{sprint.progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#111318] overflow-hidden border border-[#44474f]/30">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 transition-all duration-500 rounded-full"
                    style={{ width: `${sprint.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Milestones Roadmap */}
            <div className="space-y-2 py-2 border-y border-[#44474f]/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e9099] block font-mono">
                  Roadmap Milestones ({sprint.milestones.filter((m) => m.status === 'completed').length}/{sprint.milestones.length})
                </span>
                <span className="text-[10px] text-[#8e9099] font-mono">Click checkbox to check off</span>
              </div>
              {sprint.milestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-[#282a2f] text-xs transition-colors group/item"
                >
                  <div
                    onClick={() => handleToggleMilestone(sprint.id, m.id)}
                    className="flex items-start gap-2 min-w-0 cursor-pointer flex-1"
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-colors ${
                        m.status === 'completed'
                          ? 'text-emerald-400'
                          : m.status === 'in-progress'
                          ? 'text-amber-400 animate-pulse'
                          : 'text-slate-600 group-hover/item:text-slate-400'
                      }`}
                    />
                    <span
                      className={`text-[11px] leading-snug truncate ${
                        m.status === 'completed'
                          ? 'line-through text-[#8e9099]'
                          : m.status === 'in-progress'
                          ? 'text-white font-medium'
                          : 'text-[#c4c6d0]'
                      }`}
                    >
                      {m.title}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onStartSprintSession(`${sprint.title} - ${m.title}`, sprint.resources, 'Advanced')}
                    className="opacity-0 group-hover/item:opacity-100 px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-semibold transition-all cursor-pointer shrink-0"
                    title="Start lesson specifically for this milestone"
                  >
                    Study ➔
                  </button>
                </div>
              ))}
            </div>

            {/* Attached Sources */}
            {sprint.resources.length > 0 && (
              <div className="pt-2 border-t border-[#44474f]/20 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[#8e9099] font-mono flex items-center gap-1 mr-1">
                  <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sprint Materials:</span>
                </span>
                {sprint.resources.map((res) => (
                  <span
                    key={res.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#111318] border border-[#44474f]/40 text-xs text-slate-300"
                  >
                    {res.type === 'youtube' ? (
                      <SquarePlay className="w-3 h-3 text-rose-400" />
                    ) : res.type === 'link' ? (
                      <Link2 className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <FileText className="w-3 h-3 text-amber-400" />
                    )}
                    <span className="truncate max-w-[200px]">{res.title}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Launch sprint study session */}
            <button
              type="button"
              onClick={() => onStartSprintSession(sprint.title, sprint.resources, 'Advanced')}
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Launch Sprint Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Feature Explainer Banner */}
      <div className="p-6 rounded-3xl bg-[#17191e] border border-[#44474f]/30 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
          <Zap className="w-4 h-4" />
          <span>How Learning Sprints Work</span>
        </div>
        <h3 className="text-sm font-bold text-white font-['Outfit']">
          Fast-Paced Concept Mastery
        </h3>
        <p className="text-xs text-[#c4c6d0] leading-relaxed max-w-3xl">
          Sprints break large subjects into daily achievable milestones. When you launch a sprint session, the AI tutor focuses directly on your active milestone, working through derivations on the whiteboard with clear step-by-step intuition and interactive Q&A.
        </p>
      </div>

      {/* Modal: Create Sprint */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-[#1d2024] border border-[#44474f]/60 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[#44474f]/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Outfit']">
                    Create New Sprint
                  </h3>
                  <span className="text-[11px] text-[#8e9099]">Define your sprint topic, timeframe, and study materials</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#282a2f] text-[#8e9099] hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSprint} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] block mb-1 font-mono">
                  Sprint Topic or Subject to Master *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Calculus in 3 Days or Build a Transformer from Scratch"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-amber-400 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] block mb-1 font-mono">
                    Subject / Field
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics, Machine Learning, Systems"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-amber-400 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] block mb-1 font-mono">
                    Target Timeframe
                  </label>
                  <select
                    value={newTimeframe}
                    onChange={(e) => setNewTimeframe(e.target.value)}
                    className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-amber-400 rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="3-Day Sprint">3-Day Sprint</option>
                    <option value="5-Day Sprint">5-Day Sprint</option>
                    <option value="1-Week Sprint">1-Week Sprint</option>
                    <option value="2-Week Sprint">2-Week Sprint</option>
                    <option value="Custom Sprint">Custom Sprint</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] block mb-1 font-mono">
                  Roadmap Milestones (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder={"1. Foundational Concepts & Core Intuition\n2. Key Formulas & Worked Examples\n3. Advanced Synthesis & Practice"}
                  value={newMilestonesText}
                  onChange={(e) => setNewMilestonesText(e.target.value)}
                  className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-amber-400 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Attach Study Materials with Dropdown Popover */}
              <div className="space-y-2 pt-2 border-t border-[#44474f]/30">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] block font-mono">
                      Attach Study Materials
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Add notes, papers, or video lectures for this sprint.
                    </p>
                  </div>

                  {/* Plus dropdown button */}
                  <div ref={plusMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                      className="px-3 py-1.5 rounded-xl bg-[#282a2f] hover:bg-[#33353a] text-xs font-semibold text-amber-300 hover:text-white border border-[#44474f]/40 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Attach Material</span>
                    </button>

                    {isPlusMenuOpen && (
                      <div className="absolute right-0 bottom-9 w-64 rounded-2xl bg-[#17191e] border border-[#44474f]/60 shadow-2xl p-1.5 z-30 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                        {/* 1. Document */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            fileInputRef.current?.click();
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#282a2f] text-xs font-medium text-white transition-colors text-left cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-lg bg-[#0842a0]/40 text-[#a8c7fa] flex items-center justify-center shrink-0">
                            <Paperclip className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-semibold">Upload Document</span>
                            <span className="text-[10px] text-[#8e9099]">PDF, Notes, Markdown</span>
                          </div>
                        </button>

                        {/* 2. YouTube */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            setIsYoutubeModalOpen(true);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#282a2f] text-xs font-medium text-white transition-colors text-left cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                            <SquarePlay className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-semibold">YouTube Video Tutorial</span>
                            <span className="text-[10px] text-[#8e9099]">Lecture or tutorial URL</span>
                          </div>
                        </button>

                        {/* 3. Link */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            setIsUrlModalOpen(true);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#282a2f] text-xs font-medium text-white transition-colors text-left cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-lg bg-[#005353]/40 text-[#78f8e7] flex items-center justify-center shrink-0">
                            <Globe className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-semibold">Web Link / Paper URL</span>
                            <span className="text-[10px] text-[#8e9099]">arXiv, docs, article</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attached resources preview */}
                {newResources.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {newResources.map((res) => (
                      <span
                        key={res.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#111318] border border-amber-500/40 text-xs text-amber-300"
                      >
                        {res.type === 'youtube' ? (
                          <SquarePlay className="w-3 h-3 text-rose-400" />
                        ) : res.type === 'link' ? (
                          <Globe className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <FileText className="w-3 h-3 text-amber-400" />
                        )}
                        <span className="max-w-[180px] truncate">{res.title}</span>
                        <button
                          type="button"
                          onClick={() => setNewResources((prev) => prev.filter((r) => r.id !== res.id))}
                          className="hover:text-rose-400 ml-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic pt-1">
                    No materials attached yet. Click "Attach Material" to add references.
                  </p>
                )}
              </div>

              {/* Submit button */}
              <div className="pt-4 border-t border-[#44474f]/30">
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Sprint & Initialize Roadmap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Web URL Popover Modal */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-[#1d2024] border border-[#44474f]/60 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#44474f]/30">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#78f8e7]" />
                <h3 className="text-sm font-bold text-white font-['Outfit']">Attach Web Resource</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUrlModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#282a2f] text-[#8e9099] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUrl} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#c4c6d0] block mb-1">
                  Resource URL <span className="text-[#a8c7fa]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://arxiv.org/abs/... or github.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-[#8e9099] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#c4c6d0] block mb-1">
                  Title or Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Research Paper or Reference Notes"
                  value={urlTitleInput}
                  onChange={(e) => setUrlTitleInput(e.target.value)}
                  className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-[#8e9099] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#c4c6d0] hover:text-white hover:bg-[#282a2f] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer shadow-md"
                >
                  Attach Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YouTube Video Modal */}
      {isYoutubeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-[#1d2024] border border-[#44474f]/60 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#44474f]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <SquarePlay className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-['Outfit']">Attach YouTube Video Tutorial</h3>
                  <span className="text-[10px] text-[#8e9099]">AI whiteboard lecture based on video</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsYoutubeModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#282a2f] text-[#8e9099] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddYoutube} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#c4c6d0] block mb-1">
                  YouTube Video Link <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                  value={youtubeUrlInput}
                  onChange={(e) => setYoutubeUrlInput(e.target.value)}
                  className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-rose-400 rounded-xl px-3 py-2 text-xs text-white placeholder-[#8e9099] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#c4c6d0] block mb-1">
                  Video Topic or Lecture Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3Blue1Brown Neural Networks Chapter 1"
                  value={youtubeTitleInput}
                  onChange={(e) => setYoutubeTitleInput(e.target.value)}
                  className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-rose-400 rounded-xl px-3 py-2 text-xs text-white placeholder-[#8e9099] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsYoutubeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#c4c6d0] hover:text-white hover:bg-[#282a2f] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white transition-all cursor-pointer shadow-md shadow-rose-900/30 flex items-center gap-1.5"
                >
                  <SquarePlay className="w-3.5 h-3.5" />
                  <span>Attach Video Tutorial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Also export as GoalsPage for seamless backwards compatibility
export const GoalsPage = SprintsPage;
