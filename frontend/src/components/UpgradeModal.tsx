import React, { useState } from 'react';
import {
  X,
  Crown,
  Sparkles,
  Zap,
  BookOpen,
  Users,
  Shield,
  ArrowRight,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRO_PERKS = [
  {
    icon: Zap,
    title: 'Unlimited Gemini 2.0 Live Audio & Speech',
    desc: 'Uncapped bidirectional voice streaming with sub-second response times and intelligent barge-in.',
  },
  {
    icon: BookOpen,
    title: 'Publication-Grade PDF Study Guides',
    desc: 'Export high-resolution LaTeX formulas, step-by-step mathematical proofs, and ASCII architectural schemas.',
  },
  {
    icon: Users,
    title: '50-Participant Collaborative Classrooms',
    desc: 'Host live lectures with synchronized multi-user cursors, raised hands, and interactive teacher whiteboard.',
  },
  {
    icon: Sparkles,
    title: 'Deep Research Syllabus & Academic Citations',
    desc: 'Synthesize canonical textbooks, arXiv papers, and university curricula directly into your blackboard canvas.',
  },
  {
    icon: Shield,
    title: 'Infinite Whiteboard Vault & Multi-Device Sync',
    desc: 'Permanent cloud storage for all derivations, board illustrations, and interactive checkpoints.',
  },
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [isActivating, setIsActivating] = useState(false);

  if (!isOpen) return null;

  const isAlreadyPro = user?.isPro;

  const handleUpgrade = () => {
    setIsActivating(true);
    setTimeout(() => {
      updateProfile({ isPro: true });
      setIsActivating(false);
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => {
        onClose();
      }, 1200);
    }, 600);
  };

  const handleDowngrade = () => {
    updateProfile({ isPro: false });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-[#14161a] border border-blue-500/40 shadow-2xl flex flex-col overflow-hidden relative">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-500/15 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 border-b border-[#44474f]/30 flex items-center justify-between relative z-10 bg-[#191c20]/90">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-white font-['Outfit']">Rabbly Pro</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-sky-300 border border-blue-500/40 text-[10px] font-mono font-bold">
                  UNLIMITED
                </span>
              </div>
              <span className="text-xs text-[#c4c6d0]">Fast-track subject mastery with state-of-the-art live AI teaching</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#282a2f] hover:bg-[#33353a] text-[#8e9099] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh] relative z-10">
          {/* Billing Switch */}
          <div className="flex justify-center">
            <div className="inline-flex items-center p-1 rounded-2xl bg-[#1d2024] border border-[#44474f]/40">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-[#0842a0] text-white shadow-md'
                    : 'text-[#8e9099] hover:text-white'
                }`}
              >
                Monthly ($19/mo)
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                    : 'text-[#8e9099] hover:text-white'
                }`}
              >
                <span>Annual ($15/mo)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-950/30 font-mono">
                  Save 21%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Highlight Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-b from-[#1d2024] to-[#17191e] border border-blue-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                  All-Inclusive Plan
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-extrabold text-white font-['Outfit']">
                    {billingCycle === 'annual' ? '$15' : '$19'}
                  </span>
                  <span className="text-xs text-[#8e9099] font-mono">/ month</span>
                </div>
              </div>

              {isAlreadyPro ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                  <Check className="w-3.5 h-3.5" />
                  <span>ACTIVE PLAN</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={isActivating}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-extrabold text-xs shadow-lg shadow-blue-500/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Crown className="w-4 h-4 text-white" />
                  <span>{isActivating ? 'Upgrading...' : 'Activate Pro Now'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-[#c4c6d0] leading-relaxed">
              Unlock the complete multimodal learning suite: continuous bidirectional voice conversation, comprehensive multi-page PDF generation, and full classroom hosting.
            </p>
          </div>

          {/* Feature Breakdown */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e9099] font-mono block">
              What's Included in Rabbly Pro:
            </span>

            <div className="space-y-2.5">
              {PRO_PERKS.map((perk, idx) => {
                const Icon = perk.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#191c20] border border-[#44474f]/30 flex items-start gap-3.5"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-sky-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-snug">{perk.title}</h4>
                      <p className="text-[11px] text-[#8e9099] leading-relaxed mt-0.5">{perk.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 border-t border-[#44474f]/30 flex items-center justify-between text-xs text-[#8e9099]">
            <span>Cancel or modify anytime. No lock-in.</span>

            {isAlreadyPro ? (
              <button
                type="button"
                onClick={handleDowngrade}
                className="text-rose-400 hover:text-rose-300 underline cursor-pointer text-[11px]"
              >
                Switch to Free
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="hover:text-white cursor-pointer"
              >
                Maybe later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
