import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToSignup,
  onForgotPassword,
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await login({ email: email.trim(), password });
      setIsLoading(false);
      onSuccess();
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Invalid email or password. Please try again.');
    }
  };

  const handleGoogleSignIn = () => {
    setError(
      'Google sign-in is not yet available. Please sign in with your email and password.',
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-[1.6rem] font-black text-white font-['Outfit'] tracking-tight leading-tight">
          Welcome back
        </h2>
        <p className="text-sm text-[#8e9099]">
          Sign in to your Rabbly account
        </p>
      </div>

      {/* Google SSO Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
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
          Continue with Google
        </span>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#44474f]/30" />
        <span className="text-[11px] font-medium text-[#44474f] uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-[#44474f]/30" />
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 rounded-xl bg-[#93000a]/15 border border-[#93000a]/40 text-[13px] text-[#ffb4ab] leading-snug">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="you@university.edu"
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa]/70 focus:bg-[#0f1218] text-sm text-white placeholder-[#44474f] focus:outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#c4c6d0] uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[12px] text-[#a8c7fa] hover:text-[#c2e7ff] cursor-pointer transition-colors font-medium"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#44474f] group-focus-within:text-[#a8c7fa] transition-colors pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
        </div>

        {/* Remember me */}
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-4 h-4 rounded border transition-all ${
                rememberMe
                  ? 'bg-[#a8c7fa] border-[#a8c7fa]'
                  : 'bg-transparent border-[#44474f]/60 group-hover:border-[#8e9099]'
              }`}
            >
              {rememberMe && (
                <svg className="w-3 h-3 text-[#062e6f] absolute top-0.5 left-0.5" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-[13px] text-[#8e9099] group-hover:text-[#c4c6d0] transition-colors">
            Keep me signed in
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
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to signup */}
      <p className="text-center text-[13px] text-[#8e9099]">
        New to Rabbly?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-semibold text-[#a8c7fa] hover:text-[#c2e7ff] cursor-pointer transition-colors"
        >
          Create account
        </button>
      </p>
    </div>
  );
};
