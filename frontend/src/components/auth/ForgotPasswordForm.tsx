import React, { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { requestPasswordReset } from '../../services/authService';

interface ForgotPasswordFormProps {
  onSubmitEmail: (email: string) => void;
  onBackToLogin: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSubmitEmail,
  onBackToLogin,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await requestPasswordReset(email.trim());
      setIsLoading(false);
      onSubmitEmail(email.trim());
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Failed to request password reset. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Icon + Header */}
      <div className="space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#0842a0]/25 border border-[#a8c7fa]/20 flex items-center justify-center shadow-lg shadow-[#0842a0]/15">
          <KeyRound className="w-5 h-5 text-[#a8c7fa]" />
        </div>
        <div>
          <h2 className="text-[1.6rem] font-black text-white font-['Outfit'] tracking-tight leading-tight">
            Forgot password?
          </h2>
          <p className="text-sm text-[#8e9099] mt-1 leading-relaxed">
            Enter your email and we'll send you a secure reset link.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-[#93000a]/15 border border-[#93000a]/40 text-[13px] text-[#ffb4ab] leading-snug">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#c4c6d0] uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#44474f] group-focus-within:text-[#a8c7fa] transition-colors pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              autoFocus
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa]/70 focus:bg-[#0f1218] text-sm text-white placeholder-[#44474f] focus:outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl text-sm font-bold text-[#062e6f] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
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
              <span>Sending link...</span>
            </>
          ) : (
            <>
              <span>Send Reset Link</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Back to login */}
      <div className="pt-1 border-t border-[#44474f]/20">
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex items-center gap-2 text-[13px] text-[#8e9099] hover:text-[#c4c6d0] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to sign in
        </button>
      </div>
    </div>
  );
};
