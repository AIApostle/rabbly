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
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
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
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);
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
    <div className="min-h-screen w-full bg-[#0b0e14] text-[#e2e2e9] flex flex-col font-sans selection:bg-blue-500/30 selection:text-sky-200">
      {/* Editorial Header */}
      <header className="sticky top-0 z-20 border-b border-[#1e2538] bg-[#0b0e14]/90 backdrop-blur-xl px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToChat}
            className="p-2.5 rounded-xl bg-[#131926] hover:bg-[#1a2336] border border-[#232d44] text-[#94a3b8] hover:text-white transition-all cursor-pointer shadow-sm hover:border-blue-500/40"
            title="Return to Composer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500" />
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight font-['Outfit']">
                Curriculum Archive & Knowledge Base
              </h1>
            </div>
            <p className="text-xs text-[#7d8ba1] flex items-center gap-2 mt-0.5">
              <span>Verified AI curricula, dynamic whiteboard schemas, and synthesized notes</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLibrary}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#131926] hover:bg-[#1a2336] border border-[#232d44] text-xs text-[#cbd5e1] hover:text-white transition-all cursor-pointer font-medium hover:border-blue-500/40"
            title="Sync with cloud database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : 'text-blue-400'}`} />
            <span className="hidden sm:inline">Sync Library</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Editorial Telemetry Bar (Replacing Generic 4-Card KPI Grid) */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0f1422] border border-[#1e273d] shadow-sm">
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#8f9eb3]">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-mono text-[#627288]">Archive</span>
              <span className="font-mono text-sm font-bold text-white">{stats.totalCurricula}</span>
              <span className="text-[#627288]">curricula</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-[#2a3650]" />
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-mono text-[#627288]">Syllabus</span>
              <span className="font-mono text-sm font-bold text-sky-400">{stats.totalModules}</span>
              <span className="text-[#627288]">modules</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-[#2a3650]" />
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-mono text-[#627288]">Knowledge</span>
              <span className="font-mono text-sm font-bold text-blue-400">{stats.totalNotes}</span>
              <span className="text-[#627288]">verified notes</span>
            </div>
            {stats.totalSources > 0 && (
              <>
                <div className="w-1 h-1 rounded-full bg-[#2a3650]" />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-mono text-[#627288]">Sources</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">{stats.totalSources}</span>
                  <span className="text-[#627288]">citations</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#7d8ba1] font-mono">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Click any entry to inspect syllabus & notes or launch interactive study</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pb-2">
          {/* Desktop Search Bar */}
          <div className="hidden md:block relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#627288] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, syllabus concept, or subject..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111726] border border-[#232d44] text-xs text-white placeholder-[#627288] focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#627288] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mobile Search Icon Button */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="md:hidden p-2 rounded-xl bg-[#111726] border border-[#232d44] text-[#cbd5e1] hover:text-white transition-colors cursor-pointer"
              title="Search library"
            >
              <Search className="w-4 h-4 text-[#a8c7fa]" />
            </button>
            {/* Level Filter Pills */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[#111726] border border-[#232d44]">
              {['All', 'Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedLevel === lvl
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Subject Selector */}
            {subjects.length > 2 && (
              <div className="relative">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-[#111726] border border-[#232d44] text-xs text-[#cbd5e1] focus:outline-none focus:border-blue-500 cursor-pointer appearance-none pr-8 font-medium"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub === 'All' ? 'All Subjects' : sub}
                    </option>
                  ))}
                </select>
                <SlidersHorizontal className="w-3 h-3 text-[#627288] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Expandable Search Drawer */}
        {isMobileSearchOpen && (
          <div className="md:hidden flex items-center gap-2 p-2 px-3 rounded-2xl bg-[#111726] border border-blue-500/60 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 mb-2">
            <Search className="w-4 h-4 text-blue-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search by topic, concept, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white placeholder-[#627288] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#627288] hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchOpen(false);
                setSearchQuery('');
              }}
              className="text-xs text-blue-400 hover:text-white font-medium pl-1 cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        {/* Editorial Directory Table / List View (Replacing 3-Column Cards) */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#7d8ba1]">
            <div className="w-10 h-10 rounded-2xl bg-[#131926] border border-[#232d44] flex items-center justify-center animate-spin">
              <RefreshCw className="w-5 h-5 text-sky-400" />
            </div>
            <span className="text-xs font-mono">Synchronizing learning directory...</span>
          </div>
        ) : filteredCurricula.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-[#0f1422] border border-[#1e273d] space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 text-sky-400 flex items-center justify-center text-2xl shadow-inner">
              📚
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white font-['Outfit']">
                No Curricula in Directory
              </h3>
              <p className="text-xs text-[#7d8ba1] max-w-sm mx-auto leading-relaxed">
                {searchQuery
                  ? 'No archived syllabi or notes matched your search query. Try broadening your criteria.'
                  : 'You have not archived any curricula yet. Generate your first syllabus in the Learning Composer!'}
              </p>
            </div>
            <button
              onClick={onBackToChat}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Compose New Lesson</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#1e273d] bg-[#0d121c] overflow-hidden shadow-sm">
            {/* Directory Column Headers */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3.5 border-b border-[#1e273d] bg-[#0b0e15] text-[11px] font-mono uppercase tracking-wider text-[#627288]">
              <div className="col-span-6">Topic & Syllabus</div>
              <div className="col-span-2">Subject & Level</div>
              <div className="col-span-2">Scope</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Directory Rows */}
            <div className="divide-y divide-[#182033]">
              {filteredCurricula.map((plan) => (
                <div
                  key={plan.id}
                  className="px-5 sm:px-6 py-4.5 hover:bg-[#121826] transition-colors group flex flex-col lg:grid lg:grid-cols-12 gap-4 items-start lg:items-center"
                >
                  {/* Topic & Description */}
                  <div className="lg:col-span-6 space-y-1.5 w-full">
                    <div className="flex items-center gap-2.5">
                      <h3
                        onClick={() => {
                          setSelectedPlan(plan);
                          setActiveDetailTab('modules');
                        }}
                        className="text-sm font-bold text-white font-['Outfit'] group-hover:text-sky-300 transition-colors cursor-pointer line-clamp-1"
                      >
                        {plan.topic}
                      </h3>
                      {plan.level && (
                        <span className="lg:hidden text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/80 text-sky-300 border border-blue-800/40 font-semibold">
                          {plan.level}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#8f9eb3] line-clamp-1 leading-relaxed">
                      {plan.overview}
                    </p>

                    {/* Preview of first 2 modules */}
                    {plan.modules && plan.modules.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {plan.modules.slice(0, 2).map((mod, mIdx) => (
                          <span
                            key={mIdx}
                            className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#161e30] text-[#93a3b8] border border-[#232d44]"
                          >
                            <span className="text-sky-400 font-bold">M{mIdx + 1}:</span>
                            <span className="truncate max-w-[140px]">{mod.title}</span>
                          </span>
                        ))}
                        {plan.modules.length > 2 && (
                          <span className="text-[10px] font-mono text-[#627288] px-1">
                            +{plan.modules.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Subject & Level Badge */}
                  <div className="lg:col-span-2 flex flex-row lg:flex-col items-center lg:items-start gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-950/70 text-sky-300 border border-blue-800/40 text-[11px] font-medium font-mono">
                      {plan.subject && plan.subject.toLowerCase() !== 'general study' ? plan.subject : 'STEM'}
                    </span>
                    <span className="text-[11px] text-[#7d8ba1] font-mono hidden lg:inline">
                      {plan.level || 'Standard'}
                    </span>
                  </div>

                  {/* Scope: Modules, Notes, Duration */}
                  <div className="lg:col-span-2 space-y-1 text-xs text-[#7d8ba1] font-mono">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[#cbd5e1]">
                        <Layers className="w-3.5 h-3.5 text-sky-400" />
                        <span>{plan.modules?.length || 0} modules</span>
                      </span>
                      <span className="flex items-center gap-1 text-[#94a3b8]">
                        <Clock className="w-3 h-3 text-[#627288]" />
                        <span>{plan.estimatedMinutes}m</span>
                      </span>
                    </div>
                    {plan.lectureNotes && plan.lectureNotes.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-[#627288]">
                        <FileText className="w-3 h-3 text-blue-400" />
                        <span>{plan.lectureNotes.length} notes</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="lg:col-span-2 w-full flex items-center justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#1e273d]">
                    <button
                      onClick={() => {
                        setSelectedPlan(plan);
                        setActiveDetailTab('modules');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#161e30] hover:bg-[#1e2942] border border-[#232d44] hover:border-blue-500/40 text-xs font-semibold text-[#cbd5e1] hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                      <span>Syllabus</span>
                    </button>

                    <button
                      onClick={() => onStudyLesson(plan)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-600/30"
                      title="Open interactive session on Whiteboard"
                    >
                      <span>Study</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Curriculum Detail Drawer / Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-[#232d44] shadow-2xl bg-[#0e131f] overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1e273d] flex items-start justify-between bg-[#111726]">
              <div className="space-y-1.5 max-w-[85%]">
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-sky-300">
                  <span className="px-2 py-0.5 rounded-md bg-blue-950 border border-blue-800/60">
                    {selectedPlan.subject && selectedPlan.subject.toLowerCase() !== 'general study' ? selectedPlan.subject : 'STEM'}
                  </span>
                  <span>•</span>
                  <span>{selectedPlan.level}</span>
                  <span>•</span>
                  <span>{selectedPlan.estimatedMinutes} Mins</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white font-['Outfit'] line-clamp-1">
                  {selectedPlan.topic}
                </h2>
                <p className="text-xs text-[#7d8ba1] line-clamp-2 leading-relaxed">
                  {selectedPlan.overview}
                </p>
              </div>

              <button
                onClick={() => setSelectedPlan(null)}
                className="p-1.5 rounded-xl bg-[#192236] hover:bg-[#202c46] text-[#7d8ba1] hover:text-white transition-colors cursor-pointer border border-[#232d44]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#1e273d] px-5 pt-2 gap-4 text-xs font-semibold bg-[#0d121c]">
              <button
                onClick={() => setActiveDetailTab('modules')}
                className={`pb-2.5 transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeDetailTab === 'modules'
                    ? 'border-blue-500 text-sky-300'
                    : 'border-transparent text-[#7d8ba1] hover:text-[#cbd5e1]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Modules ({selectedPlan.modules?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('notes')}
                className={`pb-2.5 transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeDetailTab === 'notes'
                    ? 'border-blue-500 text-sky-300'
                    : 'border-transparent text-[#7d8ba1] hover:text-[#cbd5e1]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Key Notes ({selectedPlan.lectureNotes?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('sources')}
                className={`pb-2.5 transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeDetailTab === 'sources'
                    ? 'border-blue-500 text-sky-300'
                    : 'border-transparent text-[#7d8ba1] hover:text-[#cbd5e1]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Sources & Citations ({selectedPlan.sourceMaterials?.length || 0})</span>
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
                      className="p-4 rounded-2xl bg-[#121826] border border-[#232d44] space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <h4 className="text-xs font-bold text-white font-['Outfit']">
                            {mod.title}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-[#7d8ba1] px-2 py-0.5 rounded-full bg-[#192236] border border-[#232d44]">
                          {mod.duration}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#cbd5e1] ml-6 leading-relaxed">
                        {mod.description}
                      </p>
                      {mod.keyTakeaways && mod.keyTakeaways.length > 0 && (
                        <div className="ml-6 space-y-1 pt-1.5 border-t border-[#1e273d]">
                          {mod.keyTakeaways.map((takeaway, tIdx) => (
                            <div key={tIdx} className="flex items-start gap-1.5 text-[11px] text-[#8f9eb3]">
                              <ChevronRight className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
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
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sky-300 text-xs flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Key mathematical definitions, architecture notes, and foundational concepts.</span>
                  </div>

                  {selectedPlan.lectureNotes && selectedPlan.lectureNotes.length > 0 ? (
                    selectedPlan.lectureNotes.map((note, nIdx) => (
                      <div
                        key={nIdx}
                        className="p-4 rounded-2xl bg-[#121826] border border-[#232d44] text-xs text-[#e2e2e9] leading-relaxed font-mono whitespace-pre-wrap"
                      >
                        <span className="text-sky-400 font-bold block mb-1">
                          Key Note #{nIdx + 1}
                        </span>
                        {note}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-[#7d8ba1] rounded-2xl bg-[#121826] border border-[#232d44]">
                      No lecture notes were generated for this curriculum yet.
                    </div>
                  )}
                </div>
              )}

              {/* 3. Sources Tab */}
              {activeDetailTab === 'sources' && (
                <div className="space-y-3">
                  {selectedPlan.sourceMaterials && selectedPlan.sourceMaterials.length > 0 ? (
                    selectedPlan.sourceMaterials.map((source, sIdx) => (
                      <div
                        key={source.id || sIdx}
                        className="p-4 rounded-2xl bg-[#121826] border border-[#232d44] space-y-2"
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
                              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono hover:underline"
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
                          <p className="text-[11px] text-[#7d8ba1] font-mono">
                            {source.detail}
                          </p>
                        )}
                        {source.snippet && (
                          <p className="text-[11px] text-[#cbd5e1] leading-relaxed pt-1 border-t border-[#1e273d]">
                            {source.snippet}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-[#7d8ba1] rounded-2xl bg-[#121826] border border-[#232d44]">
                      No explicit citations or reference documents were attached to this session.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#1e273d] bg-[#111726] flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedPlan(null)}
                className="px-4 py-2.5 rounded-xl bg-[#192236] hover:bg-[#202c46] text-xs font-semibold text-[#cbd5e1] hover:text-white transition-colors cursor-pointer border border-[#232d44]"
              >
                Close
              </button>

              <button
                onClick={() => {
                  onStudyLesson(selectedPlan);
                  setSelectedPlan(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-600/30 flex items-center gap-2"
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

