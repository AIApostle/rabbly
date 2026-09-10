import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Loader2,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SignupFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

const GOALS = [
  { key: 'student', emoji: '🎓', label: 'College / Exams' },
  { key: 'pro', emoji: '💼', label: 'Tech & Work' },
  { key: 'curious', emoji: '🔭', label: 'Self Study' },
] as const;

type GoalKey = typeof GOALS[number]['key'];

function StrengthBar({ password }: { password: string }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['', 'Weak', 'Good', 'Strong'];
  const colors = ['', '#f2b8b5', '#ffd8e4', '#a8c7fa'];

  return (
    <div className="space-y-1 pt-1">
      <div className="flex gap-1 h-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: score >= i ? colors[score] : 'rgba(68,71,79,0.3)' }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-[#44474f]">Strength</span>
        {score > 0 && (
          <span style={{ color: colors[score] }} className="font-semibold">
            {labels[score]}
          </span>
        )}
      </div>
    </div>
  );
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [goal, setGoal] = useState<GoalKey>('student');
  const [agreed, setAgreed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill out all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Terms of Service to continue.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await signup({ email: email.trim(), password, fullName: name.trim() });
      setIsLoading(false);
      if (res.confirmation_sent || !res.access_token) {
        setRegisteredEmail(email.trim());
        setConfirmationSent(true);
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Registration failed. Please try again.');
    }
  };

  const handleGoogleSignUp = () => {
    setError('Google sign-up is not yet available. Please use email and password.');
  };

  // ── Confirmation sent screen ──
  if (confirmationSent) {
    return (
      <div className="space-y-5 text-center py-2">
        <div className="w-16 h-16 rounded-2xl bg-[#0842a0]/30 border border-[#a8c7fa]/30 flex items-center justify-center mx-auto shadow-lg shadow-[#0842a0]/20">
          <Mail className="w-8 h-8 text-[#a8c7fa]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white font-['Outfit']">Check your inbox</h2>
          <p className="text-sm text-[#8e9099] leading-relaxed max-w-xs mx-auto">
            We sent a verification link to{' '}
            <span className="font-semibold text-white font-mono">{registeredEmail}</span>. Click
            it to activate your account, then sign in.
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full h-11 rounded-xl text-sm font-bold text-[#062e6f] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #a8c7fa 0%, #c2e7ff 100%)',
            boxShadow: '0 4px 16px rgba(168,199,250,0.25)',
          }}
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-[1.6rem] font-black text-white font-['Outfit'] tracking-tight leading-tight">
          Create your account
        </h2>
        <p className="text-sm text-[#8e9099]">Start learning with your personal AI teacher</p>
      </div>

      {/* Google SSO */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-xl bg-[#1a1d22] hover:bg-[#22262d] border border-[#44474f]/40 hover:border-[#8e9099]/40 text-white text-sm font-medium flex items-center justify-center gap-3 transition-all cursor-pointer group"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span className="text-[#c4c6d0] group-hover:text-white transition-colors">
          Sign up with Google
        </span>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#44474f]/30" />
        <span className="text-[11px] font-medium text-[#44474f] uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-[#44474f]/30" />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-[#93000a]/15 border border-[#93000a]/40 text-[13px] text-[#ffb4ab] leading-snug">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#c4c6d0] uppercase tracking-wider">
            Full Name
          </label>
          <div className="relative group">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#44474f] group-focus-within:text-[#a8c7fa] transition-colors pointer-events-none" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Johnson"
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa]/70 focus:bg-[#0f1218] text-sm text-white placeholder-[#44474f] focus:outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#c4c6d0] uppercase tracking-wider">
            Email
          </label>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#44474f] group-focus-within:text-[#a8c7fa] transition-colors pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@university.edu"
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa]/70 focus:bg-[#0f1218] text-sm text-white placeholder-[#44474f] focus:outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Learning Focus */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#c4c6d0] uppercase tracking-wider">
            Learning Focus
          </label>
          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setGoal(item.key)}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  goal === item.key
                    ? 'bg-[#0842a0]/25 border-[#a8c7fa]/50 text-white shadow-sm shadow-[#a8c7fa]/10'
                    : 'bg-[#111318] border-[#44474f]/40 text-[#8e9099] hover:bg-[#1a1d22] hover:text-[#c4c6d0]'
                }`}
              >
                <span className="text-base">{item.emoji}</span>
                <span className="leading-tight text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#c4c6d0] uppercase tracking-wider">
            Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#44474f] group-focus-within:text-[#a8c7fa] transition-colors pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              className="w-full h-11 pl-10 pr-11 rounded-xl bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa]/70 focus:bg-[#0f1218] text-sm text-white placeholder-[#44474f] focus:outline-none transition-all shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#44474f] hover:text-[#8e9099] transition-colors cursor-pointer p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <StrengthBar password={password} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#c4c6d0] uppercase tracking-wider">
            Confirm Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#44474f] group-focus-within:text-[#a8c7fa] transition-colors pointer-events-none" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              className="w-full h-11 pl-10 pr-20 rounded-xl bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa]/70 focus:bg-[#0f1218] text-sm text-white placeholder-[#44474f] focus:outline-none transition-all shadow-inner"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {passwordsMatch && (
                <Check className="w-4 h-4 text-[#a8c7fa] shrink-0" />
              )}
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-[#44474f] hover:text-[#8e9099] transition-colors cursor-pointer p-1 shrink-0"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2.5 cursor-pointer group pt-0.5">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-4 h-4 rounded border transition-all ${
                agreed
                  ? 'bg-[#a8c7fa] border-[#a8c7fa]'
                  : 'bg-transparent border-[#44474f]/60 group-hover:border-[#8e9099]'
              }`}
            >
              {agreed && (
                <svg className="w-3 h-3 text-[#062e6f] absolute top-0.5 left-0.5" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-[13px] text-[#8e9099] leading-relaxed group-hover:text-[#c4c6d0] transition-colors">
            I agree to Rabbly's{' '}
            <a href="#" className="text-[#a8c7fa] hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-[#a8c7fa] hover:underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl text-sm font-bold text-[#062e6f] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-1"
          style={{
            background: isLoading
              ? '#a8c7fa'
              : 'linear-gradient(135deg, #a8c7fa 0%, #c2e7ff 100%)',
            boxShadow: '0 4px 16px rgba(168,199,250,0.25)',
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      {/* Switch to login */}
      <p className="text-center text-[13px] text-[#8e9099]">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold text-[#a8c7fa] hover:text-[#c2e7ff] cursor-pointer transition-colors"
        >
          Sign in
        </button>
      </p>
    </div>
  );
};
