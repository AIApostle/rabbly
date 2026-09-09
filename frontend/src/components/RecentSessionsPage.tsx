import React, { useMemo, useState } from 'react';
import {
  Play,
  RotateCcw,
  Clock,
  Calendar,
  BookOpen,
  ArrowLeft,
  Search,
  CheckCircle2,
  Paperclip,
  Trash2,
  LayoutGrid,
  List,
  Sparkles,
  Hash,
  Award,
} from 'lucide-react';
import type { RecentSessionData } from '../types';

interface RecentSessionsPageProps {
  sessions: RecentSessionData[];
  onContinueSession: (session: RecentSessionData) => void;
  onRestartSession: (session: RecentSessionData) => void;
  onDeleteSession: (sessionId: string) => void;
  onBackToChat: () => void;
}

export const RecentSessionsPage: React.FC<RecentSessionsPageProps> = ({
  sessions,
  onContinueSession,
  onRestartSession,
  onDeleteSession,
  onBackToChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'rows' | 'grid'>('rows');

  // Compute distinct subjects for category chips
  const subjectList = useMemo(() => {
    const subjects = new Set<string>();
    sessions.forEach((s) => {
      if (s.subject) subjects.add(s.subject);
    });
    return ['All', ...Array.from(subjects)];
  }, [sessions]);

  // Overall learning stats
  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const completedCheckpoints = sessions.reduce((acc, s) => acc + (s.completedModules || 0), 0);
    const avgProgress = totalSessions > 0
      ? Math.round(sessions.reduce((acc, s) => acc + (s.progressPercent || 0), 0) / totalSessions)
      : 0;
    return { totalSessions, completedCheckpoints, avgProgress };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch =
        s.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.roomCode && s.roomCode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSubject = selectedSubject === 'All' || s.subject === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [sessions, searchQuery, selectedSubject]);

  // Group sessions by date tag (Today, Yesterday, Earlier)
  const todaySessions = filteredSessions.filter((s) => s.date === 'Today');
  const yesterdaySessions = filteredSessions.filter((s) => s.date === 'Yesterday');
  const earlierSessions = filteredSessions.filter((s) => s.date !== 'Today' && s.date !== 'Yesterday');

  const renderSection = (title: string, items: RecentSessionData[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Calendar className="w-3.5 h-3.5 text-[#a8c7fa]" />
          <h2 className="text-xs uppercase font-bold tracking-wider text-[#8e9099] font-mono">
            {title} ({items.length})
          </h2>
        </div>

        {/* Row Cards Layout */}
        {viewMode === 'rows' ? (
          <div className="space-y-3">
            {items.map((session) => (
              <div
                key={session.id}
                className="group p-4 sm:p-5 rounded-2xl bg-[#1d2024] hover:bg-[#212429] border border-[#44474f]/40 hover:border-[#a8c7fa]/50 transition-all duration-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left info column */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#0842a0]/40 text-[#a8c7fa] border border-[#a8c7fa]/30">
                      {session.subject}
                    </span>
                    <span className="text-[11px] font-mono text-[#8e9099] px-2 py-0.5 rounded-full bg-[#111318]">
                      {session.level}
                    </span>
                    {session.roomCode && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-mono text-[#a8c7fa] px-2 py-0.5 rounded-full bg-[#191c20] border border-[#a8c7fa]/20">
                        <Hash className="w-2.5 h-2.5" />
                        {session.roomCode}
                      </span>
                    )}
                    <span className="text-xs text-[#8e9099] font-mono">
                      • {session.timestamp}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white font-['Outfit'] group-hover:text-[#a8c7fa] transition-colors leading-snug">
                    {session.topic}
                  </h3>

                  {/* Checkpoint & Progress */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#c4c6d0]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{session.completedModules} of {session.totalModules} Checkpoints</span>
                    </span>

                    <span className="text-[#8e9099] hidden sm:inline">•</span>

                    <span className="flex items-center gap-1 text-[#8e9099] truncate max-w-md">
                      <Clock className="w-3.5 h-3.5 text-[#a8c7fa]" />
                      <span>Left off: <strong className="text-[#e2e2e9] font-medium">{session.lastCheckpoint}</strong></span>
                    </span>

                    {session.hasExternalResources && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#8e9099] font-mono">
                        <Paperclip className="w-3 h-3 text-[#a8c7fa]" />
                        <span>{session.resourceName}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action column with Continue Button */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#44474f]/30">
                  <button
                    type="button"
                    onClick={() => onRestartSession(session)}
                    className="p-2 rounded-xl bg-[#282a2f] hover:bg-[#33353a] text-[#c4c6d0] hover:text-white transition-colors cursor-pointer"
                    title="Restart lesson from beginning"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteSession(session.id)}
                    className="p-2 rounded-xl hover:bg-[#282a2f] text-[#8e9099] hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Prominent Enter Class Button */}
                  <button
                    type="button"
                    onClick={() => onContinueSession(session)}
                    className="m3-btn-filled px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#0842a0]/40 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Enter Class</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Grid Cards Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((session) => (
              <div
                key={session.id}
                className="group p-5 rounded-2xl bg-[#1d2024] hover:bg-[#212429] border border-[#44474f]/40 hover:border-[#a8c7fa]/50 transition-all duration-200 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#0842a0]/40 text-[#a8c7fa] border border-[#a8c7fa]/30">
                        {session.subject}
                      </span>
                      <span className="text-[11px] font-mono text-[#8e9099] px-2 py-0.5 rounded-full bg-[#111318]">
                        {session.level}
                      </span>
                      {session.roomCode && (
                        <span className="text-[10px] font-mono text-[#a8c7fa] px-1.5 py-0.5 rounded bg-[#111318] border border-[#a8c7fa]/20">
                          {session.roomCode}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteSession(session.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#282a2f] text-[#8e9099] hover:text-rose-400 transition-all cursor-pointer"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white font-['Outfit'] group-hover:text-[#a8c7fa] transition-colors leading-snug mb-2">
                    {session.topic}
                  </h3>

                  <div className="space-y-1.5 my-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#c4c6d0] font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{session.completedModules} of {session.totalModules} Checkpoints</span>
                      </span>
                      <span className="text-[#a8c7fa] font-mono font-bold">
                        {session.progressPercent}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-[#111318] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0842a0] via-[#4f378b] to-[#a8c7fa] transition-all duration-500"
                        style={{ width: `${session.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#111318] border border-[#44474f]/30 text-xs text-[#c4c6d0] flex items-start gap-2 mb-4">
                    <Clock className="w-3.5 h-3.5 text-[#a8c7fa] shrink-0 mt-0.5" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] uppercase font-bold text-[#8e9099] tracking-wider font-mono">
                        Last Left Off
                      </span>
                      <span className="text-xs text-white truncate font-medium">
                        {session.lastCheckpoint}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#44474f]/30 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#8e9099] font-mono">
                    {session.timestamp}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onRestartSession(session)}
                      className="p-2 rounded-xl bg-[#282a2f] hover:bg-[#33353a] text-[#c4c6d0] hover:text-white transition-colors cursor-pointer"
                      title="Restart lesson from beginning"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onContinueSession(session)}
                      className="m3-btn-filled px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#0842a0]/30 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Enter Class</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col space-y-6">
      {/* Header with Title, Search, and View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#44474f]/30">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#a8c7fa] mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Learning History</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            Recent Sessions
          </h1>
          <p className="text-xs sm:text-sm text-[#c4c6d0] mt-0.5">
            Continue where you left off. Every session preserves your whiteboard illustrations, checkpoints, and formulas.
          </p>
        </div>

        {/* Right Header Actions: Back, View Toggle, and Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Back to Session button */}
          <button
            type="button"
            onClick={onBackToChat}
            className="px-3 py-1.5 rounded-xl bg-[#282a2f] hover:bg-[#33353a] text-xs font-medium text-[#c4c6d0] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Session</span>
          </button>

          {/* View Mode Toggle: Rows vs Grid */}
          <div className="inline-flex rounded-xl bg-[#191c20] p-1 border border-[#44474f]/40">
            <button
              type="button"
              onClick={() => setViewMode('rows')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'rows'
                  ? 'bg-[#282a2f] text-white shadow-sm'
                  : 'text-[#8e9099] hover:text-white'
              }`}
              title="View as Rows"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#282a2f] text-white shadow-sm'
                  : 'text-[#8e9099] hover:text-white'
              }`}
              title="View as Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#8e9099] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by topic or #room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#191c20] border border-[#44474f]/50 focus:border-[#a8c7fa] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#8e9099] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#191c20] border border-[#44474f]/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0842a0]/30 border border-[#a8c7fa]/20 flex items-center justify-center text-[#a8c7fa]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[#8e9099] font-medium">Total Sessions</div>
            <div className="text-lg font-bold text-white font-['Outfit']">{stats.totalSessions}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#191c20] border border-[#44474f]/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[#8e9099] font-medium">Checkpoints Mastered</div>
            <div className="text-lg font-bold text-white font-['Outfit']">{stats.completedCheckpoints}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#191c20] border border-[#44474f]/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[#8e9099] font-medium">Avg. Completion</div>
            <div className="text-lg font-bold text-white font-['Outfit']">{stats.avgProgress}%</div>
          </div>
        </div>
      </div>

      {/* Subject Filter Chips */}
      {subjectList.length > 2 && (
        <div className="flex flex-wrap items-center gap-2">
          {subjectList.map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                selectedSubject === subj
                  ? 'bg-[#a8c7fa] text-[#062e6f] font-semibold shadow-sm'
                  : 'bg-[#1d2024] text-[#c4c6d0] hover:bg-[#282a2f] border border-[#44474f]/40'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-[#191c20] border border-[#44474f]/30 my-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#282a2f] flex items-center justify-center text-2xl mb-3 text-[#8e9099]">
            📖
          </div>
          <h3 className="text-base font-bold text-white font-['Outfit']">
            No sessions found
          </h3>
          <p className="text-xs text-[#c4c6d0] mt-1 max-w-sm">
            {searchQuery
              ? `No sessions match "${searchQuery}".`
              : selectedSubject !== 'All'
                ? `No sessions in "${selectedSubject}".`
                : "You haven't started any learning sessions yet."}
          </p>
          <button
            type="button"
            onClick={onBackToChat}
            className="mt-4 m3-btn-filled px-5 py-2 text-xs font-semibold cursor-pointer"
          >
            Start a New Lesson
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {renderSection('Today', todaySessions)}
          {renderSection('Yesterday', yesterdaySessions)}
          {renderSection('Earlier Sessions', earlierSessions)}
        </div>
      )}
    </div>
  );
};
