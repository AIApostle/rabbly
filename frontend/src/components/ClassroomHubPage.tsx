import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  ArrowRight,
  Plus,
  ArrowLeft,
  Lock,
  Sparkles,
  Volume2,
  Paperclip,
  SquarePlay,
  Check,
  ChevronDown,
  Globe,
  X,
  FileText,
  AlertCircle,
  Link2,
} from 'lucide-react';
import type { ExternalResource, ClassroomRoom } from '../types';
import {
  createClassroom,
  verifyRoomCode,
  loadClassrooms,
  getLocalClassrooms,
  endClassroom,
} from '../services/classroomService';

interface ClassroomHubPageProps {
  onJoinRoom: (roomCode: string) => void;
  onCreateRoom: (topic: string, resources?: ExternalResource[], level?: string, roomCode?: string) => void;
  onBackToChat: () => void;
}

/**
 * Extracts a clean room code (e.g. 'RAB-9412') from either a full URL,
 * path (/classroom/RAB-9412), or raw code input.
 */
function extractCodeFromInput(input: string): string {
  let raw = input.trim();
  if (raw.includes('/classroom/')) {
    raw = raw.split('/classroom/')[1].split('/')[0].split('?')[0].split('#')[0];
  }
  return raw.trim().toUpperCase();
}

