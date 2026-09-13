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
import { generateCurriculum } from './services/curriculumService';
import { persistNewSession } from './services/sessionService';
import { verifyRoomCode } from './services/classroomService';
import { liveDualSessionService } from './services/liveDualSessionService';
import type {
  LessonPlan,
  AiStatus,
  WhiteboardShapeAction,
  ClassroomParticipant,
  ExternalResource,
} from './types';
import { ArrowLeft, Loader2 } from 'lucide-react';
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


export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Topic & Configuration
  const [currentTopicTitle, setCurrentTopicTitle] = useState<string>('');
  const [isClassroomMode, setIsClassroomMode] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>(() => `RAB-${Math.floor(1000 + Math.random() * 9000)}`);
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
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState<boolean>(false);

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
        // If topic is unset, retrieve room details from backend
        if (!currentTopicTitle) {
          verifyRoomCode(extractedCode)
            .then((room) => {
              if (room) {
                if (room.topic) setCurrentTopicTitle(room.topic);
                if (room.participants && room.participants.length > 0) {
                  setParticipants(room.participants);
                }
              }
            })
            .catch((e) => console.warn('Could not verify room code from server:', e));
        }
      }
    } else if (location.pathname === '/learn') {
      setIsClassroomMode(false);
    }
  }, [location.pathname, roomCode, currentTopicTitle]);

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
      : roomCode || currentPlan?.room_code || 'RAB-DEFAULT';

    liveDualSessionService.setCallbacks({
      onStatusChange: (newStatus, msg) => {
        if (newStatus === 'speaking') {
          setAiStatus('explaining');
        } else if (newStatus === 'thinking') {
          setAiStatus('thinking');
        } else if (newStatus === 'listening') {
          setAiStatus('listening');
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
    });

    const clientUserInfo = {
      userId: user?.id || `user-${Math.random().toString(36).substring(2, 9)}`,
      name: user?.fullName || user?.full_name || (user?.email ? user.email.split('@')[0] : (isClassroom ? 'Classroom Student' : 'Host Student')),
      avatar: user?.avatarUrl || user?.avatar_url || '🎓',
      isHost: !isClassroom || participants.find((p) => p.id === user?.id)?.isHost || false,
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
    existingPlan?: LessonPlan | null
  ) => {
    const cleanTopic = topic.trim() || 'General Study';
    setCurrentTopicTitle(cleanTopic);
    setIsClassroomMode(classroom);
    setIsPreparing(true);
    setElapsedSeconds(0);
    setIsPlaying(false);
    setIncomingAction(null);

    const effectiveRoomCode = existingPlan?.room_code || `RAB-${Math.floor(1000 + Math.random() * 9000)}`;
    setRoomCode(effectiveRoomCode);

    if (classroom) {
      navigate(`/classroom/${effectiveRoomCode}`);
    } else {
      navigate('/learn');
    }

    if (existingPlan) {
      setCurrentPlan(existingPlan);
      setCurrentTopicTitle(existingPlan.topic);
      setIsGeneratingCurriculum(false);
      return;
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
    setIsPreparing(false);
    setIsPlaying(true);
    setIncomingAction(null); // Keep whiteboard canvas clean
    setElapsedSeconds(0);
    setIsNotesOpen(true); // Open drawer showing generated modules and notes

    if (isClassroomMode) {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.85 } });
    }
  };

  // Toggle Lecture Play/Pause
  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  // Restart Lecture
  const handleRestart = () => {
    setIncomingAction({ action: 'clear', id: 'reset' });
    setActiveModuleIndex(0);
    setElapsedSeconds(0);
    setIsPlaying(true);
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
      // Student has unmuted! AI immediately stops speaking and listens
      setIsPlaying(false);
      setAiStatus('listening');
      setAiSpeechText("I'm listening! Speak into your microphone or ask a question...");
    } else {
      // Student muted back
      if (aiStatus === 'listening') {
        setAiStatus('explaining');
        setAiSpeechText("Microphone muted. Resuming visual explanation...");
        setIsPlaying(true);
      }
    }
  };

  // Student Hand Raise Toggle (Classroom Mode)
  const handleToggleRaiseHand = () => {
    const nextRaised = !hasRaisedHand;
    setHasRaisedHand(nextRaised);
    const currentUserId = user?.id || 'user-host';
    liveDualSessionService.raiseHand(currentUserId, nextRaised);
  };

  // Audio Speaker Output Toggle (AI Voice)
  const handleToggleSpeaker = () => {
    const nextSpeakerMuted = !isSpeakerMuted;
    setIsSpeakerMuted(nextSpeakerMuted);
    liveDualSessionService.setSpeakerMuted(nextSpeakerMuted);
  };

  // Student Asks a Question
  const handleAskQuestion = (questionText: string) => {
    // 1. Switch AI to thinking
    setAiStatus('thinking');
    setAiSpeechText(`Processing your question: "${questionText}"...`);

    // 2. Transmit to Gemini Live agent over Input WebSocket
    liveDualSessionService.sendTextMessage(questionText);

    // 3. Pause
    setIsPlaying(false);
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
          {/* Live Session Recording Timer */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono transition-all shrink-0 ${
              isPlaying
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-sm shadow-rose-500/10'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
            title={isPlaying ? 'Teaching session is actively running' : 'Teaching session is paused'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
            <span className="font-bold tracking-wider text-[10px] sm:text-[11px]">
              {isPlaying ? 'REC' : 'PAUSED'}
            </span>
            <span className="text-white font-semibold">{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Classroom Code Badge - ONLY in Classroom Mode */}
          {isClassroomMode && (
            <button
              onClick={() => setIsClassroomModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs font-mono text-indigo-300 transition-all cursor-pointer shrink-0"
              title="Classroom invite code & participants"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">Room: {roomCode}</span>
              <span className="sm:hidden">{roomCode}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                {participants.length}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Main Whiteboard Canvas (Strictly Read-Only for student) */}
      <main className="flex-1 w-full relative min-h-0 overflow-hidden bg-white">
        <Whiteboard incomingAction={incomingAction} />

        {/* Floating AI Tutor Presence (Top Left) */}
        <AiTutorHud
          status={aiStatus}
          speechText={aiSpeechText}
          isPlaying={isPlaying}
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
        />

        {/* Classroom Multiplayer Invite Modal */}
        <ClassroomModal
          isOpen={isClassroomModalOpen}
          onClose={() => setIsClassroomModalOpen(false)}
          roomCode={roomCode}
          participants={participants}
        />
      </main>
    </div>
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
        <Route
          path="/session"
          element={
            <ProtectedRoute>
              <LessonSetupPage
                onBack={() => navigate('/')}
                onStartLesson={handleStartLesson}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/classrooms"
          element={
            <ProtectedRoute>
              <LessonSetupPage
                onBack={() => navigate('/')}
                onStartLesson={handleStartLesson}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recent"
          element={
            <ProtectedRoute>
              <LessonSetupPage
                onBack={() => navigate('/')}
                onStartLesson={handleStartLesson}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sprints"
          element={
            <ProtectedRoute>
              <LessonSetupPage
                onBack={() => navigate('/')}
                onStartLesson={handleStartLesson}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/goals"
          element={
            <ProtectedRoute>
              <LessonSetupPage
                onBack={() => navigate('/')}
                onStartLesson={handleStartLesson}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <LessonSetupPage
                onBack={() => navigate('/')}
                onStartLesson={handleStartLesson}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/library"
          element={
            <ProtectedRoute>
              <LessonSetupPage
                onBack={() => navigate('/')}
                onStartLesson={handleStartLesson}
              />
            </ProtectedRoute>
          }
        />
        <Route path="/app" element={<Navigate to="/session" replace />} />

        {/* Live Workspace (Protected: Requires Authenticated Session) */}
        <Route
          path="/learn"
          element={
            <ProtectedRoute>
              {isPreparing ? (
                <CurriculumPrepModal
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
    </div>
  );
}

export default App;
