import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Mic,
  Volume2,
  Palette,
  Bell,
  Check,
  Crown,
  Sparkles,
  Sliders,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgrade?: () => void;
}

const AI_VOICES = [
  { id: 'Aoede', name: 'Aoede', tone: 'Warm & Academic', desc: 'Patient, scholarly tone ideal for deep technical and mathematical explanations.' },
  { id: 'Puck', name: 'Puck', tone: 'Energetic & Dynamic', desc: 'Upbeat, fast-paced delivery great for sprint problem-solving and rapid intuition.' },
  { id: 'Fenrir', name: 'Fenrir', tone: 'Deep & Methodical', desc: 'Grounded baritone tone focused on architectural engineering and algorithmic rigor.' },
  { id: 'Kore', name: 'Kore', tone: 'Crisp & Analytical', desc: 'Concise, high-clarity articulation designed for theorem proofs and precision.' },
  { id: 'Charon', name: 'Charon', tone: 'Calm & Contemplative', desc: 'Thoughtful, measured pacing great for conceptual philosophy and theory.' },
];

const CANVAS_THEMES = [
  { id: 'midnight', name: 'Midnight Slate', hex: '#111318', border: '#44474f' },
  { id: 'oled', name: 'OLED True Black', hex: '#000000', border: '#333333' },
  { id: 'chalkboard', name: 'Classic Chalkboard', hex: '#0f241d', border: '#1f4d3e' },
  { id: 'blueprint', name: 'Architect Blueprint', hex: '#0c1b33', border: '#1e3a6f' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenUpgrade,
}) => {
  const { user, updateProfile } = useAuth();

  // Local settings state with localStorage persistence
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('rabbly_theme_mode') as 'dark' | 'light') || 'dark';
  });
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('rabbly_setting_voice') || user?.aiVoice || 'Aoede');
  const [vadEnabled, setVadEnabled] = useState(() => localStorage.getItem('rabbly_setting_vad') !== 'false');
  const [interruptionSensitivity, setInterruptionSensitivity] = useState(() => localStorage.getItem('rabbly_setting_interruption') || 'balanced');
  const [canvasTheme, setCanvasTheme] = useState(() => localStorage.getItem('rabbly_setting_canvas_theme') || 'midnight');
  const [confettiEnabled, setConfettiEnabled] = useState(() => localStorage.getItem('rabbly_setting_confetti') !== 'false');
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => localStorage.getItem('rabbly_setting_sfx') !== 'false');

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (user?.aiVoice) {
      setSelectedVoice(user.aiVoice);
    }
  }, [user?.aiVoice]);

  if (!isOpen) return null;

  const applyThemeMode = (mode: 'dark' | 'light') => {
    setThemeMode(mode);
    localStorage.setItem('rabbly_theme_mode', mode);
    if (mode === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    applyThemeMode(themeMode);
    localStorage.setItem('rabbly_setting_voice', selectedVoice);
    localStorage.setItem('rabbly_setting_vad', String(vadEnabled));
    localStorage.setItem('rabbly_setting_interruption', interruptionSensitivity);
    localStorage.setItem('rabbly_setting_canvas_theme', canvasTheme);
    localStorage.setItem('rabbly_setting_confetti', String(confettiEnabled));
    localStorage.setItem('rabbly_setting_sfx', String(soundEffectsEnabled));

    updateProfile({ aiVoice: selectedVoice });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-[#17191e] border border-[#44474f]/50 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#44474f]/30 flex items-center justify-between bg-[#191c20]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0842a0]/30 text-[#a8c7fa] border border-[#a8c7fa]/30 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-['Outfit']">System Settings</h3>
                {user?.isPro ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>PRO</span>
                  </span>
                ) : onOpenUpgrade ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUpgrade();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 hover:border-amber-400 text-[10px] font-mono font-bold transition-all cursor-pointer"
                  >
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>UPGRADE TO PRO</span>
                  </button>
                ) : null}
              </div>
              <span className="text-xs text-[#8e9099]">Configure AI tutor voice, speech gating, whiteboard canvas, and audio</span>
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Section 1: AI Tutor Voice */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#a8c7fa] font-mono uppercase tracking-wider">
              <Volume2 className="w-4 h-4" />
              <span>AI Tutor Voice Persona</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AI_VOICES.map((v) => {
                const isSelected = selectedVoice === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-[#0842a0]/30 border-[#a8c7fa] ring-1 ring-[#a8c7fa]/40 shadow-sm'
                        : 'bg-[#1d2024] border-[#44474f]/40 hover:border-[#44474f]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-['Outfit']">{v.name}</span>
                      <span className="text-[10px] font-mono text-[#a8c7fa] bg-[#0842a0]/40 px-1.5 py-0.5 rounded">
                        {v.tone}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8e9099] leading-relaxed">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Audio & Silence Compression (VAD) */}
          <div className="p-4 rounded-3xl bg-[#1d2024] border border-[#44474f]/40 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Voice Activity Silence Gating (VAD)</h4>
                  <p className="text-[11px] text-[#8e9099]">Suppresses ambient room noise to preserve ~80% of audio tokens.</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={vadEnabled}
                  onChange={(e) => setVadEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#282a2f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0842a0]"></div>
              </label>
            </div>

            <div className="pt-2 border-t border-[#44474f]/25 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#d0bcff]" />
                <div>
                  <h4 className="text-xs font-bold text-white">Live Interruption Sensitivity</h4>
                  <p className="text-[11px] text-[#8e9099]">Controls how quickly Rabbly pauses when you speak.</p>
                </div>
              </div>

              <select
                value={interruptionSensitivity}
                onChange={(e) => setInterruptionSensitivity(e.target.value)}
                className="bg-[#111318] border border-[#44474f]/50 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="instant">Instant (Fast Barge-In)</option>
                <option value="balanced">Balanced (Recommended)</option>
                <option value="patient">Patient (Completes Sentence)</option>
              </select>
            </div>
          </div>

          {/* Section 3: System Appearance (Dark / Light Mode) */}
          <div className="p-4 rounded-3xl bg-[#1d2024] border border-[#44474f]/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {themeMode === 'dark' ? (
                  <Moon className="w-4 h-4 text-[#a8c7fa]" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-white">System Appearance</h4>
                  <p className="text-[11px] text-[#8e9099]">Switch between Dark and Light interface themes.</p>
                </div>
              </div>

              <div className="flex items-center bg-[#111318] p-1 rounded-2xl border border-[#44474f]/40 gap-1">
                <button
                  type="button"
                  onClick={() => applyThemeMode('dark')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    themeMode === 'dark'
                      ? 'bg-[#282a2f] text-white shadow-sm border border-[#44474f]/50'
                      : 'text-[#8e9099] hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-[#a8c7fa]" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyThemeMode('light')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    themeMode === 'light'
                      ? 'bg-white text-slate-950 shadow-sm font-bold'
                      : 'text-[#8e9099] hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Light</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Whiteboard Canvas Theme */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#a8c7fa] font-mono uppercase tracking-wider">
              <Palette className="w-4 h-4" />
              <span>Whiteboard Surface Theme</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CANVAS_THEMES.map((theme) => {
                const isSelected = canvasTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setCanvasTheme(theme.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'border-[#a8c7fa] ring-2 ring-[#a8c7fa]/30 bg-[#212429]'
                        : 'border-[#44474f]/40 bg-[#1d2024] hover:bg-[#212429]'
                    }`}
                  >
                    <div
                      className="w-full h-8 rounded-xl border"
                      style={{ backgroundColor: theme.hex, borderColor: theme.border }}
                    />
                    <span className="text-xs font-bold text-white leading-tight">{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Notifications & Confetti */}
          <div className="p-4 rounded-3xl bg-[#1d2024] border border-[#44474f]/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Milestone Confetti Celebrations</h4>
                  <p className="text-[11px] text-[#8e9099]">Celebration bursts upon mastering checkpoints and completing modules.</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={confettiEnabled}
                  onChange={(e) => setConfettiEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#282a2f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0842a0]"></div>
              </label>
            </div>

            <div className="pt-2 border-t border-[#44474f]/25 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#a8c7fa]" />
                <div>
                  <h4 className="text-xs font-bold text-white">Sound Effects & Drawing Chimes</h4>
                  <p className="text-[11px] text-[#8e9099]">Audio feedback when shapes and derivations are rendered.</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEffectsEnabled}
                  onChange={(e) => setSoundEffectsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#282a2f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0842a0]"></div>
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-[#44474f]/30 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#c4c6d0] hover:text-white hover:bg-[#282a2f] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="m3-btn-filled px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#0842a0]/40 transition-all cursor-pointer"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : null}
              <span>{savedSuccess ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
