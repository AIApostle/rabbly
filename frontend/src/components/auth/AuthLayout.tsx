import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, BookOpen, Users, Brain, Sparkles, Zap } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  badgeText?: string;
  activeTab?: 'login' | 'signup';
  children: React.ReactNode;
}

// Floating feature pill for the brand panel
const FeaturePill: React.FC<{
  icon: React.ReactNode;
  text: string;
  delay: string;
  position: string;
}> = ({ icon, text, delay, position }) => (
  <div
    className={`absolute ${position} flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/8 border border-white/12 backdrop-blur-md text-xs font-medium text-white/80 shadow-lg`}
    style={{
      animation: `floatPill 6s ease-in-out infinite ${delay}`,
    }}
  >
    <span className="text-[#a8c7fa] shrink-0">{icon}</span>
    {text}
  </div>
);

// Stats badge for the brand panel
const StatBadge: React.FC<{ value: string; label: string; delay: string }> = ({
  value,
  label,
  delay,
}) => (
  <div
    className="flex flex-col items-center gap-0.5"
    style={{ animation: `fadeSlideUp 0.6s ease-out ${delay} both` }}
  >
    <span className="text-2xl font-black text-white font-['Outfit'] tracking-tight leading-none">
      {value}
    </span>
    <span className="text-[11px] text-white/50 font-medium uppercase tracking-wider">{label}</span>
  </div>
);

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title: _title,
  badgeText = 'Secure Learning Portal',
  activeTab,
  children,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] w-full bg-[#0c0e13] text-[#e2e2e9] flex font-sans selection:bg-[#a8c7fa]/25 selection:text-[#d3e3fd] overflow-hidden">
      <style>{`
        @keyframes floatPill {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeSlideLeft {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes shimmer {
          from { background-position: -200% center; }
          to { background-position: 200% center; }
        }
      `}</style>

      {/* ─── Left Brand Panel (hidden on mobile) ─── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col overflow-hidden bg-[#0842a0]/10">
        {/* Background gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0842a0]/30 via-[#0c0e13] to-[#06142d]/50" />

        {/* Animated gradient orbs */}
        <div
          className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(8,66,160,0.35) 0%, transparent 70%)',
            animation: 'pulseGlow 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-[-5%] right-[-10%] w-[50%] h-[50%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(168,199,250,0.12) 0%, transparent 70%)',
            animation: 'pulseGlow 10s ease-in-out infinite 2s',
          }}
        />
        <div
          className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(168,199,250,0.08) 0%, transparent 70%)',
            animation: 'pulseGlow 12s ease-in-out infinite 4s',
          }}
        />

        {/* Rotating ring decoration */}
        <div
          className="absolute top-[15%] right-[8%] w-48 h-48 rounded-full border border-[#a8c7fa]/8"
          style={{ animation: 'rotateSlow 30s linear infinite' }}
        >
          <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#a8c7fa]/40" />
        </div>
        <div
          className="absolute bottom-[20%] left-[5%] w-32 h-32 rounded-full border border-[#a8c7fa]/6"
          style={{ animation: 'rotateSlow 20s linear infinite reverse' }}
        >
          <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-[#a8c7fa]/30" />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(168,199,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(168,199,250,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-10">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
            style={{ animation: 'fadeSlideRight 0.5s ease-out 0.1s both' }}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#0842a0]/60 border border-[#a8c7fa]/25 flex items-center justify-center text-xl shadow-lg shadow-[#0842a0]/30">
              🐰
            </div>
            <span className="text-xl font-black text-white font-['Outfit'] tracking-tight group-hover:text-[#a8c7fa] transition-colors">
              Rabbly
            </span>
          </div>

          {/* Main brand statement */}
          <div className="flex-1 flex flex-col justify-center gap-8">
            <div style={{ animation: 'fadeSlideRight 0.5s ease-out 0.25s both' }}>
              <p className="text-sm font-semibold text-[#a8c7fa] uppercase tracking-[0.2em] mb-4">
                AI-Powered Learning
              </p>
              <h1 className="text-4xl xl:text-5xl font-black text-white font-['Outfit'] tracking-tight leading-[1.05] mb-5">
                Learn smarter,
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #a8c7fa 0%, #c2e7ff 50%, #d3e3fd 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  not harder.
                </span>
              </h1>
              <p className="text-base text-white/55 leading-relaxed max-w-sm">
                Your personal AI teacher, live whiteboard sessions, and structured curriculum — all
                in one place.
              </p>
            </div>

            {/* Feature pills (floating) */}
            <div
              className="relative h-36"
              style={{ animation: 'fadeSlideRight 0.5s ease-out 0.4s both' }}
            >
              <FeaturePill
                icon={<Brain className="w-3.5 h-3.5" />}
                text="AI Tutor on demand"
                delay="0s"
                position="top-0 left-0"
              />
              <FeaturePill
                icon={<Sparkles className="w-3.5 h-3.5" />}
                text="Live whiteboard sessions"
                delay="1.5s"
                position="top-8 left-[35%]"
              />
              <FeaturePill
                icon={<Users className="w-3.5 h-3.5" />}
                text="Study groups"
                delay="3s"
                position="top-2 right-4"
              />
              <FeaturePill
                icon={<BookOpen className="w-3.5 h-3.5" />}
                text="Structured curriculum"
                delay="0.8s"
                position="bottom-0 left-[15%]"
              />
              <FeaturePill
                icon={<Zap className="w-3.5 h-3.5" />}
                text="Instant Q&A"
                delay="2s"
                position="bottom-4 right-0"
              />
            </div>

            {/* Stats */}
            <div
              className="flex items-center gap-8 pt-4 border-t border-white/8"
              style={{ animation: 'fadeSlideRight 0.5s ease-out 0.55s both' }}
            >
              <StatBadge value="12k+" label="Learners" delay="0.6s" />
              <div className="w-px h-8 bg-white/10" />
              <StatBadge value="98%" label="Satisfaction" delay="0.7s" />
              <div className="w-px h-8 bg-white/10" />
              <StatBadge value="50+" label="Topics" delay="0.8s" />
            </div>
          </div>

          {/* Bottom quote */}
          <div
            className="mt-auto pt-6 border-t border-white/8"
            style={{ animation: 'fadeSlideRight 0.5s ease-out 0.7s both' }}
          >
            <p className="text-[13px] text-white/40 leading-relaxed italic">
              "Rabbly transformed how I study for exams. My grades went up and I actually enjoy
              learning now."
            </p>
            <p className="text-[11px] text-white/30 mt-2 font-medium">
              — Alex Chen, Computer Science student
            </p>
          </div>
        </div>
      </div>

      {/* ─── Right Form Panel ─── */}
      <div className="flex-1 flex flex-col relative">
        {/* Background for right panel */}
        <div className="absolute inset-0 bg-[#0f1115]" />
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(8,66,160,0.4) 0%, transparent 70%)',
          }}
        />

        {/* Top bar for mobile */}
        <header
          className="relative z-10 lg:hidden sticky top-0 h-14 w-full border-b border-[#44474f]/20 bg-[#0f1115]/90 backdrop-blur-md px-4 flex items-center justify-between"
          style={{ animation: 'fadeSlideUp 0.4s ease-out 0.05s both' }}
        >
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full bg-[#1d2024] hover:bg-[#282a2f] border border-[#44474f]/40 text-[#c4c6d0] hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-base">🐰</span>
            <span className="font-bold text-sm text-white font-['Outfit']">Rabbly</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1d2024] border border-[#44474f]/30 text-[10px] text-[#c2e7ff]">
            <Shield className="w-3 h-3 text-[#a8c7fa]" />
            <span>{badgeText}</span>
          </div>
        </header>

        {/* Desktop back button */}
        <div
          className="relative z-10 hidden lg:flex items-center justify-between px-10 xl:px-14 pt-8 pb-0"
          style={{ animation: 'fadeSlideLeft 0.5s ease-out 0.1s both' }}
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs text-[#8e9099] hover:text-[#c4c6d0] transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to home
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1d2024] border border-[#44474f]/25 text-[11px] text-[#c2e7ff] font-medium">
            <Shield className="w-3 h-3 text-[#a8c7fa]" />
            <span>{badgeText}</span>
          </div>
        </div>

        {/* Form area */}
        <main
          className="relative z-10 flex-1 flex flex-col justify-center px-6 py-8 lg:px-10 xl:px-14"
          style={{ animation: 'fadeSlideLeft 0.5s ease-out 0.2s both' }}
        >
          <div className="w-full max-w-sm mx-auto lg:mx-0 lg:max-w-md">
            {/* Tab switcher */}
            {activeTab && (
              <div
                className="flex rounded-2xl bg-[#1a1d22] p-1 border border-[#44474f]/30 mb-7 shadow-inner"
                style={{ animation: 'fadeSlideLeft 0.4s ease-out 0.3s both' }}
              >
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-gradient-to-r from-[#0842a0] to-[#1565c0] text-white shadow-md shadow-[#0842a0]/30'
                      : 'text-[#8e9099] hover:text-[#c4c6d0]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeTab === 'signup'
                      ? 'bg-gradient-to-r from-[#0842a0] to-[#1565c0] text-white shadow-md shadow-[#0842a0]/30'
                      : 'text-[#8e9099] hover:text-[#c4c6d0]'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Form card — glass surface */}
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, rgba(29,32,36,0.9) 0%, rgba(22,25,30,0.95) 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.04) inset, 0 32px 64px -24px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(168,199,250,0.06)',
              }}
            >
              {/* Top shimmer line */}
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(168,199,250,0.3) 50%, transparent 100%)',
                }}
              />
              <div className="p-7 sm:p-8">{children}</div>
            </div>

            {/* Footer */}
            <div
              className="text-center pt-6 text-[11px] text-[#8e9099] space-y-2"
              style={{ animation: 'fadeSlideLeft 0.4s ease-out 0.5s both' }}
            >
              <p>Protected by end-to-end encrypted learning sessions</p>
              <div className="flex justify-center gap-4 text-[#a8c7fa]">
                <a href="#" className="hover:underline transition-opacity hover:opacity-80">
                  Privacy Policy
                </a>
                <span>·</span>
                <a href="#" className="hover:underline transition-opacity hover:opacity-80">
                  Terms
                </a>
                <span>·</span>
                <a href="#" className="hover:underline transition-opacity hover:opacity-80">
                  Help
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
