import React, { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, Loader2, KeyRound } from 'lucide-react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onSubmitEmail(email.trim());
    }, 900);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Icon & Title */}
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#0842a0]/30 border border-[#0842a0]/60 text-[#a8c7fa] flex items-center justify-center mx-auto shadow-sm">
          <KeyRound className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white font-['Outfit'] tracking-tight">
            Forgot password?
          </h2>
          <p className="text-xs text-[#c4c6d0] mt-1.5 leading-relaxed max-w-xs mx-auto">
            No worries! Enter your registered email address and we’ll send you a 6-digit reset code.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-[#93000a]/20 border border-[#93000a]/50 text-xs text-[#ffb4ab] text-center">
          {error}
        </div>
      )}

      {/* Email Input Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-bold uppercase tracking-wider text-[#c4c6d0]">
            Your Email Address
          </label>
          <div className="relative flex items-center rounded-2xl bg-[#111318] border border-[#44474f]/50 focus-within:border-[#a8c7fa] transition-all px-3.5 py-3">
            <Mail className="w-4 h-4 text-[#8e9099] mr-2.5 shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              autoFocus
              className="w-full bg-transparent text-sm text-white placeholder-[#8e9099] focus:outline-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full m3-btn-filled py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#a8c7fa]/15 cursor-pointer disabled:opacity-50 transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending code...</span>
            </>
          ) : (
            <>
              <span>Send Reset Code</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Return to Login */}
      <div className="text-center pt-2 border-t border-[#44474f]/30">
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 text-xs text-[#c4c6d0] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </button>
      </div>
    </div>
  );
};
