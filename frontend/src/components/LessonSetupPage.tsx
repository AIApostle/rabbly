import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  Plus,
  Paperclip,
  FileText,
  Globe,
  Mic,
  Users,
  X,
  SlidersHorizontal,
  Check,
  UploadCloud,
  PanelLeft,
  PanelLeftClose,
  Clock,
  MessageSquare,
  SquarePlay,
  Zap,
  LogOut,
  LogIn,
} from 'lucide-react';
import type { ExternalResource, RecentSessionData } from '../types';
import { RecentSessionsPage } from './RecentSessionsPage';
import { ClassroomHubPage } from './ClassroomHubPage';
import { GoalsPage } from './GoalsPage';
import { getLocalSessions, loadRecentSessions, persistNewSession, removeSession } from '../services/sessionService';
import { getCurrentUser, verifyActiveToken, removeAuthToken, type AuthUser } from '../services/authService';

interface LessonSetupPageProps {
  onBack: () => void;
  onStartLesson: (topic: string, isClassroom: boolean, level: string, file?: File | null, resources?: ExternalResource[]) => void;
  initialTopic?: string;
}

export const LessonSetupPage: React.FC<LessonSetupPageProps> = ({
  onBack,
  onStartLesson,
  initialTopic = '',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // URL-driven navigation view: /classrooms, /recent, /sprints, or /session (default)
  const activeView: 'chat' | 'classrooms' | 'recent' | 'sprints' =
    location.pathname.startsWith('/classrooms')
      ? 'classrooms'
      : location.pathname.startsWith('/recent')
        ? 'recent'
        : location.pathname.startsWith('/sprints') || location.pathname.startsWith('/goals') || location.pathname.startsWith('/projects')
          ? 'sprints'
          : 'chat';

  const navigateToView = (view: 'chat' | 'classrooms' | 'recent' | 'sprints') => {
    if (view === 'chat') {
      navigate('/session');
    } else if (view === 'classrooms') {
      navigate('/classrooms');
    } else if (view === 'recent') {
      navigate('/recent');
    } else if (view === 'sprints') {
      navigate('/sprints');
    }
  };

  const [prompt, setPrompt] = useState(initialTopic);
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [resources, setResources] = useState<ExternalResource[]>([]);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitleInput, setUrlTitleInput] = useState('');
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [youtubeTitleInput, setYoutubeTitleInput] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDepthMenuOpen, setIsDepthMenuOpen] = useState(false);

  // Sidebar States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Recent Sessions Data (Synchronized with backend API and local store)
  const [recentSessions, setRecentSessions] = useState<RecentSessionData[]>(getLocalSessions);

  // Sync recent sessions from backend API on mount
  useEffect(() => {
    let mounted = true;
    loadRecentSessions().then((data) => {
      if (mounted && data) {
        setRecentSessions(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const depthMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getCurrentUser);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Verify and sync active user token
  useEffect(() => {
    let mounted = true;
    verifyActiveToken().then((user) => {
      if (mounted && user) {
        setCurrentUser(user);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSignOut = () => {
    removeAuthToken();
    setCurrentUser(null);
    setIsProfileMenuOpen(false);
    navigate('/login');
  };

  // Auto-resize textarea like ChatGPT
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  // Close popups on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
      if (depthMenuRef.current && !depthMenuRef.current.contains(e.target as Node)) {
        setIsDepthMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFilesSelected = (files: File[]) => {
    const newResources: ExternalResource[] = files.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'file',
      title: file.name,
      detail: `${(file.size / 1024).toFixed(0)} KB`,
      file,
    }));

    setResources((prev) => [...prev, ...newResources]);
    if (!prompt.trim() && files.length > 0) {
      setPrompt(files[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
    }
  };

  const extractYoutubeId = (url: string): string | null => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const handleAddYoutube = (e: React.FormEvent) => {
    e.preventDefault();
    let formattedUrl = youtubeUrlInput.trim();
    if (!formattedUrl) return;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const videoId = extractYoutubeId(formattedUrl);
    const title = youtubeTitleInput.trim() || (videoId ? `YouTube Tutorial (${videoId})` : 'YouTube Video Tutorial');

    const newResource: ExternalResource = {
      id: `yt-${Date.now()}`,
      type: 'youtube',
      title,
      detail: videoId ? `Video: ${videoId}` : 'YouTube Tutorial',
      url: formattedUrl,
      videoId: videoId || undefined,
    };

    setResources((prev) => [...prev, newResource]);
    setYoutubeUrlInput('');
    setYoutubeTitleInput('');
    setIsYoutubeModalOpen(false);
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    let formattedUrl = urlInput.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const isYt = formattedUrl.includes('youtube.com') || formattedUrl.includes('youtu.be');
    const videoId = extractYoutubeId(formattedUrl);

    try {
      const parsed = new URL(formattedUrl);
      const title = urlTitleInput.trim() || (isYt ? (videoId ? `YouTube Tutorial (${videoId})` : 'YouTube Video') : parsed.hostname);
      const newResource: ExternalResource = {
        id: `url-${Date.now()}`,
        type: isYt ? 'youtube' : 'link',
        title,
        detail: isYt ? 'YouTube Video' : parsed.hostname,
        url: formattedUrl,
        videoId: videoId || undefined,
      };

      setResources((prev) => [...prev, newResource]);
      setUrlInput('');
      setUrlTitleInput('');
      setIsUrlModalOpen(false);
    } catch {
      const title = urlTitleInput.trim() || (isYt ? 'YouTube Video' : formattedUrl);
      const newResource: ExternalResource = {
        id: `url-${Date.now()}`,
        type: isYt ? 'youtube' : 'link',
        title,
        detail: isYt ? 'YouTube Video' : 'External Link',
        url: formattedUrl,
        videoId: videoId || undefined,
      };
      setResources((prev) => [...prev, newResource]);
      setUrlInput('');
      setUrlTitleInput('');
      setIsUrlModalOpen(false);
    }
  };

  const removeResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  // "+ New Session" Action
  const handleNewSession = () => {
    navigateToView('chat');
    setPrompt('');
    setResources([]);
    setLevel('Intermediate');
    textareaRef.current?.focus();
  };

  // Continue an existing session from Cards or Dropdown
  const handleContinueSession = (session: RecentSessionData) => {
    onStartLesson(session.topic, session.isClassroom ?? false, session.level, null, []);
  };

  const handleRestartSession = (session: RecentSessionData) => {
    onStartLesson(session.topic, session.isClassroom ?? false, session.level, null, []);
  };

  const handleDeleteRecentSession = (sessionId: string) => {
    removeSession(sessionId);
    setRecentSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  // Submit / Start Lesson (Defaults strictly to 1-on-1)
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() && resources.length === 0) return;

    const finalPrompt = prompt.trim() || (resources.length > 0 ? `Study of ${resources[0].title}` : 'General Lesson');
    const primaryFile = resources.find((r) => r.type === 'file')?.file || null;

    // Persist to backend and update local cache
    persistNewSession({
      topic: finalPrompt,
      subject: 'General Study',
      level,
      hasExternalResources: resources.length > 0,
      resourceName: resources[0]?.title,
    }).then((created) => {
      setRecentSessions((prev) => [created, ...prev.filter((s) => s.topic !== finalPrompt)]);
    });

    // Always starts 1-on-1 by default
    onStartLesson(finalPrompt, false, level, primaryFile, resources);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Curated ChatGPT-Style Prompt Starters
  const starterPrompts = [
    {
      icon: '🧠',
      title: 'Transformers & Self-Attention',
      desc: 'Query, Key, Value matrix mechanics and attention weights',
      category: 'AI / LLMs',
      level: 'Intermediate' as const,
      topic: 'Explain Transformer architecture and how Query, Key, and Value matrices compute self-attention with visual diagrams.',
      resource: {
        id: 'starter-1',
        type: 'link' as const,
        title: 'Attention Is All You Need (Vaswani et al.)',
        detail: 'arxiv.org/abs/1706.03762',
        url: 'https://arxiv.org/abs/1706.03762',
      },
    },
    {
      icon: '⚡',
      title: 'Distributed Rate Limiter',
      desc: 'Token bucket algorithm with Redis cluster and Lua scripts',
      category: 'System Design',
      level: 'Advanced' as const,
      topic: 'Design a distributed rate limiter for high-scale API gateways using Token Bucket and Redis Lua scripts.',
      resource: {
        id: 'starter-2',
        type: 'link' as const,
        title: 'System Design Blueprint: Rate Limiter',
        detail: 'system-design.primer',
        url: 'https://github.com/donnemartin/system-design-primer',
      },
    },
    {
      icon: '⚛️',
      title: 'Quantum Superposition & Qubits',
      desc: 'Bloch sphere geometry, Hadamard gates, and Bell states',
      category: 'Physics',
      level: 'Beginner' as const,
      topic: 'Explain Quantum Superposition, the Bloch sphere, and how Bell states entangle qubits visually.',
      resource: {
        id: 'starter-3',
        type: 'note' as const,
        title: 'Quantum Mechanics Foundations',
        detail: 'Hilbert space & State vectors',
        content: '|ψ⟩ = α|0⟩ + β|1⟩, |α|² + |β|² = 1',
      },
    },
    {
      icon: '🎬',
      title: 'Neural Networks: 3Blue1Brown Tutorial',
      desc: 'Gradient descent, backpropagation & weights animation',
      category: 'Deep Learning',
      level: 'Beginner' as const,
      topic: 'Walk me through the 3Blue1Brown Neural Network video tutorial on gradient descent and weight updates with interactive whiteboard steps.',
      resource: {
        id: 'starter-yt-1',
        type: 'youtube' as const,
        title: '3Blue1Brown: But what is a neural network?',
        detail: 'youtube.com/watch?v=aircAruvnKk',
        url: 'https://www.youtube.com/watch?v=aircAruvnKk',
        videoId: 'aircAruvnKk',
      },
    },
  ];

  const handleSelectStarter = (starter: typeof starterPrompts[0]) => {
    setPrompt(starter.topic);
    setLevel(starter.level);
    setResources([starter.resource]);
  };

  const toggleVoiceInput = () => {
    if (!isVoiceActive) {
      setIsVoiceActive(true);
      const simulatedVoices = [
        "Explain how the Transformer attention head calculates dot-product between Query and Key vectors...",
        "Help me understand how distributed rate limiters handle race conditions in Redis...",
        "How does quantum superposition collapse when measured?",
      ];
      const randomPrompt = simulatedVoices[Math.floor(Math.random() * simulatedVoices.length)];
      setTimeout(() => {
        setPrompt(randomPrompt);
        setIsVoiceActive(false);
      }, 1800);
    } else {
      setIsVoiceActive(false);
    }
  };

  const isSubmitReady = prompt.trim().length > 0 || resources.length > 0;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-screen w-full bg-[#111318] text-[#e2e2e9] flex font-sans selection:bg-[#a8c7fa]/25 selection:text-[#d3e3fd] relative overflow-hidden"
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.doc,.docx,.ppt,.pptx"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Full-Page Glow Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-[#111318]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 border-4 border-dashed border-[#a8c7fa] animate-in fade-in duration-200 pointer-events-none">
          <div className="w-20 h-20 rounded-3xl bg-[#0842a0]/40 border border-[#a8c7fa]/50 text-[#a8c7fa] flex items-center justify-center mb-4 shadow-2xl">
            <UploadCloud className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-white font-['Outfit']">
            Drop study materials anywhere
          </h2>
          <p className="text-sm text-[#c4c6d0] mt-1">
            PDFs, Lecture Notes, Slides, or Markdown files will be attached as external context
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. Collapsible Left Sidebar (ChatGPT-Style) */}
      {/* ======================================================== */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64 sm:w-72' : 'w-0 -translate-x-full'
        } transition-all duration-300 ease-in-out bg-[#17191e] border-r border-[#44474f]/30 flex flex-col shrink-0 z-30 overflow-hidden select-none`}
      >
        {/* Sidebar Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#44474f]/25 shrink-0">
          <div
            onClick={() => navigateToView('chat')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0842a0] via-[#4f378b] to-[#a8c7fa] flex items-center justify-center text-sm shadow-sm border border-[#a8c7fa]/20">
              🐰
            </div>
            <span className="font-extrabold text-base tracking-tight text-white font-['Outfit']">
              Rabbly
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[#282a2f] text-[#8e9099] hover:text-white transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action: New Session Button */}
        <div className="px-3.5 pt-4 pb-2">
          <button
            type="button"
            onClick={handleNewSession}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#212429] hover:bg-[#2c2f35] border border-[#44474f]/40 hover:border-[#a8c7fa]/40 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer group active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4 text-[#a8c7fa] group-hover:rotate-90 transition-transform duration-200" />
              <span>New Session</span>
            </div>
            <span className="text-[10px] text-[#8e9099] font-mono border border-[#44474f]/40 px-1.5 py-0.5 rounded bg-[#17191e]/60">
              ⌘N
            </span>
          </button>
        </div>

        {/* Navigation & Section List */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2">
          {/* Section Label */}
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8e9099] font-mono">
            Navigation
          </div>

          <button
            type="button"
            onClick={() => navigateToView('chat')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeView === 'chat'
                ? 'bg-[#0842a0]/30 text-[#a8c7fa] border border-[#a8c7fa]/30 font-semibold shadow-sm'
                : 'text-[#c4c6d0] hover:bg-[#212429] hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-[#a8c7fa]" />
              <span>AI Tutor</span>
            </div>
          </button>

          {/* Dedicated Sprints Page link */}
          <button
            type="button"
            onClick={() => navigateToView('sprints')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeView === 'sprints'
                ? 'bg-gradient-to-r from-amber-950/50 to-orange-950/50 text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                : 'text-[#c4c6d0] hover:bg-[#212429] hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Sprints</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-medium border border-amber-500/30">
              Sprint
            </span>
          </button>

          {/* Dedicated Classroom Page link */}
          <button
            type="button"
            onClick={() => navigateToView('classrooms')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeView === 'classrooms'
                ? 'bg-[#4f378b]/40 text-[#d0bcff] border border-[#d0bcff]/40 font-semibold shadow-sm'
                : 'text-[#c4c6d0] hover:bg-[#212429] hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-[#d0bcff]" />
              <span>Classrooms</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#4f378b]/30 text-[#d0bcff] font-mono font-medium border border-[#d0bcff]/20">
              Rooms
            </span>
          </button>

          {/* Dedicated Recent Sessions Page link */}
          <button
            type="button"
            onClick={() => navigateToView('recent')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeView === 'recent'
                ? 'bg-[#0842a0]/40 text-[#a8c7fa] border border-[#a8c7fa]/40 font-semibold shadow-sm'
                : 'text-[#c4c6d0] hover:bg-[#212429] hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-[#a8c7fa]" />
              <span>Recent Sessions</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0842a0]/40 text-[#a8c7fa] font-mono font-medium border border-[#a8c7fa]/20">
              {recentSessions.length}
            </span>
          </button>
        </div>

        {/* Sidebar Footer: Dynamic User Profile & Back to Home */}
        <div ref={profileMenuRef} className="p-3.5 border-t border-[#44474f]/25 shrink-0 bg-[#14161a] relative">
          {/* Profile Dropdown Popover */}
          {isProfileMenuOpen && (
            <div className="absolute left-3.5 right-3.5 bottom-16 rounded-2xl bg-[#1d2024] border border-[#44474f]/60 shadow-2xl p-3 z-40 flex flex-col gap-2.5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2.5 pb-2 border-b border-[#44474f]/30">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0842a0] to-[#4f378b] flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0 border border-white/10">
                  {currentUser?.fullName
                    ? currentUser.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : currentUser?.email
                      ? currentUser.email.slice(0, 2).toUpperCase()
                      : 'ST'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate">
                    {currentUser?.fullName || (currentUser?.email ? currentUser.email.split('@')[0] : 'Guest Student')}
                  </span>
                  <span className="text-[10px] text-[#8e9099] truncate font-mono">
                    {currentUser?.email || 'Not logged in'}
                  </span>
                </div>
              </div>

              {currentUser ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0842a0]/40 hover:bg-[#0842a0] text-[#a8c7fa] hover:text-white border border-[#a8c7fa]/30 text-xs font-medium transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In / Create Account</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#212429]/70 transition-colors">
            <div
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-3 min-w-0 cursor-pointer group"
              title="Click to manage profile"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0842a0] to-[#4f378b] group-hover:ring-2 group-hover:ring-[#a8c7fa] flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0 border border-white/10 transition-all">
                {currentUser?.fullName
                  ? currentUser.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : currentUser?.email
                    ? currentUser.email.slice(0, 2).toUpperCase()
                    : 'ST'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate group-hover:text-[#a8c7fa] transition-colors">
                  {currentUser?.fullName || (currentUser?.email ? currentUser.email.split('@')[0] : 'Guest Student')}
                </span>
                <span className="text-[10px] text-[#a8c7fa] font-mono">
                  {currentUser ? (currentUser.preferredLevel || 'Student') : 'Sign In'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onBack();
                navigate('/');
              }}
              className="p-2 rounded-lg hover:bg-[#282a2f] text-[#8e9099] hover:text-white transition-colors cursor-pointer"
              title="Return to Landing Page"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. Main Stage (Switches between Chat, Classrooms, Recent) */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* Stationary Top App Bar (Header stays fixed while content flows under it) */}
        <header className="h-14 w-full border-b border-[#44474f]/25 bg-[#111318]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Sidebar Expand Button (when collapsed) */}
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-[#282a2f] text-[#c4c6d0] hover:text-white transition-colors cursor-pointer"
                title="Open sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            {/* Clean Minimalist Brand Logo (No 'Gemini 2.0 Live' text) */}
            <div
              onClick={() => navigateToView('chat')}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="text-lg">🐰</span>
              <span className="font-extrabold text-sm text-white font-['Outfit'] tracking-tight">
                Rabbly
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Content Container: Everything flows smoothly underneath the stationary header */}
        <div className="flex-1 overflow-y-auto min-h-0 w-full relative">

        {/* View 1: Dedicated Classroom Page */}
        {activeView === 'classrooms' && (
          <ClassroomHubPage
            onJoinRoom={(roomCode) => {
              onStartLesson(`Classroom: ${roomCode}`, true, 'Intermediate', null, []);
            }}
            onCreateRoom={(topic, resources, level) => {
              onStartLesson(topic, true, level || 'Intermediate', null, resources || []);
            }}
            onBackToChat={() => navigateToView('chat')}
          />
        )}

        {/* View 2: Dedicated Sprints Page */}
        {activeView === 'sprints' && (
          <GoalsPage
            onStartSprintSession={(sprintTopic, resources, level) => {
              onStartLesson(sprintTopic, false, level || 'Intermediate', null, resources || []);
            }}
            onBackToChat={() => navigateToView('chat')}
          />
        )}

        {/* View 2: Dedicated Recent Sessions Page with Cards & Continue Learning */}
        {activeView === 'recent' && (
          <RecentSessionsPage
            sessions={recentSessions}
            onContinueSession={handleContinueSession}
            onRestartSession={handleRestartSession}
            onDeleteSession={handleDeleteRecentSession}
            onBackToChat={() => navigateToView('chat')}
          />
        )}

        {/* View 3: Clean AI-First ChatGPT Chat Interface (Default) */}
        {activeView === 'chat' && (
          <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center py-8 z-10 my-auto">
            {/* Greeting */}
            <div className="text-center mb-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#0842a0] via-[#4f378b] to-[#a8c7fa] flex items-center justify-center text-3xl shadow-xl shadow-[#0842a0]/30 border border-[#a8c7fa]/30 mb-4 animate-in zoom-in-90 duration-300">
                🐰
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white font-['Outfit'] tracking-tight">
                What would you like to master today?
              </h1>
              <p className="text-sm sm:text-base text-[#c4c6d0] mt-2 max-w-lg leading-relaxed">
                Enter any topic or attach study materials. Rabbly will structure the lesson and begin teaching you visually and verbally in real time.
              </p>
            </div>

            {/* The Core ChatGPT Omnibar (Input Box) */}
            <div className="w-full max-w-3xl rounded-3xl bg-[#1d2024] border border-[#44474f]/50 hover:border-[#44474f]/80 focus-within:border-[#a8c7fa]/60 focus-within:ring-4 focus-within:ring-[#0842a0]/20 transition-all duration-200 shadow-2xl shadow-black/70 flex flex-col p-3 sm:p-4">
              {/* Attached External Resources Tray */}
              {resources.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pb-3 mb-2 border-b border-[#44474f]/30">
                  {resources.map((res) => (
                    <div
                      key={res.id}
                      className="group inline-flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-xl bg-[#282a2f] border border-[#44474f]/50 text-xs text-white max-w-xs transition-all hover:border-[#a8c7fa]/50"
                    >
                      {res.type === 'file' ? (
                        <FileText className="w-3.5 h-3.5 text-[#a8c7fa] shrink-0" />
                      ) : res.type === 'youtube' ? (
                        <SquarePlay className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : res.type === 'link' ? (
                        <Globe className="w-3.5 h-3.5 text-[#78f8e7] shrink-0" />
                      ) : (
                        <Paperclip className="w-3.5 h-3.5 text-[#d0bcff] shrink-0" />
                      )}

                      <div className="flex flex-col min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-xs truncate">{res.title}</span>
                          {res.type === 'youtube' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono shrink-0">
                              YouTube
                            </span>
                          )}
                        </div>
                        {res.detail && (
                          <span className="text-[10px] text-[#8e9099] truncate font-mono">{res.detail}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeResource(res.id)}
                        className="p-1 rounded-lg hover:bg-[#37393e] text-[#8e9099] hover:text-white transition-colors cursor-pointer"
                        title="Remove resource"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Prompt Textarea */}
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Ask Rabbly anything, paste a concept, or drop study notes..."
                className="w-full bg-transparent resize-none text-white placeholder-[#8e9099] text-base sm:text-lg focus:outline-none leading-relaxed font-sans px-1"
              />

              {/* Bottom Toolbar inside Omnibar (Pure 1-on-1, NO mode toggle) */}
              <div className="flex items-center justify-between pt-3 mt-1">
                {/* Left Controls: Plus Menu & Depth Selector */}
                <div className="flex items-center gap-2">
                  {/* Plus Button Menu */}
                  <div ref={plusMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                      className={`p-2 rounded-full transition-all cursor-pointer ${
                        isPlusMenuOpen
                          ? 'bg-[#a8c7fa] text-[#062e6f]'
                          : 'bg-[#282a2f] hover:bg-[#33353a] text-[#c4c6d0] hover:text-white'
                      }`}
                      title="Add external resource or study material"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {isPlusMenuOpen && (
                      <div className="absolute left-0 bottom-12 w-72 rounded-2xl bg-[#1d2024] border border-[#44474f]/60 shadow-2xl p-1.5 z-30 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                        {/* 1. Document / File */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            fileInputRef.current?.click();
                          }}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#282a2f] text-xs font-medium text-white transition-colors text-left cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#0842a0]/40 text-[#a8c7fa] flex items-center justify-center shrink-0">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-semibold">Attach Document / Notes</span>
                            <span className="text-[10px] text-[#8e9099]">PDF, TXT, DOCX, Markdown</span>
                          </div>
                        </button>

                        {/* 2. YouTube Video Tutorial Link */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            setIsYoutubeModalOpen(true);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#282a2f] text-xs font-medium text-white transition-colors text-left cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                            <SquarePlay className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-semibold flex items-center gap-1.5">
                              <span>Add YouTube Video Tutorial</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono">Video</span>
                            </span>
                            <span className="text-[10px] text-[#8e9099]">Lectures, tutorials & walkthroughs</span>
                          </div>
                        </button>

                        {/* 3. Web Link / Paper URL */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlusMenuOpen(false);
                            setIsUrlModalOpen(true);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#282a2f] text-xs font-medium text-white transition-colors text-left cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#005353]/40 text-[#78f8e7] flex items-center justify-center shrink-0">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-semibold">Add Web Link / Paper URL</span>
                            <span className="text-[10px] text-[#8e9099]">arXiv, docs, research link</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Explanatory Depth Selector */}
                  <div ref={depthMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDepthMenuOpen(!isDepthMenuOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#282a2f] hover:bg-[#33353a] border border-[#44474f]/40 text-xs font-medium text-[#c4c6d0] hover:text-white transition-all cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-[#a8c7fa]" />
                      <span>Depth: {level}</span>
                    </button>

                    {isDepthMenuOpen && (
                      <div className="absolute left-0 bottom-11 w-44 rounded-2xl bg-[#1d2024] border border-[#44474f]/60 shadow-xl p-1.5 z-30 flex flex-col gap-1">
                        {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => {
                              setLevel(lvl);
                              setIsDepthMenuOpen(false);
                            }}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                              level === lvl
                                ? 'bg-[#0842a0] text-white font-semibold'
                                : 'text-[#c4c6d0] hover:bg-[#282a2f] hover:text-white'
                            }`}
                          >
                            <span>{lvl}</span>
                            {level === lvl && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Controls: Voice Dictation & Send Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`p-2 rounded-full transition-all cursor-pointer ${
                      isVoiceActive
                        ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/30'
                        : 'bg-[#282a2f] hover:bg-[#33353a] text-[#c4c6d0] hover:text-white'
                    }`}
                    title={isVoiceActive ? 'Listening...' : 'Voice prompt'}
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={!isSubmitReady}
                    id="setup-enter-class-btn"
                    className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-md ${
                      isSubmitReady
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-emerald-400 text-white hover:scale-105 active:scale-95 shadow-indigo-500/30'
                        : 'bg-[#282a2f] text-[#8e9099] cursor-not-allowed opacity-50'
                    }`}
                    title="Enter Class (Start analysis & lesson)"
                  >
                    <span className="inline">Enter Class</span>
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Hotkey Hint */}
            <div className="text-[11px] text-[#8e9099] mt-3 font-mono flex items-center gap-2">
              <span>Press ↵ to launch visual lecture</span>
              <span>•</span>
              <span>Shift + ↵ for new line</span>
            </div>

            {/* Curated Prompt Starters */}
            <div className="w-full max-w-3xl mt-10">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs uppercase font-bold tracking-widest text-[#8e9099] font-mono">
                  Suggested Breakthrough Topics
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {starterPrompts.map((starter) => (
                  <div
                    key={starter.title}
                    onClick={() => handleSelectStarter(starter)}
                    className="group p-4 rounded-2xl bg-[#191c20] hover:bg-[#1d2024] border border-[#44474f]/30 hover:border-[#a8c7fa]/50 transition-all duration-200 cursor-pointer shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{starter.icon}</span>
                          <h3 className="text-sm font-bold text-white font-['Outfit'] group-hover:text-[#a8c7fa] transition-colors">
                            {starter.title}
                          </h3>
                        </div>
                        <span className="text-[10px] text-[#8e9099] px-2 py-0.5 rounded-full bg-[#111318] border border-[#44474f]/30 font-mono">
                          {starter.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#c4c6d0] leading-relaxed">
                        {starter.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#44474f]/20 flex items-center justify-between text-[11px] text-[#8e9099]">
                      <span className="flex items-center gap-1.5 font-mono truncate max-w-[220px]">
                        {starter.resource.type === 'youtube' ? (
                          <SquarePlay className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        ) : starter.resource.type === 'link' ? (
                          <Globe className="w-3.5 h-3.5 text-[#78f8e7] shrink-0" />
                        ) : (
                          <Paperclip className="w-3.5 h-3.5 text-[#a8c7fa] shrink-0" />
                        )}
                        <span className="truncate">{starter.resource.title}</span>
                      </span>
                      <span className="group-hover:translate-x-1 transition-transform text-[#a8c7fa]">
                        →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}
        </div>
      </div>

      {/* External Resource URL Popover Modal */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
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
                  placeholder="https://arxiv.org/abs/... or wikipedia.org"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa] rounded-xl px-3 py-2 text-xs text-white placeholder-[#8e9099] focus:outline-none"
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
                  className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa] rounded-xl px-3 py-2 text-xs text-white placeholder-[#8e9099] focus:outline-none"
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#a8c7fa] text-[#062e6f] hover:bg-[#c2e7ff] transition-colors cursor-pointer shadow-md"
                >
                  Attach Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YouTube Video Tutorial Modal */}
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
                  className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#8e9099] focus:outline-none transition-colors font-mono"
                />
                {extractYoutubeId(youtubeUrlInput) && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Detected video ID: <strong className="font-mono">{extractYoutubeId(youtubeUrlInput)}</strong></span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#c4c6d0] block mb-1">
                  Tutorial Title or Concept (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3Blue1Brown Neural Networks or MIT Linear Algebra"
                  value={youtubeTitleInput}
                  onChange={(e) => setYoutubeTitleInput(e.target.value)}
                  className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#8e9099] focus:outline-none transition-colors"
                />
              </div>

              <div className="p-3 rounded-2xl bg-[#14161a] border border-[#44474f]/30 flex items-start gap-2.5">
                <span className="text-base leading-none">🎬</span>
                <p className="text-[11px] text-[#8e9099] leading-relaxed">
                  Rabbly will analyze this video tutorial to structure your session, reproducing diagrams, step-by-step logic, and formulas on the whiteboard.
                </p>
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
                  disabled={!youtubeUrlInput.trim()}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
                    youtubeUrlInput.trim()
                      ? 'bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white shadow-rose-600/30'
                      : 'bg-[#282a2f] text-[#8e9099] cursor-not-allowed opacity-60'
                  }`}
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
