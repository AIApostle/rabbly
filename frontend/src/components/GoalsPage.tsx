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
  Link2,
  SquarePlay,
  FileText,
  Globe,
  ChevronDown,
  ChevronUp,
  Target,
  Play,
  Layers,
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [expandedSprintIds, setExpandedSprintIds] = useState<Set<string>>(new Set());
  const [addingMilestoneSprintId, setAddingMilestoneSprintId] = useState<string | null>(null);
  const [newMilestoneInput, setNewMilestoneInput] = useState('');

  const toggleExpandSprint = (id: string) => {
    setExpandedSprintIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddMilestoneInline = (sprintId: string) => {
    if (!newMilestoneInput.trim()) {
      setAddingMilestoneSprintId(null);
      return;
    }
    const newM = {
      id: `m-${Date.now()}`,
      title: newMilestoneInput.trim(),
      status: 'upcoming' as const,
    };
    setSprints((prev) =>
      prev.map((s) => {
        if (s.id !== sprintId) return s;
        const updated = [...s.milestones, newM];
        const completedCount = updated.filter((m) => m.status === 'completed').length;
        const pct = Math.round((completedCount / updated.length) * 100);
        updateSprintMilestones(sprintId, updated, pct);
        return { ...s, milestones: updated, progressPercent: pct };
      })
    );
    setNewMilestoneInput('');
    setAddingMilestoneSprintId(null);
  };

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
          detail: `${sizeStr} • Document`,
          size: file.size,
          fileObject: file,
        },
      ]);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsPlusMenuOpen(false);
  };

  const handleRemoveResource = (id: string) => {
    setNewResources((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let days = 3;
    if (newTimeframe.includes('5-Day')) days = 5;
    else if (newTimeframe.includes('1-Week')) days = 7;
    else if (newTimeframe.includes('2-Week')) days = 14;

    const milestones = newMilestonesText.trim()
      ? newMilestonesText
          .split('\n')
          .filter((line) => line.trim())
          .map((line, idx) => ({
            id: `m-${Date.now()}-${idx}`,
            title: line.replace(/^[-*•\d.]+\s*/, '').trim(),
            status: (idx === 0 ? 'in-progress' : 'upcoming') as 'in-progress' | 'upcoming',
          }))
      : [
          { id: `m-${Date.now()}-1`, title: '1. First-Principles Foundations', status: 'in-progress' as const },
          { id: `m-${Date.now()}-2`, title: '2. Core Mechanics & Derivations', status: 'upcoming' as const },
          { id: `m-${Date.now()}-3`, title: '3. Real-World Applications & Edge Cases', status: 'upcoming' as const },
        ];

    const newSprint: LearningSprint = {
      id: `sprint-${Date.now()}`,
      title: newTitle.trim(),
      subject: newSubject.trim() || 'General Science',
      timeframe: newTimeframe,
      daysRemaining: days,
      totalDays: days,
      progressPercent: 0,
      milestones,
      resources: newResources,
      createdAt: 'Just now',
    };

    setSprints((prev) => [newSprint, ...prev]);

    // Save to backend database API
    createSprint(newSprint).catch((err) =>
      console.warn('Failed to sync new sprint with backend:', err)
    );

    setNewTitle('');
    setNewSubject('');
    setNewTimeframe('3-Day Sprint');
    setNewMilestonesText('');
    setNewResources([]);
    setIsCreateModalOpen(false);
  };

  const handleDeleteSprint = (id: string) => {
    if (window.confirm('Are you sure you want to delete this learning sprint?')) {
      setSprints((prev) => prev.filter((s) => s.id !== id));
      deleteSprint(id).catch((err) =>
        console.warn('Failed to delete sprint from database:', err)
      );
    }
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

  const filteredSprints = sprints.filter((s) => {
    if (activeFilter === 'active') return s.progressPercent < 100;
    if (activeFilter === 'completed') return s.progressPercent === 100;
    return true;
  });

  // Spotlight sprint for Hero Stage
  const activeSpotlight = sprints.find((s) => s.progressPercent < 100) || sprints[0];

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
      <div className="pb-4 border-b border-blue-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 mb-1">
            <Zap className="w-4 h-4" />
            <span>Fast-Track Subject Mastery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            Sprints
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
            Focused multi-day sprints with daily milestones and AI-guided derivations on the blackboard.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToChat}
            className="px-3.5 py-2 rounded-xl bg-[#1a2130] hover:bg-[#222c40] text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 border border-blue-900/30"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Sprint</span>
          </button>
        </div>
      </div>

      {/* Hero Stage: Active Sprint Spotlight Banner */}
      {activeSpotlight && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e1628] via-[#111c33] to-[#0c1220] border border-blue-500/30 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/20 text-sky-300 border border-blue-500/40">
                  {activeSpotlight.subject}
                </span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40">
                  <Clock className="w-3 h-3" />
                  <span>{activeSpotlight.daysRemaining} days remaining</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  • {activeSpotlight.timeframe}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] tracking-tight">
                {activeSpotlight.title}
              </h2>

              {/* Current Active Milestone Preview */}
              {(() => {
                const currentM =
                  activeSpotlight.milestones.find((m) => m.status === 'in-progress') ||
                  activeSpotlight.milestones.find((m) => m.status === 'upcoming') ||
                  activeSpotlight.milestones[0];
                return currentM ? (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Target className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>Next milestone:</span>
                    <span className="font-semibold text-sky-200 truncate">{currentM.title}</span>
                  </div>
                ) : null;
              })()}

              {/* Attached materials count */}
              {activeSpotlight.resources.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                  <Paperclip className="w-3.5 h-3.5 text-sky-400" />
                  <span>{activeSpotlight.resources.length} study material(s) attached</span>
                </div>
              )}
            </div>

            {/* Right Side: Progress & Launch Action */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4 shrink-0">
              <div className="space-y-1.5 w-full sm:w-60 lg:text-right">
                <div className="flex justify-between lg:justify-end gap-3 text-xs">
                  <span className="text-slate-400">Mastery Progress</span>
                  <span className="font-mono font-bold text-sky-300">
                    {activeSpotlight.progressPercent}%
                  </span>
                </div>
                <div className="w-full bg-[#1b253b] h-2.5 rounded-full overflow-hidden border border-blue-950">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-sky-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${activeSpotlight.progressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 font-mono block">
                  {activeSpotlight.milestones.filter((m) => m.status === 'completed').length} of{' '}
                  {activeSpotlight.milestones.length} milestones completed
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  onStartSprintSession(activeSpotlight.title, activeSpotlight.resources, 'Advanced')
                }
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-bold shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Sprint Live Session</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Filter Tabs & Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="inline-flex rounded-xl bg-[#141b2b] p-1 border border-blue-900/30">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Sprints ({sprints.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('active')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFilter === 'active'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active ({sprints.filter((s) => s.progressPercent < 100).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('completed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFilter === 'completed'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mastered ({sprints.filter((s) => s.progressPercent === 100).length})
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredSprints.length} sprint(s)
        </span>
      </div>

      {/* Modern Editorial List Directory (Anti-Card Overload) */}
      <div className="rounded-3xl bg-[#0f1422] border border-blue-900/30 overflow-hidden shadow-xl divide-y divide-blue-900/20">
        {filteredSprints.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white font-['Outfit']">No Learning Sprints Found</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Create a focused sprint with targeted milestones to master complex concepts rapidly.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Create First Sprint</span>
            </button>
          </div>
        ) : (
          filteredSprints.map((sprint) => {
            const isExpanded = expandedSprintIds.has(sprint.id);
            const isCompleted = sprint.progressPercent === 100;
            const completedCount = sprint.milestones.filter((m) => m.status === 'completed').length;

            return (
              <div key={sprint.id} className="transition-colors hover:bg-[#131b2d]/60">
                {/* Main List Row */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Indicator & Title */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <span className="relative flex h-4 w-4 mt-0.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600"></span>
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/15 text-sky-300 border border-blue-500/30">
                          {sprint.subject}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {sprint.timeframe}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{sprint.daysRemaining}d remaining</span>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white font-['Outfit'] truncate">
                        {sprint.title}
                      </h3>
                    </div>
                  </div>

                  {/* Center: Progress Metric */}
                  <div className="flex items-center gap-3 shrink-0 md:w-56">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 text-[11px] font-mono">
                          {completedCount} / {sprint.milestones.length} milestones
                        </span>
                        <span className={`font-mono font-bold text-xs ${isCompleted ? 'text-emerald-400' : 'text-sky-300'}`}>
                          {sprint.progressPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-[#1b253b] h-2 rounded-full overflow-hidden border border-blue-950">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-emerald-400' : 'bg-gradient-to-r from-blue-600 to-sky-400'
                          }`}
                          style={{ width: `${sprint.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleExpandSprint(sprint.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#192236] hover:bg-[#202b44] text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 border border-blue-900/30"
                    >
                      <span>Milestones</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onStartSprintSession(sprint.title, sprint.resources, 'Advanced')}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Session</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSprint(sprint.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete sprint"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Milestones Roadmap Panel */}
                {isExpanded && (
                  <div className="bg-[#0b0f19] px-6 py-4 border-t border-blue-900/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 font-mono flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Sprint Milestones Roadmap</span>
                      </span>
                      <span className="text-xs text-slate-400">
                        Click checkboxes to mark progress
                      </span>
                    </div>

                    <div className="space-y-2">
                      {sprint.milestones.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#12192a] border border-blue-900/20 hover:border-blue-700/40 transition-all group/item"
                        >
                          <div
                            onClick={() => handleToggleMilestone(sprint.id, m.id)}
                            className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                          >
                            <input
                              type="checkbox"
                              checked={m.status === 'completed'}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 cursor-pointer"
                            />
                            <span
                              className={`text-xs truncate ${
                                m.status === 'completed'
                                  ? 'line-through text-slate-500'
                                  : m.status === 'in-progress'
                                  ? 'text-sky-200 font-semibold'
                                  : 'text-slate-300'
                              }`}
                            >
                              {m.title}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              onStartSprintSession(
                                `${sprint.title} - ${m.title}`,
                                sprint.resources,
                                'Advanced'
                              )
                            }
                            className="opacity-0 group-hover/item:opacity-100 px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-sky-300 border border-blue-500/30 text-[11px] font-mono transition-all cursor-pointer shrink-0"
                          >
                            Study ➔
                          </button>
                        </div>
                      ))}

                      {/* Inline Add Milestone */}
                      {addingMilestoneSprintId === sprint.id ? (
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Milestone title..."
                            value={newMilestoneInput}
                            onChange={(e) => setNewMilestoneInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddMilestoneInline(sprint.id);
                              if (e.key === 'Escape') setAddingMilestoneSprintId(null);
                            }}
                            className="flex-1 bg-[#12192a] border border-blue-500/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddMilestoneInline(sprint.id)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer hover:bg-blue-500"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingMilestoneSprintId(null)}
                            className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAddingMilestoneSprintId(sprint.id);
                            setNewMilestoneInput('');
                          }}
                          className="w-full py-2 text-xs text-slate-400 hover:text-sky-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-dashed border-blue-900/30 hover:border-blue-500/40 rounded-xl mt-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Milestone</span>
                        </button>
                      )}
                    </div>

                    {/* Attached Resources */}
                    {sprint.resources.length > 0 && (
                      <div className="pt-2 border-t border-blue-900/20 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono flex items-center gap-1 mr-1">
                          <Paperclip className="w-3.5 h-3.5 text-sky-400" />
                          <span>Materials:</span>
                        </span>
                        {sprint.resources.map((res) => (
                          <span
                            key={res.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#12192a] border border-blue-900/30 text-xs text-slate-300"
                          >
                            {res.type === 'youtube' ? (
                              <SquarePlay className="w-3 h-3 text-rose-400" />
                            ) : res.type === 'link' ? (
                              <Link2 className="w-3 h-3 text-cyan-400" />
                            ) : (
                              <FileText className="w-3 h-3 text-sky-400" />
                            )}
                            <span className="truncate max-w-[200px]">{res.title}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Create Sprint */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-[#0f1422] border border-blue-900/40 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-blue-900/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-sky-400 flex items-center justify-center border border-blue-500/30">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Outfit']">
                    Create New Sprint
                  </h3>
                  <span className="text-[11px] text-slate-400">Define your sprint topic, timeframe, and study materials</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#1a2130] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSprint} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-mono">
                  Sprint Topic or Subject to Master *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Multivariable Calculus in 3 Days or Build a Transformer from Scratch"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#141b2b] border border-blue-900/40 focus:border-blue-500 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-mono">
                    Subject / Field
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics, Machine Learning, Systems"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full bg-[#141b2b] border border-blue-900/40 focus:border-blue-500 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-mono">
                    Target Timeframe
                  </label>
                  <select
                    value={newTimeframe}
                    onChange={(e) => setNewTimeframe(e.target.value)}
                    className="w-full bg-[#141b2b] border border-blue-900/40 focus:border-blue-500 rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none cursor-pointer"
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
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-mono">
                  Milestones (1 per line)
                </label>
                <textarea
                  rows={3}
                  placeholder={"1. Core Concepts & Foundations\n2. Key Mathematical Derivations\n3. Practical Implementation"}
                  value={newMilestonesText}
                  onChange={(e) => setNewMilestonesText(e.target.value)}
                  className="w-full bg-[#141b2b] border border-blue-900/40 focus:border-blue-500 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none leading-relaxed resize-none font-mono"
                />
              </div>

              {/* Attach Materials */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 font-mono">
                  Attach Study Materials (PDFs, Web URLs, YouTube)
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative" ref={plusMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                      className="px-3 py-1.5 rounded-xl bg-[#1a2130] hover:bg-[#222c40] text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 border border-blue-900/40"
                    >
                      <Plus className="w-3.5 h-3.5 text-sky-400" />
                      <span>Attach Resource</span>
                    </button>

                    {isPlusMenuOpen && (
                      <div className="absolute left-0 bottom-full mb-2 w-52 rounded-2xl bg-[#0f1422] border border-blue-900/40 shadow-2xl p-1.5 z-30 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full px-3 py-2 rounded-xl text-left text-xs text-slate-300 hover:text-white hover:bg-[#1a2130] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-sky-400" />
                          <span>Upload Document (PDF)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            setIsUrlModalOpen(true);
                          }}
                          className="w-full px-3 py-2 rounded-xl text-left text-xs text-slate-300 hover:text-white hover:bg-[#1a2130] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Globe className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Web Page / Article Link</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            setIsYoutubeModalOpen(true);
                          }}
                          className="w-full px-3 py-2 rounded-xl text-left text-xs text-slate-300 hover:text-white hover:bg-[#1a2130] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <SquarePlay className="w-3.5 h-3.5 text-rose-400" />
                          <span>YouTube Video</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {newResources.map((res) => (
                    <span
                      key={res.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#141b2b] border border-blue-900/40 text-xs text-slate-200"
                    >
                      {res.type === 'youtube' ? (
                        <SquarePlay className="w-3.5 h-3.5 text-rose-400" />
                      ) : res.type === 'link' ? (
                        <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                      )}
                      <span className="truncate max-w-[150px]">{res.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveResource(res.id)}
                        className="text-slate-500 hover:text-rose-400 ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-blue-900/30 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1a2130] hover:bg-[#222c40] text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Sprint</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal: Add URL Link */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#0f1422] border border-blue-900/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Add Web Page / Reference URL</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsUrlModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddUrl} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Web Page Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Stanford CS229 Lecture Notes"
                  value={urlTitleInput}
                  onChange={(e) => setUrlTitleInput(e.target.value)}
                  className="w-full bg-[#141b2b] border border-blue-900/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">URL *</label>
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-[#141b2b] border border-blue-900/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 cursor-pointer"
                >
                  Attach Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal: Add YouTube Link */}
      {isYoutubeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#0f1422] border border-blue-900/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <SquarePlay className="w-4 h-4 text-rose-400" />
                <span>Add YouTube Video Lecture</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsYoutubeModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddYoutube} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Lecture Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 3Blue1Brown Essence of Calculus Chapter 1"
                  value={youtubeTitleInput}
                  onChange={(e) => setYoutubeTitleInput(e.target.value)}
                  className="w-full bg-[#141b2b] border border-blue-900/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">YouTube URL *</label>
                <input
                  type="text"
                  required
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrlInput}
                  onChange={(e) => setYoutubeUrlInput(e.target.value)}
                  className="w-full bg-[#141b2b] border border-blue-900/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsYoutubeModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 cursor-pointer"
                >
                  Attach Video
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
