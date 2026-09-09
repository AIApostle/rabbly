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
    setError('Google OAuth is not configured on this Supabase project yet. Please sign in with email and password.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-1.5">
        <h2 className="text-2xl font-extrabold text-white font-['Outfit'] tracking-tight">
          Welcome back
        </h2>
        <p className="text-xs text-[#c4c6d0]">
          Sign in to access your personal lessons and study groups
        </p>
      </div>

      {/* Google SSO Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
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
        <span>Continue with Google</span>
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

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
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
              placeholder="you@university.edu"
              required
              className="w-full bg-transparent text-sm text-white placeholder-[#8e9099] focus:outline-none"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#c4c6d0]">
              Password
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-[#a8c7fa] hover:text-[#d3e3fd] hover:underline cursor-pointer transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative flex items-center rounded-2xl bg-[#111318] border border-[#44474f]/50 focus-within:border-[#a8c7fa] transition-all px-3.5 py-3">
            <Lock className="w-4 h-4 text-[#8e9099] mr-2.5 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
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
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#c4c6d0]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded accent-[#a8c7fa] w-3.5 h-3.5 cursor-pointer"
            />
            <span>Keep me signed in</span>
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

      {/* Switch to Signup */}
      <div className="text-center pt-2 border-t border-[#44474f]/30">
        <p className="text-xs text-[#c4c6d0]">
          Don't have an account yet?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-bold text-[#a8c7fa] hover:text-[#d3e3fd] underline cursor-pointer ml-1"
          >
            Create account
          </button>
        </p>
      </div>
    </div>
  );
};
