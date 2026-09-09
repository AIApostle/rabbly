import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Loader2, Check, Sparkles } from 'lucide-react';

interface SignupFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [goal, setGoal] = useState<'student' | 'pro' | 'curious'>('student');
  const [agreed, setAgreed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength logic
  const calculateStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = calculateStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
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

    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 1000);
  };

  const handleGoogleSignUp = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-1.5">
        <h2 className="text-2xl font-extrabold text-white font-['Outfit'] tracking-tight">
          Create your account
        </h2>
        <p className="text-xs text-[#c4c6d0]">
          Start learning visually and verbally with your personal AI teacher
        </p>
      </div>

      {/* Google SSO Button */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] border border-[#44474f]/50 text-white text-xs font-semibold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm hover:border-[#8e9099]"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
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
        <span>Sign up with Google</span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-[#44474f]/30"></div>
        <span className="absolute bg-[#1d2024] px-3 text-[11px] uppercase tracking-wider text-[#8e9099] font-mono">
          or with email
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-[#93000a]/20 border border-[#93000a]/50 text-xs text-[#ffb4ab] text-center">
          {error}
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#c4c6d0]">
            Full Name
          </label>
          <div className="relative flex items-center rounded-2xl bg-[#111318] border border-[#44474f]/50 focus-within:border-[#a8c7fa] transition-all px-3.5 py-3">
            <User className="w-4 h-4 text-[#8e9099] mr-2.5 shrink-0" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Johnson"
              required
              className="w-full bg-transparent text-sm text-white placeholder-[#8e9099] focus:outline-none"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#c4c6d0]">
            Email Address
          </label>
          <div className="relative flex items-center rounded-2xl bg-[#111318] border border-[#44474f]/50 focus-within:border-[#a8c7fa] transition-all px-3.5 py-3">
            <Mail className="w-4 h-4 text-[#8e9099] mr-2.5 shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@university.edu"
              required
              className="w-full bg-transparent text-sm text-white placeholder-[#8e9099] focus:outline-none"
            />
          </div>
        </div>

        {/* Primary Goal Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#c4c6d0]">
            Primary Learning Focus
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'student', label: 'College / Exam' },
              { key: 'pro', label: 'Tech / Work' },
              { key: 'curious', label: 'Self Study' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setGoal(item.key as any)}
                className={`py-2 px-2 rounded-xl text-center text-xs font-medium border transition-all cursor-pointer ${
                  goal === item.key
                    ? 'bg-[#a8c7fa]/15 border-[#a8c7fa] text-[#c2e7ff] font-semibold'
                    : 'bg-[#111318] border-[#44474f]/40 text-[#c4c6d0] hover:bg-[#282a2f]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#c4c6d0]">
            Password
          </label>
          <div className="relative flex items-center rounded-2xl bg-[#111318] border border-[#44474f]/50 focus-within:border-[#a8c7fa] transition-all px-3.5 py-3">
            <Lock className="w-4 h-4 text-[#8e9099] mr-2.5 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              className="w-full bg-transparent text-sm text-white placeholder-[#8e9099] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[#8e9099] hover:text-white transition-colors cursor-pointer p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Strength Bar */}
          {password.length > 0 && (
            <div className="pt-1 space-y-1">
              <div className="flex gap-1.5 h-1">
                <div
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    strength >= 1 ? 'bg-[#f2b8b5]' : 'bg-[#44474f]/30'
                  }`}
                />
                <div
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    strength >= 2 ? 'bg-[#ffd8e4]' : 'bg-[#44474f]/30'
                  }`}
                />
                <div
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    strength >= 3 ? 'bg-[#a8c7fa]' : 'bg-[#44474f]/30'
                  }`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#8e9099]">
                <span>Password strength</span>
                <span className="font-semibold text-[#c4c6d0]">
                  {strength === 1 && 'Weak'}
                  {strength === 2 && 'Good'}
                  {strength === 3 && 'Strong'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#c4c6d0]">
            Confirm Password
          </label>
          <div className="relative flex items-center rounded-2xl bg-[#111318] border border-[#44474f]/50 focus-within:border-[#a8c7fa] transition-all px-3.5 py-3">
            <Lock className="w-4 h-4 text-[#8e9099] mr-2.5 shrink-0" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              className="w-full bg-transparent text-sm text-white placeholder-[#8e9099] focus:outline-none"
            />
            {passwordsMatch && (
              <Check className="w-4 h-4 text-[#a8c7fa] mr-2 shrink-0" />
            )}
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-[#8e9099] hover:text-white transition-colors cursor-pointer p-1 shrink-0"
              title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Terms Agreement */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#c4c6d0] leading-relaxed">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="rounded accent-[#a8c7fa] w-3.5 h-3.5 mt-0.5 cursor-pointer shrink-0"
            />
            <span>
              I agree to Rabbly's{' '}
              <a href="#" className="text-[#a8c7fa] hover:underline">Terms of Service</a> and{' '}
              <a href="#" className="text-[#a8c7fa] hover:underline">Privacy Policy</a>.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full m3-btn-filled py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#a8c7fa]/15 cursor-pointer disabled:opacity-50 transition-all mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating your account...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="text-center pt-2 border-t border-[#44474f]/30">
        <p className="text-xs text-[#c4c6d0]">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-bold text-[#a8c7fa] hover:text-[#d3e3fd] underline cursor-pointer ml-1"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
