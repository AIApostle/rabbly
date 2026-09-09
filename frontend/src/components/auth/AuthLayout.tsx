import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  badgeText?: string;
  activeTab?: 'login' | 'signup';
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  badgeText = 'Secure Learning Portal',
  activeTab,
  children,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#111318] text-[#e2e2e9] flex flex-col font-sans selection:bg-[#a8c7fa]/25 selection:text-[#d3e3fd]">
      {/* 1. Top App Bar */}
      <header className="sticky top-0 z-40 h-16 w-full border-b border-[#44474f]/30 bg-[#111318]/90 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-[#282a2f] hover:bg-[#33353a] border border-[#44474f]/40 text-[#c4c6d0] hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Back to Landing Page"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="text-lg">🐰</span>
            <span className="font-bold text-sm text-white font-['Outfit'] group-hover:text-[#a8c7fa] transition-colors">
              Rabbly
            </span>
            <span className="text-xs text-[#8e9099]">•</span>
            <span className="text-xs font-medium text-[#c4c6d0]">{title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#282a2f] border border-[#44474f]/40 text-xs text-[#c2e7ff] font-medium">
          <Shield className="w-3.5 h-3.5 text-[#a8c7fa]" />
          <span>{badgeText}</span>
        </div>
      </header>

      {/* 2. Main Centered Card Container */}
      <main className="flex-1 w-full max-w-md mx-auto px-6 py-12 flex flex-col justify-center relative">
        {/* Glowing backdrop aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#0842a0]/15 blur-3xl pointer-events-none rounded-full"></div>

        {/* M3 Elevated Surface Container */}
        <div className="m3-card p-6 sm:p-8 bg-[#1d2024] border border-[#44474f]/45 relative shadow-2xl space-y-6">
          {/* Segmented Sign In / Sign Up Switcher (Only visible in login/signup modes) */}
          {activeTab && (
            <div className="flex rounded-full bg-[#111318] p-1 border border-[#44474f]/40">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-[#a8c7fa] text-[#062e6f] shadow-sm'
                    : 'text-[#c4c6d0] hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  activeTab === 'signup'
                    ? 'bg-[#a8c7fa] text-[#062e6f] shadow-sm'
                    : 'text-[#c4c6d0] hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {children}
        </div>

        {/* Small Footer Assurance */}
        <div className="text-center pt-8 text-[11px] text-[#8e9099] space-y-1">
          <p>Protected by end-to-end encrypted learning sessions</p>
          <div className="flex justify-center gap-4 text-[#a8c7fa]">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:underline">Terms of Service</a>
            <span>•</span>
            <a href="#" className="hover:underline">Help Center</a>
          </div>
        </div>
      </main>
    </div>
  );
};