export const ClassroomHubPage: React.FC<ClassroomHubPageProps> = ({
  onJoinRoom,
  onCreateRoom,
  onBackToChat,
}) => {
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const [newRoomTopic, setNewRoomTopic] = useState('');
  const [roomLevel, setRoomLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [roomResources, setRoomResources] = useState<ExternalResource[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Active classrooms tracked for quick rejoin or termination
  const [activeRooms, setActiveRooms] = useState<ClassroomRoom[]>(() =>
    getLocalClassrooms().filter((r) => r.status === 'active')
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadClassrooms().then((rooms) => {
      if (mounted && rooms) {
        setActiveRooms(rooms.filter((r) => r.status === 'active'));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleCopyInviteLink = (code: string) => {
    const url = `${window.location.origin}/classroom/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleEndActiveRoom = async (code: string) => {
    if (!window.confirm(`End classroom '${code}' for everyone? This will close the session.`)) {
      return;
    }
    await endClassroom(code);
    setActiveRooms((prev) => prev.filter((r) => r.roomCode !== code));
  };

  // Menu states
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isLevelMenuOpen, setIsLevelMenuOpen] = useState(false);

  // Modal states
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitleInput, setUrlTitleInput] = useState('');
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [youtubeTitleInput, setYoutubeTitleInput] = useState('');

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const levelMenuRef = useRef<HTMLDivElement>(null);

  // Auto-resize topic textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [newRoomTopic]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
      if (levelMenuRef.current && !levelMenuRef.current.contains(e.target as Node)) {
        setIsLevelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = extractCodeFromInput(joinInput);
    if (!cleanCode) {
      setJoinError('Please paste a classroom link or enter a room code.');
      return;
    }

    setJoinError(null);
    setIsJoining(true);

    try {
      await verifyRoomCode(cleanCode);
      onJoinRoom(cleanCode);
    } catch (err: any) {
      setJoinError(err.message || `Classroom '${cleanCode}' was not found. Please verify the link or code.`);
    } finally {
      setIsJoining(false);
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    const formattedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const domain = formattedUrl.replace(/^https?:\/\//, '').split('/')[0];
    const title = urlTitleInput.trim() || domain;

    setRoomResources((prev) => [
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

    setRoomResources((prev) => [
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

      setRoomResources((prev) => [
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

  const removeResource = (id: string) => {
    setRoomResources((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTopic = newRoomTopic.trim();
    if (!trimmedTopic) return;

    setIsCreating(true);
    try {
      const newRoom = await createClassroom({
        topic: trimmedTopic,
        level: roomLevel,
        resources: roomResources,
      });
      onCreateRoom(newRoom.topic, roomResources, roomLevel, newRoom.roomCode);
    } catch {
      onCreateRoom(trimmedTopic, roomResources, roomLevel);
    } finally {
      setIsCreating(false);
    }
  };

  const detectedCode = extractCodeFromInput(joinInput);

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col space-y-8">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.doc,.docx,.md,.markdown"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Header with Back Button */}
      <div className="pb-4 border-b border-[#44474f]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d0bcff] mb-1">
            <Users className="w-4 h-4" />
            <span>Collaborative Study Rooms</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            Classrooms
          </h1>
          <p className="text-xs sm:text-sm text-[#c4c6d0] mt-0.5 max-w-2xl leading-relaxed">
            Learn together with friends in private, real-time study rooms. Classrooms are invite-only—join an existing session by pasting a classroom link or code, or create a new room and share the link with peers.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToChat}
          className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-[#282a2f] hover:bg-[#33353a] text-xs font-medium text-[#c4c6d0] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Session</span>
        </button>
      </div>

      {/* Dual Main Actions: Join Room vs Create Room */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Join via Classroom Link */}
        <div className="p-6 rounded-3xl bg-[#1d2024] border border-[#44474f]/40 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-[#4f378b]/40 border border-[#d0bcff]/40 text-[#d0bcff] flex items-center justify-center mb-3">
              <Link2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white font-['Outfit']">
              Join via Classroom Link
            </h2>
            <p className="text-xs text-[#c4c6d0] mt-1 leading-relaxed">
              Have an invite link from your classmate or instructor? Paste the classroom URL or enter the room code to enter their private live lecture.
            </p>
          </div>

          <form onSubmit={handleJoinSubmit} className="space-y-3 pt-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] block mb-1 font-mono">
                Classroom Link or Code
              </label>
              <input
                type="text"
                required
                placeholder="Paste link (e.g. https://.../classroom/RAB-9412) or code"
                value={joinInput}
                onChange={(e) => {
                  setJoinInput(e.target.value);
                  setJoinError(null);
                }}
                className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-[#d0bcff] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-[#8e9099] focus:outline-none transition-colors"
              />
              {detectedCode && joinInput.trim() !== detectedCode && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#a8c7fa] mt-1.5 font-mono">
                  <span>Detected Room:</span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#0842a0]/40 border border-[#a8c7fa]/30 font-bold tracking-wider">
                    {detectedCode}
                  </span>
                </div>
              )}
              {joinError && (
                <div className="flex items-center gap-1.5 text-rose-400 text-xs mt-2 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!joinInput.trim() || isJoining}
              className={`w-full py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                joinInput.trim() && !isJoining
                  ? 'bg-[#4f378b] hover:bg-[#5e42a6] text-white shadow-[#4f378b]/30'
                  : 'bg-[#282a2f] text-[#8e9099] cursor-not-allowed opacity-60'
              }`}
            >
              {isJoining ? (
                <span>Validating Room...</span>
              ) : (
                <>
                  <span>Enter Classroom</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card 2: Create a Classroom with Dropdown Source Upload & Multi-Line Topic */}
        <div className="p-6 rounded-3xl bg-[#1d2024] border border-[#44474f]/40 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-[#0842a0]/40 border border-[#a8c7fa]/40 text-[#a8c7fa] flex items-center justify-center mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white font-['Outfit']">
              Create a Classroom
            </h2>
            <p className="text-xs text-[#c4c6d0] mt-1 leading-relaxed">
              Start a shared study session with custom references and learning topics. Rabbly creates an invite-only workspace for you and your peers.
            </p>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-1 flex flex-col flex-1 justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] block font-mono">
                  Session Topic or Curriculum Focus *
                </label>
              </div>

              {/* Integrated Input Container (matching main chat omnibar style) */}
              <div className="w-full rounded-2xl bg-[#111318] border border-[#44474f]/50 hover:border-[#44474f]/80 focus-within:border-[#a8c7fa]/60 focus-within:ring-2 focus-within:ring-[#0842a0]/20 transition-all p-3 flex flex-col">
                {/* Attached Resources Tray */}
                {roomResources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pb-2.5 mb-2 border-b border-[#44474f]/30">
                    {roomResources.map((res) => (
                      <div
                        key={res.id}
                        className="group inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-xl bg-[#282a2f] border border-[#44474f]/50 text-xs text-white max-w-xs transition-all hover:border-[#a8c7fa]/50"
                      >
                        {res.type === 'file' ? (
                          <FileText className="w-3.5 h-3.5 text-[#a8c7fa] shrink-0" />
                        ) : res.type === 'youtube' ? (
                          <SquarePlay className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-[#78f8e7] shrink-0" />
                        )}

                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="font-semibold text-[11px] truncate max-w-[130px]">{res.title}</span>
                          {res.detail && (
                            <span className="text-[9px] text-[#8e9099] truncate font-mono">{res.detail}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeResource(res.id)}
                          className="p-0.5 rounded hover:bg-[#37393e] text-[#8e9099] hover:text-white transition-colors cursor-pointer"
                          title="Remove resource"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Multi-line auto-wrapping textarea */}
                <textarea
                  ref={textareaRef}
                  required
                  rows={3}
                  placeholder="e.g. Distributed token bucket rate limiting with Redis, consistent hashing, and Lua scripts..."
                  value={newRoomTopic}
                  onChange={(e) => setNewRoomTopic(e.target.value)}
                  className="w-full bg-transparent resize-none text-white placeholder-[#8e9099] text-xs sm:text-sm focus:outline-none leading-relaxed font-sans px-1 break-words"
                />

                {/* Bottom Bar: Plus Menu Dropdown & Level Selector */}
                <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-[#44474f]/20">
                  <div className="flex items-center gap-2">
                    {/* Plus Button Menu Popover */}
                    <div ref={plusMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                        className={`p-1.5 rounded-full transition-all cursor-pointer ${
                          isPlusMenuOpen
                            ? 'bg-[#a8c7fa] text-[#062e6f]'
                            : 'bg-[#282a2f] hover:bg-[#33353a] text-[#c4c6d0] hover:text-white'
                        }`}
                        title="Add study materials or links"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      {/* Dropdown Popover Menu */}
                      {isPlusMenuOpen && (
                        <div className="absolute left-0 bottom-9 w-72 rounded-2xl bg-[#1d2024] border border-[#44474f]/60 shadow-2xl p-1.5 z-30 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                          {/* 1. Document / File */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsPlusMenuOpen(false);
                              fileInputRef.current?.click();
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#282a2f] text-xs font-medium text-white transition-colors text-left cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-[#0842a0]/40 text-[#a8c7fa] flex items-center justify-center shrink-0">
                              <Paperclip className="w-3.5 h-3.5" />
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
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#282a2f] text-xs font-medium text-white transition-colors text-left cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                              <SquarePlay className="w-3.5 h-3.5" />
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
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#282a2f] text-xs font-medium text-white transition-colors text-left cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-[#005353]/40 text-[#78f8e7] flex items-center justify-center shrink-0">
                              <Globe className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="block font-semibold">Add Web Link / Paper URL</span>
                              <span className="text-[10px] text-[#8e9099]">arXiv, docs, research link</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    <span className="text-[11px] text-[#8e9099]">
                      {roomResources.length === 0 ? 'Attach sources' : `${roomResources.length} source${roomResources.length > 1 ? 's' : ''}`}
                    </span>
                  </div>

                  {/* Level / Depth Selector */}
                  <div ref={levelMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsLevelMenuOpen(!isLevelMenuOpen)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#282a2f] hover:bg-[#33353a] border border-[#44474f]/40 text-[11px] font-medium text-[#c4c6d0] hover:text-white transition-all cursor-pointer"
                    >
                      <span>{roomLevel}</span>
                      <ChevronDown className="w-3 h-3 text-[#a8c7fa]" />
                    </button>

                    {isLevelMenuOpen && (
                      <div className="absolute right-0 bottom-9 w-36 rounded-2xl bg-[#1d2024] border border-[#44474f]/60 shadow-xl p-1.5 z-30 flex flex-col gap-1">
                        {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => {
                              setRoomLevel(lvl);
                              setIsLevelMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                              roomLevel === lvl
                                ? 'bg-[#a8c7fa]/20 text-[#a8c7fa]'
                                : 'text-[#c4c6d0] hover:bg-[#282a2f] hover:text-white'
                            }`}
                          >
                            <span>{lvl}</span>
                            {roomLevel === lvl && <Check className="w-3.5 h-3.5 text-[#a8c7fa]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!newRoomTopic.trim() || isCreating}
              className={`w-full py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                newRoomTopic.trim() && !isCreating
                  ? 'bg-gradient-to-r from-[#0842a0] to-[#4f378b] hover:from-[#0a4fc0] hover:to-[#5e42a6] text-white shadow-[#0842a0]/30'
                  : 'bg-[#282a2f] text-[#8e9099] cursor-not-allowed opacity-60'
              }`}
            >
              {isCreating ? (
                <span>Generating Classroom Workspace...</span>
              ) : (
                <>
                  <span>Create Classroom & Generate Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Active Classrooms Section (Host & Open Rooms) */}
      <div className="pt-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
              Your Active Classrooms
            </h2>
            {activeRooms.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold">
                {activeRooms.length} Active
              </span>
            )}
          </div>
          <span className="text-xs text-[#8e9099] hidden sm:inline">
            Active study rooms remain open until you click End Class
          </span>
        </div>

        {activeRooms.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#1d2024]/40 border border-dashed border-[#44474f]/40 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-[#282a2f] text-[#8e9099] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">No active classrooms right now</h3>
            <p className="text-xs text-[#8e9099] max-w-sm">
              Create a classroom above to start a live study room. If you step out, you can rejoin anytime from here until you end the session.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRooms.map((room) => (
              <div
                key={room.id}
                className="p-5 rounded-3xl bg-[#1d2024] border border-[#44474f]/50 hover:border-[#a8c7fa]/50 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>LIVE SESSION</span>
                    </span>

                    <span className="text-[11px] font-mono text-[#a8c7fa] bg-[#0842a0]/30 border border-[#a8c7fa]/30 px-2.5 py-0.5 rounded-lg font-bold">
                      {room.roomCode}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 font-['Outfit'] mb-1">
                    {room.topic}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#8e9099] mt-2 font-medium">
                    <span className="px-2 py-0.5 rounded-md bg-[#282a2f] text-[#c4c6d0] text-[11px]">
                      {room.level}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#8e9099]" />
                      <span>{room.participantCount || 1} participant(s)</span>
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#44474f]/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Rejoin Class button */}
                    <button
                      type="button"
                      onClick={() => onJoinRoom(room.roomCode)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#4f378b] to-[#6750a4] hover:from-[#5e42a6] hover:to-[#7965b2] text-white text-xs font-bold transition-all shadow-md shadow-[#4f378b]/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Rejoin Class</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Copy Link button */}
                    <button
                      type="button"
                      onClick={() => handleCopyInviteLink(room.roomCode)}
                      className="px-3 py-2 rounded-xl bg-[#282a2f] hover:bg-[#33353a] text-xs font-medium text-[#c4c6d0] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Copy classroom share link"
                    >
                      {copiedCode === room.roomCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5 text-[#a8c7fa]" />
                          <span>Share Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* End Class button */}
                  <button
                    type="button"
                    onClick={() => handleEndActiveRoom(room.roomCode)}
                    className="px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 text-xs font-medium transition-all cursor-pointer"
                    title="Permanently end this classroom for all students"
                  >
                    End Class
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Classroom Guidelines & Architecture Info */}
      <div className="p-6 rounded-3xl bg-[#17191e] border border-[#44474f]/25 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8e9099] font-mono">
          How Invite-Only Classrooms Work
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#1d2024] border border-[#44474f]/20 flex flex-col space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#4f378b]/30 text-[#d0bcff] flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white font-['Outfit']">Private & Link-Only</h4>
            <p className="text-xs text-[#8e9099] leading-relaxed">
              Classrooms are never publicly listed. Only peers who receive your direct link or room code can enter.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#1d2024] border border-[#44474f]/20 flex flex-col space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#0842a0]/30 text-[#a8c7fa] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white font-['Outfit']">Synced Whiteboard</h4>
            <p className="text-xs text-[#8e9099] leading-relaxed">
              All students see the AI tutor write explanations, diagrams, and formulas in real-time on the shared canvas.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#1d2024] border border-[#44474f]/20 flex flex-col space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white font-['Outfit']">Interactive Voice Discussion</h4>
            <p className="text-xs text-[#8e9099] leading-relaxed">
              Collaborate smoothly. Unmute to ask questions or discuss concepts directly with the tutor and peers.
            </p>
          </div>
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
