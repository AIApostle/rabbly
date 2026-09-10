import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Clock,
  Layers,
  FileText,
  Bookmark,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  X,
  Library as LibraryIcon,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import type { LessonPlan } from '../types';
import { fetchLibraryCurricula } from '../services/curriculumService';

interface LibraryPageProps {
  onStudyLesson: (plan: LessonPlan) => void;
  onBackToChat: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  onStudyLesson,
  onBackToChat,
}) => {
  const [curricula, setCurricula] = useState<LessonPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'modules' | 'notes' | 'sources'>('modules');

  // Load library from backend API
  const loadLibrary = async () => {
    setIsLoading(true);
    try {
      const data = await fetchLibraryCurricula();
      setCurricula(data);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  // Compute distinct subjects for filters
  const subjects = useMemo(() => {
    const set = new Set<string>();
    curricula.forEach((c) => {
      if (c.subject) set.add(c.subject);
    });
    return ['All', ...Array.from(set)];
  }, [curricula]);

  // Filtered list
  const filteredCurricula = useMemo(() => {
    return curricula.filter((c) => {
      const matchesSearch =
        c.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.overview.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.subject && c.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.modules.some((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLevel = selectedLevel === 'All' || c.level === selectedLevel;
      const matchesSubject = selectedSubject === 'All' || c.subject === selectedSubject;

      return matchesSearch && matchesLevel && matchesSubject;
    });
  }, [curricula, searchQuery, selectedLevel, selectedSubject]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalCurricula = curricula.length;
    const totalModules = curricula.reduce((acc, c) => acc + (c.modules?.length || 0), 0);
    const totalNotes = curricula.reduce((acc, c) => acc + (c.lectureNotes?.length || 0), 0);
    const totalSources = curricula.reduce((acc, c) => acc + (c.sourceMaterials?.length || 0), 0);
    return { totalCurricula, totalModules, totalNotes, totalSources };
  }, [curricula]);

  return (
    <div className="min-h-screen w-full bg-[#111318] text-[#e2e2e9] flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[#44474f]/30 bg-[#111318]/90 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToChat}
            className="p-2 rounded-xl bg-[#1d2024] hover:bg-[#282a2f] border border-[#44474f]/40 text-[#c4c6d0] hover:text-white transition-colors cursor-pointer"
            title="Back to Learning Composer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-lg shadow-sm">
              📚
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight font-['Outfit']">
                Curriculum Library & Knowledge Base
              </h1>
              <p className="text-[11px] text-[#8e9099]">
                All AI-generated learning modules, formulas, notes, and sources saved to your profile
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadLibrary}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1d2024] hover:bg-[#282a2f] border border-[#44474f]/40 text-xs text-[#c4c6d0] hover:text-white transition-all cursor-pointer font-medium"
          title="Refresh Library"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden sm:inline">Sync Library</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* KPI Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#1d2024] border border-[#44474f]/40 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              <LibraryIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] font-mono block">
                Curricula
              </span>
              <span className="text-xl font-extrabold text-white font-['Outfit']">
                {stats.totalCurricula}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#1d2024] border border-[#44474f]/40 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] font-mono block">
                Modules
              </span>
              <span className="text-xl font-extrabold text-white font-['Outfit']">
                {stats.totalModules}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#1d2024] border border-[#44474f]/40 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] font-mono block">
                Notes & Formulas
              </span>
              <span className="text-xl font-extrabold text-white font-['Outfit']">
                {stats.totalNotes}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#1d2024] border border-[#44474f]/40 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] font-mono block">
                Sources & Citations
              </span>
              <span className="text-xl font-extrabold text-white font-['Outfit']">
                {stats.totalSources}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8e9099] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, keyword, or formulas..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1d2024] border border-[#44474f]/40 text-xs text-white placeholder-[#8e9099] focus:outline-none focus:border-indigo-500/80 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e9099] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Level Filter */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[#1d2024] border border-[#44474f]/40">
              {['All', 'Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedLevel === lvl
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[#c4c6d0] hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Subject Selector */}
            {subjects.length > 2 && (
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#1d2024] border border-[#44474f]/40 text-xs text-[#c4c6d0] focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    Subject: {sub}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Library Items Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#8e9099]">
            <div className="w-10 h-10 rounded-2xl bg-[#1d2024] border border-[#44474f]/40 flex items-center justify-center animate-spin">
              <RefreshCw className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs font-mono">Loading saved library from Supabase...</span>
          </div>
        ) : filteredCurricula.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#1d2024]/60 border border-[#44474f]/30 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center text-2xl">
              📖
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white font-['Outfit']">
                No Curricula Found
              </h3>
              <p className="text-xs text-[#8e9099] max-w-sm mx-auto">
                {searchQuery
                  ? 'No saved modules or notes matched your search query. Try adjusting filters.'
                  : 'You have not generated any learning curricula yet. Start by typing a prompt in the learning composer!'}
              </p>
            </div>
            <button
              onClick={onBackToChat}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all cursor-pointer"
            >
              Start a New Lesson
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCurricula.map((plan) => (
              <div
                key={plan.id}
                className="p-5 rounded-2xl bg-[#1d2024] border border-[#44474f]/40 hover:border-indigo-500/50 transition-all flex flex-col justify-between group shadow-sm hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div className="space-y-3">
                  {/* Card Header Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono text-[10px] font-bold uppercase tracking-wider">
                      {plan.subject || 'General Study'}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#8e9099] font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{plan.estimatedMinutes}m</span>
                      <span>•</span>
                      <span className="text-indigo-300">{plan.level}</span>
                    </div>
                  </div>

                  {/* Title & Overview */}
                  <div>
                    <h3 className="text-sm font-bold text-white font-['Outfit'] line-clamp-1 group-hover:text-indigo-300 transition-colors">
                      {plan.topic}
                    </h3>
                    <p className="text-xs text-[#c4c6d0] mt-1 line-clamp-2 leading-relaxed">
                      {plan.overview}
                    </p>
                  </div>

                  {/* Breakdown Badges */}
                  <div className="flex items-center gap-3 pt-2 text-[11px] text-[#8e9099] border-t border-[#44474f]/25">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-indigo-400" />
                      <span>{plan.modules?.length || 0} Modules</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-purple-400" />
                      <span>{plan.lectureNotes?.length || 0} Notes</span>
                    </span>
                    {plan.sourceMaterials && plan.sourceMaterials.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-emerald-400" />
                        <span>{plan.sourceMaterials.length} Sources</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-[#44474f]/25 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setActiveDetailTab('modules');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#282a2f] hover:bg-[#31343a] text-xs font-semibold text-[#c4c6d0] hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span>View Notes</span>
                  </button>

                  <button
                    onClick={() => onStudyLesson(plan)}
                    className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                    title="Open in Clean Whiteboard"
                  >
                    <span>Study</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Curriculum Detail Drawer / Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-[#44474f]/50 shadow-2xl bg-[#14161d] overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#44474f]/40 flex items-start justify-between bg-[#191c20]">
              <div className="space-y-1 max-w-[85%]">
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-indigo-300">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800">
                    {selectedPlan.subject}
                  </span>
                  <span>•</span>
                  <span>{selectedPlan.level}</span>
                  <span>•</span>
                  <span>{selectedPlan.estimatedMinutes} Mins</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white font-['Outfit'] line-clamp-1">
                  {selectedPlan.topic}
                </h2>
                <p className="text-xs text-[#8e9099] line-clamp-1">
                  {selectedPlan.overview}
                </p>
              </div>

              <button
                onClick={() => setSelectedPlan(null)}
                className="p-1.5 rounded-xl bg-[#282a2f] hover:bg-[#31343a] text-[#8e9099] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#44474f]/30 px-5 pt-2 gap-4 text-xs font-semibold bg-[#161820]">
              <button
                onClick={() => setActiveDetailTab('modules')}
                className={`pb-2.5 transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeDetailTab === 'modules'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-[#8e9099] hover:text-[#c4c6d0]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Modules ({selectedPlan.modules?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('notes')}
                className={`pb-2.5 transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeDetailTab === 'notes'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-[#8e9099] hover:text-[#c4c6d0]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Key Notes ({selectedPlan.lectureNotes?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('sources')}
                className={`pb-2.5 transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeDetailTab === 'sources'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-[#8e9099] hover:text-[#c4c6d0]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Source Materials ({selectedPlan.sourceMaterials?.length || 0})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed">
              {/* 1. Modules Tab */}
              {activeDetailTab === 'modules' && (
                <div className="space-y-3">
                  {selectedPlan.modules?.map((mod, idx) => (
                    <div
                      key={mod.id || idx}
                      className="p-3.5 rounded-2xl bg-[#1d2024] border border-[#44474f]/40 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <h4 className="text-xs font-bold text-white font-['Outfit']">
                            {mod.title}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-[#8e9099] px-2 py-0.5 rounded-full bg-[#282a2f]">
                          {mod.duration}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#c4c6d0] ml-6 leading-relaxed">
                        {mod.description}
                      </p>
                      {mod.keyTakeaways && mod.keyTakeaways.length > 0 && (
                        <div className="ml-6 space-y-1 pt-1 border-t border-[#44474f]/25">
                          {mod.keyTakeaways.map((takeaway, tIdx) => (
                            <div key={tIdx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                              <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                              <span>{takeaway}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 2. Notes Tab */}
              {activeDetailTab === 'notes' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Key mathematical definitions, architecture notes, and foundational invariants.</span>
                  </div>

                  {selectedPlan.lectureNotes?.map((note, nIdx) => (
                    <div
                      key={nIdx}
                      className="p-3.5 rounded-2xl bg-[#1d2024] border border-[#44474f]/40 text-xs text-[#e2e2e9] leading-relaxed font-mono whitespace-pre-wrap"
                    >
                      <span className="text-indigo-400 font-bold block mb-1">
                        Key Note #{nIdx + 1}
                      </span>
                      {note}
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Sources Tab */}
              {activeDetailTab === 'sources' && (
                <div className="space-y-3">
                  {selectedPlan.sourceMaterials && selectedPlan.sourceMaterials.length > 0 ? (
                    selectedPlan.sourceMaterials.map((source, sIdx) => (
                      <div
                        key={source.id || sIdx}
                        className="p-3.5 rounded-2xl bg-[#1d2024] border border-[#44474f]/40 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold">
                            {source.type}
                          </span>
                          {source.url && (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono hover:underline"
                            >
                              <span>View Reference</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white">
                          {source.title}
                        </h4>
                        {source.detail && (
                          <p className="text-[11px] text-[#8e9099] font-mono">
                            {source.detail}
                          </p>
                        )}
                        {source.snippet && (
                          <p className="text-[11px] text-[#c4c6d0] leading-relaxed pt-1 border-t border-[#44474f]/25">
                            {source.snippet}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-[#8e9099] rounded-2xl bg-[#1d2024]/50 border border-[#44474f]/30">
                      No explicit citations or reference documents were attached to this session.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#44474f]/40 bg-[#191c20] flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedPlan(null)}
                className="px-4 py-2.5 rounded-xl bg-[#282a2f] hover:bg-[#31343a] text-xs font-semibold text-[#c4c6d0] hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                onClick={() => {
                  onStudyLesson(selectedPlan);
                  setSelectedPlan(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <span>Study in Whiteboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default LibraryPage;
