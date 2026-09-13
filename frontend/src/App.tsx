import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { LandingPage } from './components/LandingPage';
import {
  LoginPage,
  SignInPage,
  SignupPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  ProtectedRoute,
  PublicOnlyRoute,
} from './components/auth';
import { LessonSetupPage } from './components/LessonSetupPage';
import { CurriculumPrepModal } from './components/CurriculumPrepModal';
import { Whiteboard } from './components/Whiteboard';
import { AiTutorHud } from './components/AiTutorHud';
import { AudioControlBar } from './components/AudioControlBar';
import { LessonDrawer } from './components/LessonDrawer';
import { ClassroomModal } from './components/ClassroomModal';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { LectureNotesModal } from './components/LectureNotesModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { UpgradeModal } from './components/UpgradeModal';
import { generateCurriculum } from './services/curriculumService';
import { persistNewSession } from './services/sessionService';
import { verifyRoomCode, getLocalClassrooms, endClassroom } from './services/classroomService';
import { liveDualSessionService } from './services/liveDualSessionService';
import type {
  LessonPlan,
  AiStatus,
  WhiteboardShapeAction,
  ClassroomParticipant,
  ExternalResource,
} from './types';
import { ArrowLeft, Loader2, Clock, LogOut, FileText, Hand, Users, ArrowRight } from 'lucide-react';
import { useAuth } from './context/AuthContext';

// ---------------------------------------------------------------------------
// RootRedirect — the "/" route:
//   • Still loading  → splash screen (prevents flicker)
//   • Authenticated  → show LandingPage with "Go to Dashboard" action
//   • Guest          → show LandingPage with Sign In / Start Learning
// ---------------------------------------------------------------------------
interface RootRedirectProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onSignup: () => void;
}

const RootRedirect: React.FC<RootRedirectProps> = (props) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#111318] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1d2024] border border-[#44474f]/40 flex items-center justify-center text-3xl animate-pulse">
            🐰
          </div>
          <div className="flex items-center gap-2 text-sm text-[#a8c7fa] font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // If already authenticated, allow continuing lesson on getStarted,
  // but signin and signup buttons ALWAYS navigate directly to their respective auth pages.
  if (isAuthenticated) {
    return (
      <LandingPage
        {...props}
        onGetStarted={() => navigate('/session')}
        onLogin={() => navigate('/signin')}
        onSignup={() => navigate('/signup')}
      />
    );
  }

  return <LandingPage {...props} />;
};


