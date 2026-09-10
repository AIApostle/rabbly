import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  MailCheck,
} from 'lucide-react';
import { resetPassword, getAuthToken, requestPasswordReset } from '../../services/authService';

interface ResetPasswordFormProps {
  email: string;
  onSuccess: () => void;
  onBackToLogin: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  email,
  onSuccess,
  onBackToLogin,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasToken = !!getAuthToken();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (!canResend || !email) return;
    setCanResend(false);
    setCountdown(60);
    try {
      await requestPasswordReset(email);
      setResendMessage('A new reset link has been sent to your email.');
    } catch {
      setError('Failed to resend. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasToken) {
      setError(
        'No active recovery session. Please click the reset link in your email to continue.',
      );
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await resetPassword(newPassword);
      setIsLoading(false);
      setIsDone(true);
    } catch (err: any) {
      setIsLoading(false);
      setError(
        err?.message || 'Failed to update password. Please ensure your recovery link is still valid.',
      );
    }
  };

  // ── Success screen ──
  if (isDone) {
    return (
      <div className="space-y-5 text-center py-2">
        <div className="w-16 h-16 rounded-2xl bg-[#0842a0]/30 border border-[#a8c7fa]/30 flex items-center justify-center mx-auto shadow-lg shadow-[#0842a0]/20">
          <CheckCircle2 className="w-8 h-8 text-[#a8c7fa]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white font-['Outfit']">
            Password updated!
          </h2>
          <p className="text-sm text-[#8e9099] max-w-xs mx-auto leading-relaxed">
            Your password has been updated securely. You can now sign in with your new credentials.
          </p>
        </div>
        <button
          type="button"
          onClick={onSuccess}
          className="w-full h-11 rounded-xl text-sm font-bold text-[#062e6f] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #a8c7fa 0%, #c2e7ff 100%)',
            boxShadow: '0 4px 16px rgba(168,199,250,0.25)',
          }}
        >
          <span>Proceed to Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Icon + Header */}
      <div className="space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#0842a0]/25 border border-[#a8c7fa]/20 flex items-center justify-center shadow-lg shadow-[#0842a0]/15">
          <ShieldCheck className="w-5 h-5 text-[#a8c7fa]" />
        </div>
        <div>
          <h2 className="text-[1.6rem] font-black text-white font-['Outfit'] tracking-tight leading-tight">
            Reset password
          </h2>
          <p className="text-sm text-[#8e9099] mt-1 leading-relaxed">
            {hasToken ? (
              'Recovery session verified. Set your new password below.'
            ) : (
              <>
                We sent a link to{' '}
                <span className="font-semibold text-white font-mono">{email || 'your email'}</span>
                . Click it to continue.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Resend success message */}
      {resendMessage && (
        <div className="p-3 rounded-xl bg-[#0842a0]/15 border border-[#0842a0]/40 text-[13px] text-[#d3e3fd] flex items-center gap-2">
          <MailCheck className="w-4 h-4 text-[#a8c7fa] shrink-0" />
          {resendMessage}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-[#93000a]/15 border border-[#93000a]/40 text-[13px] text-[#ffb4ab] leading-snug">
          {error}
        </div>
      )}

      {/* Waiting for link panel */}
      {!hasToken && (
        <div className="p-4 rounded-2xl bg-[#111318] border border-[#44474f]/30 space-y-3">
          <p className="text-[13px] text-[#8e9099] leading-relaxed">
            For your security, we send a one-click recovery link. Please check your inbox and click
            it to activate your reset session.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#44474f]">Didn't receive it?</span>
            <button
              type="button"
              disabled={!canResend || !email}
              onClick={handleResend}
              className={`text-xs font-semibold cursor-pointer transition-colors ${
                canResend && email
                  ? 'text-[#a8c7fa] hover:text-[#c2e7ff]'
                  : 'text-[#44474f] cursor-not-allowed'
              }`}
            >
              {canResend ? 'Resend reset link' : `Resend in ${countdown}s`}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#c4c6d0] uppercase tracking-wider">
            New Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#44474f] group-focus-within:text-[#a8c7fa] transition-colors pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#c4c6d0] uppercase tracking-wider">
            Confirm New Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#44474f] group-focus-within:text-[#a8c7fa] transition-colors pointer-events-none" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              className="w-full h-11 pl-10 pr-20 rounded-xl bg-[#111318] border border-[#44474f]/50 focus:border-[#a8c7fa]/70 focus:bg-[#0f1218] text-sm text-white placeholder-[#44474f] focus:outline-none transition-all shadow-inner"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {confirmPassword.length > 0 && newPassword === confirmPassword && (
                <CheckCircle2 className="w-4 h-4 text-[#a8c7fa] shrink-0" />
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
              <span>Updating password...</span>
            </>
          ) : (
            <>
              <span>Save New Password</span>
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
          Cancel and return to sign in
        </button>
      </div>
    </div>
  );
};
