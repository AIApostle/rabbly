import { useState, useEffect, useRef, useCallback } from 'react';
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
import { LESSON_SCENARIOS, getScenarioResponse } from './services/simulationEngine';
import type {
  LessonPlan,
  AiStatus,
  WhiteboardShapeAction,
  ClassroomParticipant,
} from './types';
import { ArrowLeft } from 'lucide-react';

export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Topic & Configuration
  const [topicKey, setTopicKey] = useState<string>('transformers');
  const [currentTopicTitle, setCurrentTopicTitle] = useState<string>('');
  const [isClassroomMode, setIsClassroomMode] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>(() => `RAB-${Math.floor(1000 + Math.random() * 9000)}`);
  const [isPreparing, setIsPreparing] = useState<boolean>(false);

  // Active Lesson Plan
  const [currentPlan, setCurrentPlan] = useState<LessonPlan>(LESSON_SCENARIOS['transformers'].plan);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);

  // AI Tutor State
  const [aiStatus, setAiStatus] = useState<AiStatus>('explaining');
  const [aiSpeechText, setAiSpeechText] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Student Audio Controls (MUTED BY DEFAULT as required)
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);

  // Whiteboard Communication
  const [incomingAction, setIncomingAction] = useState<WhiteboardShapeAction | null>(null);

  // Modals & Panels
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState<boolean>(false);

  // Participants
  const [participants, setParticipants] = useState<ClassroomParticipant[]>([
    { id: 'user-host', name: 'You (Host)', avatar: '🎓', isHost: true, isMuted: true, joinedAt: 'Just now' },
  ]);

  // Simulation Timeline State
  const [currentCueIndex, setCurrentCueIndex] = useState<number>(0);
  const simulationTimerRef = useRef<number | null>(null);

  // Live Session Teaching Timer (records elapsed active teaching time)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Format timer into MM:SS
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLiveScreen = location.pathname.startsWith('/learn') || location.pathname.startsWith('/classroom');

  // Live Session Teaching Timer (records active teaching time)
  useEffect(() => {
    if (!isLiveScreen || isPreparing || !isPlaying) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isLiveScreen, isPreparing, isPlaying]);

  // Start lesson from Setup
  const handleStartLesson = (topic: string, classroom: boolean, level?: string) => {
    const cleanTopic = topic.trim() || 'Transformers & Self-Attention';
    setCurrentTopicTitle(cleanTopic);
    setIsClassroomMode(classroom);

    // Pick closest scenario or default to transformers
    let matchedKey = 'transformers';
    const lower = cleanTopic.toLowerCase();
    if (lower.includes('quantum') || lower.includes('qubit')) {
      matchedKey = 'quantum';
    } else if (lower.includes('rate') || lower.includes('redis') || lower.includes('system')) {
      matchedKey = 'rate-limiter';
    }

    setTopicKey(matchedKey);
    const plan = { ...LESSON_SCENARIOS[matchedKey].plan };
    if (level) {
      plan.level = level as 'Beginner' | 'Intermediate' | 'Advanced';
    }
    setCurrentPlan(plan);
    setIsPreparing(true);
    setElapsedSeconds(0);

    if (classroom) {
      const newCode = `RAB-${Math.floor(1000 + Math.random() * 9000)}`;
      setRoomCode(newCode);
      navigate(`/classroom/${newCode}`);
    } else {
      navigate('/learn');
    }
  };

  // Ready transition into Classroom workspace
  const handlePrepReady = () => {
    setIsPreparing(false);
    setIsPlaying(true);
    setCurrentCueIndex(0);
    setElapsedSeconds(0);

    // Add friend participants if in classroom mode
    if (isClassroomMode) {
      setParticipants([
        { id: 'user-host', name: 'You (Host)', avatar: '🎓', isHost: true, isMuted: true, joinedAt: 'Just now' },
        { id: 'user-maya', name: 'Maya Chen', avatar: '👩🏻‍💻', isHost: false, isMuted: true, joinedAt: '1m ago' },
        { id: 'user-jordan', name: 'Jordan Patel', avatar: '👨🏽‍🎓', isHost: false, isMuted: true, joinedAt: 'Just now' },
      ]);
      // Small celebratory burst
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.85 } });
    }
  };

  // Execute a specific cue
  const executeCue = useCallback((cueIdx: number) => {
    const scenario = LESSON_SCENARIOS[topicKey];
    if (!scenario || cueIdx >= scenario.cues.length) return;

    const cue = scenario.cues[cueIdx];
    setAiStatus(cue.status);
    setAiSpeechText(cue.aiSpeech);

    // Advance active curriculum module according to cues
    if (cueIdx === 1) setActiveModuleIndex(1);
    if (cueIdx === 3) setActiveModuleIndex(2);

    // Dispatch whiteboard actions sequentially
    if (cue.whiteboardActions && cue.whiteboardActions.length > 0) {
      cue.whiteboardActions.forEach((action, i) => {
        setTimeout(() => {
          setIncomingAction({ ...action });
        }, i * 350);
      });
    }
  }, [topicKey]);

  // Simulation Runner Effect
  useEffect(() => {
    if (!isLiveScreen || isPreparing || !isPlaying) return;

    const scenario = LESSON_SCENARIOS[topicKey];
    if (!scenario) return;

    // Initial cue trigger
    executeCue(currentCueIndex);

    // If there is a next cue, schedule it
    if (currentCueIndex < scenario.cues.length - 1) {
      const currentCue = scenario.cues[currentCueIndex];
      const nextCue = scenario.cues[currentCueIndex + 1];
      const delayMs = Math.max(2500, (nextCue.timeOffsetSec - currentCue.timeOffsetSec) * 1000);

      simulationTimerRef.current = window.setTimeout(() => {
        setCurrentCueIndex((prev) => prev + 1);
      }, delayMs);
    }

    return () => {
      if (simulationTimerRef.current) {
        clearTimeout(simulationTimerRef.current);
      }
    };
  }, [isLiveScreen, isPreparing, isPlaying, currentCueIndex, topicKey, executeCue]);

  // Toggle Lecture Play/Pause
  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  // Restart Lecture
  const handleRestart = () => {
    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
    }
    // Clear canvas
    setIncomingAction({ action: 'clear', id: 'reset' });
    setCurrentCueIndex(0);
    setActiveModuleIndex(0);
    setElapsedSeconds(0);
    setIsPlaying(true);
  };

  // Student Microphone Toggle (Muted by default)
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    // Update host participant mute status
    setParticipants((prev) =>
      prev.map((p) => (p.isHost ? { ...p, isMuted: nextMuted } : p))
    );

    if (!nextMuted) {
      // Student has unmuted! AI immediately stops speaking and listens
      setIsPlaying(false);
      setAiStatus('listening');
      setAiSpeechText("I'm listening! Ask your question, or pick a suggested topic below...");
    } else {
      // Student muted back
      if (aiStatus === 'listening') {
        setAiStatus('explaining');
        setAiSpeechText("Microphone muted. Resuming visual explanation...");
        setIsPlaying(true);
      }
    }
  };

  // Student Asks a Question
  const handleAskQuestion = (questionText: string) => {
    // 1. Switch AI to thinking
    setAiStatus('thinking');
    setAiSpeechText(`Processing your question: "${questionText}"...`);

    // 2. Pause the ongoing linear lecture
    setIsPlaying(false);

    // 3. After short simulated thinking, AI answers and updates the whiteboard!
    setTimeout(() => {
      const response = getScenarioResponse(topicKey, questionText);
      setAiStatus('answering');
      setAiSpeechText(response.speech);

      // Programmatically draw the answer note on the whiteboard
      setIncomingAction(response.action);

      // Student is returned to muted state after asking
      setIsMuted(true);
      setParticipants((prev) =>
        prev.map((p) => (p.isHost ? { ...p, isMuted: true } : p))
      );
    }, 1200);
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
          onToggleSpeaker={() => setIsSpeakerMuted(!isSpeakerMuted)}
          onAskQuestion={handleAskQuestion}
          suggestedQuestions={currentPlan.suggestedQuestions}
          onOpenClassroom={() => setIsClassroomModalOpen(true)}
          onToggleNotes={() => setIsNotesOpen(!isNotesOpen)}
          isNotesOpen={isNotesOpen}
          participantCount={participants.length}
          isClassroomMode={isClassroomMode}
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
        {/* Landing Page */}
        <Route
          path="/"
          element={
            <LandingPage
              onGetStarted={() => navigate('/signup')}
              onLogin={() => navigate('/login')}
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