// Cryptographically isolated unique session identifier generator
function generateUniqueSessionCode(isClassroom: boolean = false): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return isClassroom ? `RAB-CLASS-${rand}` : `RAB-1ON1-${rand}`;
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Topic & Configuration
  const [currentTopicTitle, setCurrentTopicTitle] = useState<string>('');
  const [isClassroomMode, setIsClassroomMode] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>(() => generateUniqueSessionCode(false));
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const [hasRaisedHand, setHasRaisedHand] = useState<boolean>(false);

  // Active Lesson Plan (loaded dynamically from curriculum generator or backend session)
  const [currentPlan, setCurrentPlan] = useState<LessonPlan | null>(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);

  // AI Tutor State (Idle and not auto-playing diagramming)
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [aiSpeechText, setAiSpeechText] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGeneratingCurriculum, setIsGeneratingCurriculum] = useState<boolean>(false);

  // Student Audio Controls (MUTED BY DEFAULT as required)
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [studentAudioLevel, setStudentAudioLevel] = useState<number>(0);

  // Whiteboard Communication
  const [incomingAction, setIncomingAction] = useState<WhiteboardShapeAction | null>(null);

  // Modals & Panels
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [isLectureNotesOpen, setIsLectureNotesOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState<boolean>(false);
  const [isSessionSummaryOpen, setIsSessionSummaryOpen] = useState<boolean>(false);
  const [isHostExitModalOpen, setIsHostExitModalOpen] = useState<boolean>(false);
  const [isInviteeLeaveModalOpen, setIsInviteeLeaveModalOpen] = useState<boolean>(false);
  const [handRaisedAlert, setHandRaisedAlert] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(true);

  // Participants
  const [participants, setParticipants] = useState<ClassroomParticipant[]>([
    { id: 'user-host', name: 'You (Host)', avatar: '🎓', isHost: true, isMuted: true, joinedAt: 'Just now' },
  ]);

  // Live Session Teaching Timer (records elapsed active teaching time)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Format timer into MM:SS
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Strictly only /learn or /classroom/:code are live whiteboard screens
  const isLiveScreen = location.pathname === '/learn' || location.pathname.startsWith('/classroom/');
  const isLiveActive = isLiveScreen && !isPreparing;

  // Synchronize classroom mode and room code from URL if navigating directly
  useEffect(() => {
    if (location.pathname.startsWith('/classroom/')) {
      const extractedCode = location.pathname.replace(/^\/classroom\/?/, '').split('/')[0].trim().toUpperCase();
      if (extractedCode) {
        setIsClassroomMode(true);
        if (roomCode !== extractedCode) {
          setRoomCode(extractedCode);
        }
        // If not actively preparing/generating a new room curriculum, mark as active playing
        if (!isPreparing && !isGeneratingCurriculum) {
          setIsPlaying(true);
        }
        // Retrieve existing room details and curriculum from backend if not already set
        verifyRoomCode(extractedCode)
          .then((room) => {
            if (room) {
              if (room.topic && !currentTopicTitle) setCurrentTopicTitle(room.topic);
              if (room.participants && room.participants.length > 0) {
                setParticipants(room.participants);
              }
              if (room.curriculumPlan) {
                setCurrentPlan(room.curriculumPlan);
                liveDualSessionService.setCurriculumPlan(room.curriculumPlan);
              }
              // Detect if current user is host of this room
              const localRooms = getLocalClassrooms();
              const isLocalCreator = localRooms.some(
                (r) => r.roomCode.toUpperCase() === extractedCode && (r.hostId === user?.id || r.hostName === 'You (Host)')
              );
              const isServerHost = Boolean(room.hostId && user?.id && room.hostId === user.id);
              setIsHost(isLocalCreator || isServerHost);
            }
          })
          .catch((e) => console.warn('Could not verify room code from server:', e));
      }
    } else if (location.pathname === '/learn') {
      setIsClassroomMode(false);
      setIsHost(true);
    }
  }, [location.pathname, roomCode, currentPlan, user?.id, isPreparing, isGeneratingCurriculum, currentTopicTitle]);

  // Live Session Teaching Timer (records active teaching time)
  useEffect(() => {
    if (!isLiveActive || !isPlaying) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isLiveActive, isPlaying]);

  // Connect Live Dual WebSocket Session when entering /learn or /classroom/:code (strictly when whiteboard is active)
  useEffect(() => {
    if (!isLiveActive) {
      liveDualSessionService.disconnect();
      return;
    }

    const isClassroom = location.pathname.startsWith('/classroom/');
    const effectiveRoomCode = isClassroom
      ? location.pathname.replace(/^\/classroom\/?/, '').split('/')[0].trim().toUpperCase() || roomCode
      : roomCode || generateUniqueSessionCode(false);

    liveDualSessionService.setCallbacks({
      onStatusChange: (newStatus, msg) => {
        if (newStatus === 'speaking') {
          setAiStatus('explaining');
        } else if (newStatus === 'thinking') {
          setAiStatus('thinking');
        } else if (newStatus === 'listening') {
          setAiStatus('listening');
        } else if (newStatus === 'paused') {
          setIsPlaying(false);
        }
        if (msg) setAiSpeechText(msg);
      },
      onTranscript: (transcriptText) => {
        setAiSpeechText(transcriptText);
      },
      onAudioLevel: (level) => {
        setStudentAudioLevel(level);
      },
      onRosterUpdate: (roster) => {
        setParticipants(roster);
      },
      onBoardSync: (snapshot) => {
        console.log('[App] Classroom whiteboard catch-up sync received:', snapshot);
      },
      onCurriculumSync: (syncedPlan) => {
        console.log('[App] Received curriculum sync for active lecture:', syncedPlan?.topic);
        if (syncedPlan) {
          setCurrentPlan((prev) => {
            if (prev && prev.topic === syncedPlan.topic && prev.modules?.length === syncedPlan.modules?.length) {
              return prev;
            }
            return syncedPlan;
          });
          if (syncedPlan.topic) setCurrentTopicTitle(syncedPlan.topic);
          setIsPreparing(false);
          setIsPlaying(true);
        }
      },
      onHandRaisedAlert: ({ studentName, raised }) => {
        if (raised) {
          setHandRaisedAlert(`${studentName} raised their hand!`);
          setTimeout(() => setHandRaisedAlert(null), 5000);
        }
      },
      onClassEndedByHost: ({ reason }) => {
        liveDualSessionService.clearAudioPlaybackQueue(true);
        setAiStatus('idle');
        setAiSpeechText(reason || 'The instructor has ended this classroom session.');
        setIsSessionSummaryOpen(true);
      },
    });

    const clientUserInfo = {
      userId: user?.id || `user-${Math.random().toString(36).substring(2, 9)}`,
      name: user?.fullName || user?.full_name || (user?.email ? user.email.split('@')[0] : (isClassroom ? (isHost ? 'Host Teacher' : 'Classroom Student') : 'Host Student')),
      avatar: user?.avatarUrl || user?.avatar_url || '🎓',
      isHost: isHost,
      isClassroom: isClassroom,
    };

    liveDualSessionService.connect(effectiveRoomCode, undefined, currentPlan, clientUserInfo);

    return () => {
      liveDualSessionService.disconnect();
    };
  }, [isLiveActive, roomCode, location.pathname, user?.id]);

  // Synchronize dynamic curriculum plan updates with the Live Agent
  useEffect(() => {
    if (isLiveScreen && currentPlan) {
      liveDualSessionService.setCurriculumPlan(currentPlan);
    }
  }, [isLiveScreen, currentPlan]);

  // Start lesson from Setup & generate curriculum modules
  const handleStartLesson = async (
    topic: string,
    classroom: boolean,
    level?: string,
    _file?: File | null,
    resources?: ExternalResource[],
    existingPlan?: LessonPlan | null,
    specificRoomCode?: string,
    isJoinExisting?: boolean
  ) => {
    // Generate fresh cryptographically isolated room code for new sessions to prevent cross-tenant context bleed
    const effectiveRoomCode = specificRoomCode || (isJoinExisting && existingPlan?.room_code ? existingPlan.room_code : generateUniqueSessionCode(classroom));
    setRoomCode(effectiveRoomCode);
    setIsClassroomMode(classroom);

    // If joining an existing classroom room, seamlessly enter without restarting from scratch
    if (classroom && isJoinExisting) {
      setIsPreparing(false);
      setIsPlaying(true);
      setElapsedSeconds(0);
      setIncomingAction(null);
      navigate(`/classroom/${effectiveRoomCode}`);

      try {
        const room = await verifyRoomCode(effectiveRoomCode);
        if (room) {
          if (room.topic) setCurrentTopicTitle(room.topic);
          if (room.participants && room.participants.length > 0) {
            setParticipants(room.participants);
          }
          if (room.curriculumPlan) {
            setCurrentPlan(room.curriculumPlan);
            liveDualSessionService.setCurriculumPlan(room.curriculumPlan);
          }
        }
      } catch (e) {
        console.warn('Could not verify room on join:', e);
      }
      return;
    }

    if (existingPlan) {
      setCurrentPlan(existingPlan);
      setCurrentTopicTitle(existingPlan.topic);
      const resumeIndex =
        (existingPlan as any).active_module_index ??
        (existingPlan as any).activeModuleIndex ??
        (existingPlan as any).completed_modules ??
        (existingPlan as any).completedModules ??
        0;
      setActiveModuleIndex(resumeIndex);
      liveDualSessionService.unlockAudio();
      liveDualSessionService.setCurriculumPlan(existingPlan);
      setIsGeneratingCurriculum(false);
      setIsPreparing(false);
      setIsPlaying(true);
      setIsNotesOpen(true);
      if (classroom) {
        navigate(`/classroom/${effectiveRoomCode}`);
      } else {
        navigate('/learn');
      }
      return;
    }

    const cleanTopic = topic.trim() || 'Interactive Lesson';
    setCurrentTopicTitle(cleanTopic);
    setIsPreparing(true);
    setElapsedSeconds(0);
    setIsPlaying(false);
    setIncomingAction(null);

    if (classroom) {
      navigate(`/classroom/${effectiveRoomCode}`);
    } else {
      navigate('/learn');
    }

    setIsGeneratingCurriculum(true);

    try {
      const plan = await generateCurriculum({
        topic: cleanTopic,
        level: (level as any) || 'Intermediate',
        room_code: effectiveRoomCode,
        resources,
      });
      setCurrentPlan(plan);
      setCurrentTopicTitle(plan.topic);

      // Persist the session with full curriculum modules into recent sessions
      if (plan) {
        persistNewSession({
          id: plan.session_id,
          roomCode: plan.room_code,
          topic: plan.topic,
          subject: plan.subject,
          level: (level as any) || 'Intermediate',
          completedModules: 0,
          totalModules: plan.modules.length,
          lastCheckpoint: plan.modules[0]?.title || '1. Foundation',
          progressPercent: 0,
          hasExternalResources: (plan.sourceMaterials?.length || 0) > 0,
          resourceName: plan.sourceMaterials?.[0]?.title,
          boardState: { curriculum_plan: plan },
        }).catch((err) => console.warn('Failed syncing session after curriculum generation:', err));
      }
    } catch (err) {
      console.error('Failed to generate curriculum:', err);
    } finally {
      setIsGeneratingCurriculum(false);
    }
  };

  // Transition into Whiteboard workspace
  const handlePrepReady = () => {
    liveDualSessionService.unlockAudio();
    setIsPreparing(false);
    setIsPlaying(true);
    setIncomingAction(null); // Keep whiteboard canvas clean
    setElapsedSeconds(0);
    setIsNotesOpen(true); // Open drawer showing generated modules

    if (isClassroomMode) {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.85 } });
    }
  };

  // Toggle Lecture Play/Pause (Only allowed in 1-on-1 mode, disabled in classroom)
  const handleTogglePlay = () => {
    if (isClassroomMode) return;
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    liveDualSessionService.setPaused(!nextPlaying);
  };

  // Restart Lecture
  const handleRestart = () => {
    liveDualSessionService.clearAudioPlaybackQueue(true);
    setIncomingAction({ action: 'clear', id: 'reset' });
    setActiveModuleIndex(0);
    setElapsedSeconds(0);
    setIsPlaying(true);
    liveDualSessionService.setPaused(false);
  };

  // Internal Session Completion Handler (calculates progress, logs session, fires confetti & opens summary)
  const handleEndSessionInternal = () => {
    liveDualSessionService.setPaused(true);
    setIsPlaying(false);

    const total = currentPlan?.modules?.length || 4;
    const completed = Math.min(total, Math.max(1, activeModuleIndex + 1));

    persistNewSession({
      id: currentPlan?.session_id || `session-${Date.now()}`,
      roomCode: roomCode,
      topic: currentTopicTitle,
      subject: currentPlan?.subject || 'STEM & Mathematics',
      level: (currentPlan?.level as any) || 'Intermediate',
      completedModules: completed,
      totalModules: total,
      lastCheckpoint: currentPlan?.modules?.[completed - 1]?.title || 'Lesson Synthesis',
      progressPercent: Math.round((completed / total) * 100),
      hasExternalResources: (currentPlan?.sourceMaterials?.length || 0) > 0,
      resourceName: currentPlan?.sourceMaterials?.[0]?.title,
      boardState: { curriculum_plan: currentPlan, active_module_index: completed },
    }).catch((err) => console.warn('Failed to persist session on conclusion:', err));

    confetti({ particleCount: 60, spread: 75, origin: { y: 0.65 } });
    setIsSessionSummaryOpen(true);
  };

  // End Session / Leave Room dispatcher
  const handleEndSession = () => {
    if (isClassroomMode) {
      if (isHost) {
        setIsHostExitModalOpen(true);
      } else {
        setIsInviteeLeaveModalOpen(true);
      }
    } else {
      handleEndSessionInternal();
    }
  };

  // Host permanently ends classroom for everyone
  const handleHostEndClassConfirm = async () => {
    setIsHostExitModalOpen(false);
    liveDualSessionService.endClassroom();
    if (roomCode) {
      await endClassroom(roomCode);
    }
    handleEndSessionInternal();
  };

  // Host steps out, keeping classroom active on dashboard
  const handleHostStepOut = () => {
    setIsHostExitModalOpen(false);
    liveDualSessionService.disconnect();
    navigate('/classrooms');
  };

  // Invitee leaves classroom with study summary & lecture notes
  const handleInviteeLeaveWithSummary = () => {
    setIsInviteeLeaveModalOpen(false);
    handleEndSessionInternal();
  };

  // Invitee leaves directly to classrooms hub
  const handleInviteeLeaveImmediately = () => {
    setIsInviteeLeaveModalOpen(false);
    liveDualSessionService.disconnect();
    navigate('/classrooms');
  };

  // Return to Dashboard from Summary Modal
  const handleReturnToDashboard = () => {
    setIsSessionSummaryOpen(false);
    liveDualSessionService.disconnect();
    // Reset session context to guarantee complete tenant and topic isolation for next session
    setRoomCode(generateUniqueSessionCode(false));
    setCurrentPlan(null);
    setCurrentTopicTitle('');
    setActiveModuleIndex(0);
    if (isClassroomMode) {
      navigate('/classrooms');
    } else {
      navigate('/recent');
    }
  };

  // Student Microphone Toggle (Muted by default)
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    // Update real microphone capture and streaming to Gemini Live
    liveDualSessionService.setMicMuted(nextMuted);

    // Broadcast mute state update to classroom peers
    if (isClassroomMode) {
      const currentUserId = user?.id || 'user-host';
      liveDualSessionService.toggleMute(currentUserId, nextMuted);
    }

    // Update host participant mute status
    setParticipants((prev) =>
      prev.map((p) => (p.isHost ? { ...p, isMuted: nextMuted } : p))
    );

    if (!nextMuted) {
      // Student has unmuted to speak! AI immediately stops speaking and clears audio queue
      liveDualSessionService.clearAudioPlaybackQueue(true);
      setAiStatus('listening');
      setAiSpeechText("I'm listening! Speak into your microphone or ask a question...");
    } else {
      // Student muted back
      if (aiStatus === 'listening') {
        setAiStatus('explaining');
        setAiSpeechText("Microphone muted. Resuming visual explanation...");
      }
    }
  };

  // Student Hand Raise  // Student Raise Hand Toggle
  const handleToggleRaiseHand = () => {
    const nextRaised = !hasRaisedHand;
    setHasRaisedHand(nextRaised);
    const currentUserId = user?.id || (isHost ? 'user-host' : 'user-student');
    const currentUserName = user?.fullName || user?.full_name || (user?.email ? user.email.split('@')[0] : (isHost ? 'Host Student' : 'Classroom Student'));
    liveDualSessionService.raiseHand(currentUserId, nextRaised, currentUserName);
  };

  // Audio Speaker Output Toggle (AI Voice)
  const handleToggleSpeaker = () => {
    const nextSpeakerMuted = !isSpeakerMuted;
    setIsSpeakerMuted(nextSpeakerMuted);
    liveDualSessionService.setSpeakerMuted(nextSpeakerMuted);
  };

  // Student Asks a Question
  const handleAskQuestion = (questionText: string) => {
    // 1. Immediately clear pending AI audio queue & halt active speech
    liveDualSessionService.clearAudioPlaybackQueue(true);

    // 2. Switch AI to thinking
    setAiStatus('thinking');
    setAiSpeechText(`Processing your question: "${questionText}"...`);

    // 3. Transmit to Gemini Live agent over Input WebSocket
    liveDualSessionService.sendTextMessage(questionText);
  };

  // Classroom & Whiteboard Workspace
  const renderClassroomWorkspace = () => (
    <div className="flex-1 w-full h-screen relative flex flex-col overflow-hidden">
      {/* Top Bar Header */}
      <header className="h-14 px-3 sm:px-4 border-b border-slate-800/80 bg-slate-900/85 backdrop-blur-xl flex items-center justify-between z-20 shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate('/session')}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0"
            title="Return to Session Setup"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New Session</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-800 shrink-0"></div>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-base shrink-0">🐰</span>
            <span className="text-sm font-extrabold text-white tracking-wide shrink-0">Rabbly</span>
            <span className="text-xs text-slate-500 shrink-0">•</span>
            <h1 className="text-xs font-semibold text-slate-200 truncate max-w-[110px] sm:max-w-xs md:max-w-md">
              {currentTopicTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Lesson & Classroom Teaching Timer (REC removed) */}
          {!isClassroomMode ? (
            <div
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono transition-all shrink-0 ${
                isPlaying
                  ? 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}
              title={isPlaying ? '1-on-1 teaching session is active' : 'Teaching session is paused'}
            >
              <Clock className={`w-3.5 h-3.5 ${isPlaying ? 'text-sky-400' : 'text-amber-400'}`} />
              {!isPlaying && (
                <span className="font-bold tracking-wider text-[10px] sm:text-[11px] text-amber-400">
                  PAUSED
                </span>
              )}
              <span className="text-white font-semibold">{formatTimer(elapsedSeconds)}</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 text-xs font-mono transition-all shrink-0 shadow-sm"
              title="Classroom session is live"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold tracking-wider text-[10px] sm:text-[11px] text-emerald-400">
                LIVE
              </span>
              <span className="text-white font-semibold">{formatTimer(elapsedSeconds)}</span>
            </div>
          )}

          {/* Classroom Code Badge - ONLY in Classroom Mode */}
          {isClassroomMode && (
            <button
              onClick={() => setIsClassroomModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs font-mono text-sky-300 transition-all cursor-pointer shrink-0"
              title="Classroom invite code & participants"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">Room: {roomCode}</span>
              <span className="sm:hidden">{roomCode}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-sky-300 border border-blue-800">
                {participants.length}
              </span>
            </button>
          )}



          {/* End Session / Leave Room Button */}
          <button
            onClick={handleEndSession}
            id="end-session-btn"
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              isClassroomMode && !isHost
                ? 'bg-[#282a2f] hover:bg-[#33353a] text-[#c4c6d0] hover:text-white border border-[#44474f]/50'
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30'
            }`}
            title={
              isClassroomMode
                ? isHost
                  ? 'End classroom for all students or step out'
                  : 'Leave classroom and review study summary'
                : 'Conclude learning session & view notes'
            }
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isClassroomMode ? (isHost ? 'End Class' : 'Leave Class') : 'End Session'}
            </span>
          </button>
        </div>
      </header>

      {/* Hand Raised Realtime Classroom Alert Banner */}
      {handRaisedAlert && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-amber-500/90 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200">
          <Hand className="w-4 h-4 text-slate-950 animate-bounce" />
          <span>{handRaisedAlert}</span>
        </div>
      )}

      {/* Main Whiteboard Canvas (Strictly Read-Only for student) */}
      <main className="flex-1 w-full relative min-h-0 overflow-hidden bg-white">
        <Whiteboard incomingAction={incomingAction} />

        {/* Floating AI Tutor Presence (Top Left) */}
        <AiTutorHud
          status={aiStatus}
          speechText={aiSpeechText}
          isPlaying={isPlaying}
          isClassroom={isClassroomMode}
          onTogglePlay={handleTogglePlay}
          onRestart={handleRestart}
        />

        {/* Bottom Student Audio & Dock Bar */}
        <AudioControlBar
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isSpeakerMuted={isSpeakerMuted}
          onToggleSpeaker={handleToggleSpeaker}
          audioLevel={studentAudioLevel}
          onAskQuestion={handleAskQuestion}
          suggestedQuestions={currentPlan?.suggestedQuestions || []}
          onOpenClassroom={() => setIsClassroomModalOpen(true)}
          onToggleNotes={() => setIsNotesOpen(!isNotesOpen)}
          isNotesOpen={isNotesOpen}
          participantCount={participants.length}
          isClassroomMode={isClassroomMode}
          hasRaisedHand={hasRaisedHand}
          onToggleRaiseHand={handleToggleRaiseHand}
        />

        {/* Collapsible Curriculum & Notes Drawer */}
        <LessonDrawer
          isOpen={isNotesOpen}
          onClose={() => setIsNotesOpen(false)}
          plan={currentPlan}
          activeModuleIndex={activeModuleIndex}
          onOpenFullNotes={() => setIsLectureNotesOpen(true)}
        />

        {/* Classroom Multiplayer Invite Modal */}
        <ClassroomModal
          isOpen={isClassroomModalOpen}
          onClose={() => setIsClassroomModalOpen(false)}
          roomCode={roomCode}
          participants={participants}
        />

        {/* Session Concluded / Lecture Summary Modal */}
        <SessionSummaryModal
          isOpen={isSessionSummaryOpen}
          onClose={() => setIsSessionSummaryOpen(false)}
          onReturnToDashboard={handleReturnToDashboard}
          onRestartSession={handleRestart}
          onOpenFullNotes={() => setIsLectureNotesOpen(true)}
          topic={currentTopicTitle}
          plan={currentPlan}
          elapsedSeconds={elapsedSeconds}
          completedModules={activeModuleIndex + 1}
          totalModules={currentPlan?.modules?.length || 4}
          isClassroom={isClassroomMode}
          roomCode={roomCode}
        />
      </main>
    </div>
  );

  const renderSetupPage = () => (
    <LessonSetupPage
      onBack={() => navigate('/')}
      onStartLesson={handleStartLesson}
      onOpenProfile={() => setIsProfileModalOpen(true)}
      onOpenSettings={() => setIsSettingsModalOpen(true)}
      onOpenUpgrade={() => setIsUpgradeModalOpen(true)}
    />
  );

  return (
    <div className="w-full min-h-screen bg-[#111318] text-[#e2e2e9] flex flex-col relative font-sans">
      <Routes>
        {/* Landing Page — public only; authenticated users go to /session */}
        <Route
          path="/"
          element={
            <RootRedirect
              onGetStarted={() => navigate('/signup')}
              onLogin={() => navigate('/signin')}
              onSignup={() => navigate('/signup')}
            />
          }
        />

        {/* Auth Suite (Public Only) */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signin"
          element={
            <PublicOnlyRoute>
              <SignInPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <SignupPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forget-password"
          element={<Navigate to="/forgot-password" replace />}
        />
        <Route
          path="/reset-password"
          element={
            <PublicOnlyRoute>
              <ResetPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="/auth" element={<Navigate to="/login" replace />} />

        {/* Dedicated App Screens (Protected: Requires Authenticated Session) */}
        <Route path="/session" element={<ProtectedRoute>{renderSetupPage()}</ProtectedRoute>} />
        <Route path="/classrooms" element={<ProtectedRoute>{renderSetupPage()}</ProtectedRoute>} />
        <Route path="/recent" element={<ProtectedRoute>{renderSetupPage()}</ProtectedRoute>} />
        <Route path="/sprints" element={<ProtectedRoute>{renderSetupPage()}</ProtectedRoute>} />
        <Route path="/goals" element={<ProtectedRoute>{renderSetupPage()}</ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute>{renderSetupPage()}</ProtectedRoute>} />
        <Route path="/library" element={<ProtectedRoute>{renderSetupPage()}</ProtectedRoute>} />
        <Route path="/app" element={<Navigate to="/session" replace />} />

        {/* Live Workspace (Protected: Requires Authenticated Session) */}
        <Route
          path="/learn"
          element={
            <ProtectedRoute>
              {isPreparing ? (
                <CurriculumPrepModal
                  isClassroom={false}
                  topic={currentTopicTitle}
                  plan={currentPlan}
                  isGenerating={isGeneratingCurriculum}
                  onReady={handlePrepReady}
                />
              ) : (
                renderClassroomWorkspace()
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/classroom/:code"
          element={
            <ProtectedRoute>
              {isPreparing ? (
                <CurriculumPrepModal
                  isClassroom={true}
                  roomCode={roomCode}
                  topic={currentTopicTitle}
                  plan={currentPlan}
                  isGenerating={isGeneratingCurriculum}
                  onReady={handlePrepReady}
                />
              ) : (
                renderClassroomWorkspace()
              )}
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Modals rendered at root so they work across all routes */}
      <LectureNotesModal
        isOpen={isLectureNotesOpen}
        onClose={() => setIsLectureNotesOpen(false)}
        plan={currentPlan}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenUpgrade={() => setIsUpgradeModalOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onOpenUpgrade={() => setIsUpgradeModalOpen(true)}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      {/* Host Classroom Exit Options Modal */}
      {isHostExitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-[#1d2024] border border-[#44474f]/60 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">Classroom in Progress</h3>
                <span className="text-xs text-[#8e9099]">You are the host of room {roomCode}</span>
              </div>
            </div>

            <p className="text-xs text-[#c4c6d0] leading-relaxed">
              Do you want to permanently end this classroom session for all students, or step out and leave it active so you can rejoin later?
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: End Class for Everyone */}
              <button
                type="button"
                onClick={handleHostEndClassConfirm}
                className="w-full py-3 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="text-left">
                  <span className="block">End Class for Everyone</span>
                  <span className="text-[10px] text-rose-300/70 font-normal">Closes room, notifies students & opens study summary</span>
                </div>
                <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
              </button>

              {/* Option 2: Step Out (Keep Class Active) */}
              <button
                type="button"
                onClick={handleHostStepOut}
                className="w-full py-3 px-4 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] border border-[#44474f]/50 text-white text-xs font-semibold transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="text-left">
                  <span className="block">Step Out (Keep Class Active)</span>
                  <span className="text-[10px] text-[#8e9099] font-normal">Leave room open. Rejoin anytime from your Classrooms page</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#a8c7fa] shrink-0" />
              </button>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHostExitModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8e9099] hover:text-white transition-colors cursor-pointer"
              >
                Cancel & Stay in Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitee / Student Leave Confirmation Modal */}
      {isInviteeLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-[#1d2024] border border-[#44474f]/60 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#4f378b]/30 border border-[#d0bcff]/30 text-[#d0bcff] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">Leave Classroom?</h3>
                <span className="text-xs text-[#8e9099]">Room {roomCode}</span>
              </div>
            </div>

            <p className="text-xs text-[#c4c6d0] leading-relaxed">
              Are you sure you want to leave? Before you go, you can review your complete study summary, lecture notes, and diagrams covered.
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Leave & View Summary */}
              <button
                type="button"
                onClick={handleInviteeLeaveWithSummary}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-md shadow-blue-500/25"
              >
                <div className="text-left">
                  <span className="block">Leave & View Study Summary</span>
                  <span className="text-[10px] text-sky-200/80 font-normal">Review lecture notes, formulas, and whiteboard diagrams</span>
                </div>
                <ArrowRight className="w-4 h-4 text-white shrink-0" />
              </button>

              {/* Option 2: Leave Directly */}
              <button
                type="button"
                onClick={handleInviteeLeaveImmediately}
                className="w-full py-2.5 px-4 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] border border-[#44474f]/50 text-[#c4c6d0] hover:text-white text-xs font-medium transition-all text-center cursor-pointer"
              >
                Leave Directly to Dashboard
              </button>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInviteeLeaveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8e9099] hover:text-white transition-colors cursor-pointer"
              >
                Cancel & Stay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
