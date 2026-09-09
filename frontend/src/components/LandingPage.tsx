import React from 'react';
import {
  ArrowRight,
  Volume2,
  Mic,
  Layout,
  BookOpen,
  CheckCircle2,
  Globe,
  Zap,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin?: () => void;
  onSignup?: () => void;
  onGoToDashboard?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  onSignup,
  onGoToDashboard,
}) => {
  const { isAuthenticated } = useAuth();

  const handleAction = () => {
    if (isAuthenticated) {
      if (onGoToDashboard) {
        onGoToDashboard();
      } else {
        onGetStarted();
      }
    } else {
      if (onSignup) {
        onSignup();
      } else {
        onGetStarted();
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#111318] text-[#e2e2e9] flex flex-col font-sans selection:bg-[#a8c7fa]/25 selection:text-[#d3e3fd] pt-16 relative">
      {/* 1. Stationary Material 3 Top App Bar (Content flows under it) */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 w-full border-b border-[#44474f]/30 bg-[#111318]/90 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#282a2f] border border-[#44474f]/40 flex items-center justify-center text-xl shadow-sm">
            🐰
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white font-['Outfit']">
              Rabbly
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#c4c6d0]">
          <a href="#about" className="hover:text-white transition-colors">What is Rabbly</a>
          <a href="#why" className="hover:text-white transition-colors">Why</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#classrooms" className="hover:text-white transition-colors">Study Groups</a>
        </nav>

        {/* Action Buttons: Sign In and Start Learning (Routes to Sign Up) */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={handleAction}
              className="m3-btn-filled px-5 py-2 text-xs font-semibold tracking-wide cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={onLogin}
                className="px-4 py-2 text-xs font-semibold text-[#c4c6d0] hover:text-white transition-colors cursor-pointer rounded-full hover:bg-[#282a2f]"
              >
                Sign In
              </button>
              <button
                onClick={handleAction}
                className="m3-btn-filled px-5 py-2 text-xs font-semibold tracking-wide cursor-pointer shadow-sm hover:shadow-md transition-all"
              >
                Start Learning
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="about" className="w-full max-w-6xl mx-auto px-6 pt-16 pb-20 flex flex-col items-center text-center">
        {/* M3 Assist Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#282a2f] border border-[#44474f]/40 text-[#c2e7ff] text-xs font-medium mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#a8c7fa] animate-pulse"></span>
          <span>Autonomous Real-Time AI Teacher</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.12] mb-6 font-['Outfit']">
          Master any subject with an AI tutor that{' '}
          <span className="text-[#a8c7fa]">explains verbally</span> and{' '}
          <span className="text-[#d0bcff]">visually</span>.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[#c4c6d0] max-w-2xl leading-relaxed mb-8">
          Human tutors don't lecture through walls of text. They stand at a digital whiteboard, explaining ideas out loud while diagramming architecture, formulas, and relationships in real time. Rabbly brings that exact experience to your screen.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleAction}
            className="m3-btn-filled px-7 py-3.5 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-[#a8c7fa]/10 cursor-pointer"
          >
            <span>{isAuthenticated ? 'Open Workspace' : 'Start a Free Lesson'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#about"
            className="m3-btn-tonal px-6 py-3.5 text-sm font-semibold cursor-pointer inline-flex items-center"
          >
            Learn How Rabbly Works
          </a>
        </div>
      </section>

      {/* 3. "Why Rabbly?" — Core Pillars Section */}
      <section id="why" className="w-full bg-[#191c20] border-y border-[#44474f]/30 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-widest text-[#a8c7fa] mb-2 font-mono">
              Why Rabbly
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit']">
              Why auditory and visual teaching changes everything.
            </h3>
            <p className="text-sm sm:text-base text-[#c4c6d0] mt-3 leading-relaxed">
              Text chatbots require reading hundreds of words of dense text. Videos don't let you ask questions. Rabbly bridges the gap with an agent that speaks, illustrates, and listens.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1 */}
            <div className="m3-card p-6 sm:p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0842a0]/40 border border-[#0842a0]/60 text-[#a8c7fa] flex items-center justify-center mb-4">
                <Volume2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white font-['Outfit']">
                Spoken Voice Pedagogy
              </h4>
              <p className="text-sm text-[#c4c6d0] leading-relaxed">
                Rabbly teaches using spoken voice in natural conversational cadences. Concepts are explained step-by-step with natural emphasis and pacing, preventing the cognitive overload of reading walls of text.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="m3-card p-6 sm:p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#4f378b]/40 border border-[#4f378b]/60 text-[#d0bcff] flex items-center justify-center mb-4">
                <Layout className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white font-['Outfit']">
                Synchronized Digital Whiteboard
              </h4>
              <p className="text-sm text-[#c4c6d0] leading-relaxed">
                As the teacher explains, it illustrates concept cards, mathematical equations, and directional arrows live on the board. You see the mental model form visually in exact synchronization with the spoken words.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="m3-card p-6 sm:p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#004a77]/40 border border-[#004a77]/60 text-[#c2e7ff] flex items-center justify-center mb-4">
                <Globe className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white font-['Outfit']">
                Available Anytime, Anywhere
              </h4>
              <p className="text-sm text-[#c4c6d0] leading-relaxed">
                No booking appointments, expensive hourly tutoring rates, or waiting for office hours. Whether it’s 2 AM exam preparation or a quick afternoon refresher, Rabbly is ready to teach on demand across any device.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="m3-card p-6 sm:p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#282a2f] border border-[#44474f]/60 text-[#e2e2e9] flex items-center justify-center mb-4">
                <Mic className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white font-['Outfit']">
                Natural Voice Interruption & Q&A
              </h4>
              <p className="text-sm text-[#c4c6d0] leading-relaxed">
                You are muted by default so you never feel pressured. When you want clarification, simply unmute and speak. Rabbly immediately halts its lecture, listens, and illustrates the answer on the board.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "How It Works" 3-Step Flow */}
      <section id="how-it-works" className="w-full py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs uppercase font-bold tracking-widest text-[#a8c7fa] mb-2 font-mono">
            Simple 3-Step Workflow
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit']">
            From any prompt to a live interactive lecture.
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="m3-card-interactive p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <span className="text-3xl font-extrabold text-[#a8c7fa] font-mono block mb-4">01</span>
              <h4 className="text-base font-bold text-white mb-2 font-['Outfit']">
                Enter Topic or Upload Material
              </h4>
              <p className="text-xs sm:text-sm text-[#c4c6d0] leading-relaxed">
                Type any subject you want to master, or upload lecture notes, slides, or a syllabus in PDF or Markdown format.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#44474f]/30 flex items-center gap-2 text-xs text-[#a8c7fa]">
              <BookOpen className="w-4 h-4" />
              <span>PDF, TXT, Markdown supported</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="m3-card-interactive p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <span className="text-3xl font-extrabold text-[#d0bcff] font-mono block mb-4">02</span>
              <h4 className="text-base font-bold text-white mb-2 font-['Outfit']">
                Curriculum Synthesis
              </h4>
              <p className="text-xs sm:text-sm text-[#c4c6d0] leading-relaxed">
                Rabbly analyzes the material, prepares a 4-part milestone breakdown, key formula notes, and initial whiteboard diagrams.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#44474f]/30 flex items-center gap-2 text-xs text-[#d0bcff]">
              <BookOpen className="w-4 h-4" />
              <span>Automated pedagogical outline</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="m3-card-interactive p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <span className="text-3xl font-extrabold text-[#c2e7ff] font-mono block mb-4">03</span>
              <h4 className="text-base font-bold text-white mb-2 font-['Outfit']">
                Live Teaching & Whiteboard Sync
              </h4>
              <p className="text-xs sm:text-sm text-[#c4c6d0] leading-relaxed">
                The digital whiteboard launches. Rabbly starts speaking and diagramming live. Unmute whenever you want to ask a question.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#44474f]/30 flex items-center gap-2 text-xs text-[#c2e7ff]">
              <Zap className="w-4 h-4" />
              <span>Real-time voice & digital whiteboard</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Study Modes: Personal Tutoring & Collaborative Study Groups */}
      <section id="classrooms" className="w-full bg-[#191c20] border-y border-[#44474f]/30 py-20 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-4 text-left">
            <span className="text-xs uppercase font-bold tracking-widest text-[#a8c7fa] font-mono">
              Flexible Study Modes
            </span>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] leading-tight">
              Personal 1-on-1 tutoring, or collaborative study groups.
            </h3>
            <p className="text-sm text-[#c4c6d0] leading-relaxed">
              Whether you need focused guidance to prepare for an exam or want to tackle tricky problem sets with friends, Rabbly adapts to how you learn best. Start a 1-on-1 session anytime, or invite classmates so everyone can follow the live whiteboard and listen to the lecture together.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 text-xs text-[#e2e2e9]">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-[#a8c7fa]/15 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-[#a8c7fa]" />
                </div>
                <div>
                  <strong className="text-white block font-semibold text-xs">Personal 1-on-1 Tutoring</strong>
                  <span className="text-[#c4c6d0]">Learn at your own pace with a dedicated AI teacher tailored to your questions.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs text-[#e2e2e9]">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-[#d0bcff]/15 flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5 text-[#d0bcff]" />
                </div>
                <div>
                  <strong className="text-white block font-semibold text-xs">Collaborative Study Groups</strong>
                  <span className="text-[#c4c6d0]">Share an invite code so friends can jump in from any browser in seconds.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs text-[#e2e2e9]">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-[#c2e7ff]/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#c2e7ff]" />
                </div>
                <div>
                  <strong className="text-white block font-semibold text-xs">Synchronized Learning</strong>
                  <span className="text-[#c4c6d0]">Everyone watches the digital whiteboard diagrams unfold live and hears the same spoken explanations.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-96 m3-card p-6 bg-[#1d2024] border border-[#44474f]/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#44474f]/30">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Live Study Group</span>
              <span className="text-xs font-mono font-bold text-[#a8c7fa]">RAB-9412</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#282a2f] text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🎓</span>
                  <span className="font-medium text-white">You (Host)</span>
                </div>
                <span className="text-[10px] text-[#a8c7fa] bg-[#a8c7fa]/10 px-2 py-0.5 rounded-full font-medium">Listening</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#282a2f] text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👩🏻‍💻</span>
                  <span className="font-medium text-white">Maya Chen</span>
                </div>
                <span className="text-[10px] text-[#a8c7fa] bg-[#a8c7fa]/10 px-2 py-0.5 rounded-full font-medium">Listening</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#282a2f] text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👨🏽‍🎓</span>
                  <span className="font-medium text-white">Jordan Patel</span>
                </div>
                <span className="text-[10px] text-[#a8c7fa] bg-[#a8c7fa]/10 px-2 py-0.5 rounded-full font-medium">Listening</span>
              </div>
            </div>

            <p className="text-[11px] text-[#8e9099] text-center pt-2">
              3 classmates studying together in real time
            </p>
          </div>
        </div>
      </section>

      {/* 6. Clean Material 3 Call to Action Section */}
      <section className="w-full py-20 px-6 max-w-4xl mx-auto text-center">
        <div className="m3-card p-10 sm:p-14 bg-[#1d2024] border border-[#44474f]/40 shadow-2xl relative overflow-hidden">
          <span className="text-xs uppercase font-bold tracking-widest text-[#a8c7fa] font-mono block mb-3">
            Start Learning
          </span>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] mb-4">
            Ready to experience active, multimodal tutoring?
          </h3>
          <p className="text-sm sm:text-base text-[#c4c6d0] max-w-xl mx-auto mb-8 leading-relaxed">
            Turn any subject or document into an interactive oral lecture with live digital whiteboard diagrams.
          </p>
          <button
            onClick={handleAction}
            className="m3-btn-filled px-8 py-4 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-[#a8c7fa]/15"
          >
            <span>{isAuthenticated ? 'Open Workspace' : 'Start a Free Lesson'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 7. Material 3 Footer */}
      <footer className="w-full border-t border-[#44474f]/30 bg-[#111318] py-12 px-6 mt-auto text-xs text-[#8e9099]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🐰</span>
            <span className="font-bold text-white text-sm font-['Outfit']">Rabbly</span>
            <span>— The Real-Time Agentic AI Teacher</span>
          </div>

          <p className="text-center sm:text-right">
            Autonomous multimodal tutoring for individuals and classrooms.
          </p>
        </div>
      </footer>
    </div>
  );
};
