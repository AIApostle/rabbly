import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Upload,
  Camera,
  Check,
  Crown,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  { id: 'robot', label: 'AI Researcher', emoji: '🤖', bg: 'from-blue-600 to-cyan-500' },
  { id: 'rocket', label: 'Astro Pioneer', emoji: '🚀', bg: 'from-blue-600 to-sky-500' },
  { id: 'atom', label: 'Quantum Physicist', emoji: '⚛️', bg: 'from-emerald-600 to-teal-500' },
  { id: 'brain', label: 'Neuro Sage', emoji: '🧠', bg: 'from-pink-600 to-rose-500' },
  { id: 'bolt', label: 'Cyber Architect', emoji: '⚡', bg: 'from-amber-600 to-orange-500' },
  { id: 'owl', label: 'Academic Scholar', emoji: '🦉', bg: 'from-amber-700 to-yellow-600' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.fullName || user?.full_name || '');
  const [username, setUsername] = useState(user?.username || (user?.email ? `@${user.email.split('@')[0]}` : '@student'));
  const [bio, setBio] = useState(user?.bio || 'Mastering STEM, deep derivations, and interactive concepts on Rabbly AI.');
  const [studyField, setStudyField] = useState(user?.studyField || 'Computer Science & AI');
  const [preferredLevel, setPreferredLevel] = useState(user?.preferredLevel || 'Intermediate');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatarUrl || user?.avatar_url);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      alert('Avatar image should be under 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof PRESET_AVATARS[0]) => {
    // Generate a data uri / preset marker
    setAvatarUrl(`preset:${preset.emoji}`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      fullName: fullName.trim(),
      full_name: fullName.trim(),
      username: username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`,
      bio: bio.trim(),
      studyField: studyField.trim(),
      preferredLevel,
      preferred_level: preferredLevel,
      avatarUrl,
      avatar_url: avatarUrl,
    });

    setSavedSuccess(true);
    confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const isPresetAvatar = avatarUrl?.startsWith('preset:');
  const presetEmoji = isPresetAvatar ? avatarUrl?.replace('preset:', '') : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-[#17191e] border border-[#44474f]/50 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Hidden Avatar File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#44474f]/30 flex items-center justify-between bg-[#191c20]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0842a0]/30 text-[#a8c7fa] border border-[#a8c7fa]/30 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-['Outfit']">Student Profile</h3>
                {user?.isPro ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>PRO</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-[#282a2f] text-[#8e9099] font-mono text-[10px]">
                    Free Member
                  </span>
                )}
              </div>
              <span className="text-xs text-[#8e9099]">Manage your identity, avatar, learning focus, and track records</span>
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

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Avatar Section */}
          <div className="p-4 rounded-3xl bg-[#1d2024] border border-[#44474f]/40 flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar Display */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-tr from-[#0842a0] to-[#4f378b] border-2 border-[#a8c7fa]/40 flex items-center justify-center text-3xl shadow-lg">
                {isPresetAvatar ? (
                  <span>{presetEmoji}</span>
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-white text-xl">
                    {fullName
                      ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'ST'}
                  </span>
                )}
              </div>

              {/* Upload Overlay Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-opacity cursor-pointer"
              >
                <Camera className="w-5 h-5 mb-1" />
                <span>Change</span>
              </button>
            </div>

            {/* Avatar Controls */}
            <div className="flex-1 space-y-2.5 text-center sm:text-left">
              <div>
                <h4 className="text-sm font-bold text-white">Profile Photo & Avatars</h4>
                <p className="text-[11px] text-[#8e9099]">Upload a custom image (max 3MB) or choose an academic avatar.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-[#282a2f] hover:bg-[#33353a] text-xs font-semibold text-white border border-[#44474f]/40 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[#a8c7fa]" />
                  <span>Upload Photo</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(undefined)}
                    className="px-3 py-1.5 rounded-xl bg-[#282a2f] hover:bg-rose-950/40 text-xs font-semibold text-[#8e9099] hover:text-rose-300 border border-[#44474f]/40 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Preset Avatar Chips */}
              <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-start pt-1">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-8 h-8 rounded-xl bg-[#111318] hover:bg-[#282a2f] border text-sm flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                      presetEmoji === preset.emoji
                        ? 'border-[#a8c7fa] ring-2 ring-[#a8c7fa]/30'
                        : 'border-[#44474f]/40'
                    }`}
                    title={preset.label}
                  >
                    {preset.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* User Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] block mb-1 font-mono">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Richard Feynman"
                className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-[#8e9099] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] block mb-1 font-mono">
                Username / Handle
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@student"
                className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-[#8e9099] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] block mb-1 font-mono">
                Field of Study / Domain
              </label>
              <input
                type="text"
                value={studyField}
                onChange={(e) => setStudyField(e.target.value)}
                placeholder="e.g. Computer Science, AI, Quantum Physics"
                className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-[#8e9099] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] block mb-1 font-mono">
                Default Learning Level
              </label>
              <select
                value={preferredLevel}
                onChange={(e) => setPreferredLevel(e.target.value)}
                className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa] rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="Beginner">Beginner (Foundations & Intuition)</option>
                <option value="Intermediate">Intermediate (Core Equations & Applied)</option>
                <option value="Advanced">Advanced (Rigorous Derivations & SOTA)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#8e9099] block mb-1 font-mono">
              Learning Motto & Focus Bio
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are your current learning objectives?"
              className="w-full bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa] rounded-2xl p-3 text-xs text-white placeholder-[#8e9099] focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Learning Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-[#1d2024] border border-[#44474f]/30 text-center">
              <div className="text-[10px] text-[#8e9099] font-mono uppercase">Sessions</div>
              <div className="text-base sm:text-lg font-bold text-white font-['Outfit'] mt-0.5">14</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#1d2024] border border-[#44474f]/30 text-center">
              <div className="text-[10px] text-[#8e9099] font-mono uppercase">Checkpoints</div>
              <div className="text-base sm:text-lg font-bold text-emerald-400 font-['Outfit'] mt-0.5">48</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#1d2024] border border-[#44474f]/30 text-center">
              <div className="text-[10px] text-[#8e9099] font-mono uppercase">Study Streak</div>
              <div className="text-base sm:text-lg font-bold text-sky-400 font-['Outfit'] mt-0.5">5 Days</div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2 border-t border-[#44474f]/30 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#c4c6d0] hover:text-white hover:bg-[#282a2f] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="m3-btn-filled px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#0842a0]/40 transition-all cursor-pointer"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{savedSuccess ? 'Saved!' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
