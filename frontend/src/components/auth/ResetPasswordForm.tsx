import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, Loader2, ShieldCheck, ArrowLeft, MailCheck } from 'lucide-react';
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

  // Countdown timer for resend
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
      setResendMessage('A new reset link has been dispatched to your email.');
    } catch {
      setError('Failed to resend reset email. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasToken) {
      setError('No active recovery session found. Please click the reset link in your email to continue.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
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
      setError(err?.message || 'Failed to update password. Please ensure your recovery link is still valid.');
    }
  };

  if (isDone) {
    return (
      <div className="text-center space-y-6 animate-in zoom-in-95 duration-300 py-4">
        <div className="w-16 h-16 rounded-3xl bg-[#0842a0]/40 border border-[#a8c7fa]/50 text-[#a8c7fa] flex items-center justify-center mx-auto shadow-xl">
          <CheckCircle2 className="w-8 h-8 text-[#a8c7fa]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white font-['Outfit']">
            Password reset successful!
          </h2>
          <p className="text-xs text-[#c4c6d0] max-w-xs mx-auto leading-relaxed">
            Your password has been updated securely. You can now log into Rabbly with your new credentials.
          </p>
        </div>
        <button
          type="button"
          onClick={onSuccess}
          className="w-full m3-btn-filled py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#a8c7fa]/15 cursor-pointer"
        >
          <span>Proceed to Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[#0842a0]/30 border border-[#0842a0]/60 text-[#a8c7fa] flex items-center justify-center mx-auto shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white font-['Outfit'] tracking-tight">
            Reset your password
          </h2>
          <p className="text-xs text-[#c4c6d0] mt-1 leading-relaxed">
            {hasToken ? (
              <span>Recovery session verified. Set your new secure password below.</span>
            ) : (
              <span>
                We sent a reset link to{' '}
                <span className="font-semibold text-white font-mono">{email || 'your email'}</span>.
                Click the link in your email to continue.
              </span>
            )}
          </p>
        </div>
      </div>

      {resendMessage && (
        <div className="p-3 rounded-xl bg-[#0842a0]/20 border border-[#0842a0]/50 text-xs text-[#d3e3fd] text-center flex items-center justify-center gap-2">
          <MailCheck className="w-4 h-4 text-[#a8c7fa] shrink-0" />
          <span>{resendMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-[#93000a]/20 border border-[#93000a]/50 text-xs text-[#ffb4ab] text-center">
          {error}
        </div>
      )}

      {!hasToken && (
        <div className="p-4 rounded-2xl bg-[#111318] border border-[#44474f]/40 space-y-3">
          <p className="text-xs text-[#c4c6d0] leading-relaxed">
            To protect your account, Supabase sends a secure one-click recovery link. Please check your inbox and click the link to reach this reset page with your session activated.
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[#8e9099]">Didn't receive it?</span>
            <button
              type="button"
              disabled={!canResend || !email}
              onClick={handleResend}
              className={`text-xs font-semibold cursor-pointer ${
                canResend && email
                  ? 'text-[#a8c7fa] hover:underline'
                  : 'text-[#8e9099] cursor-not-allowed'
              }`}
            >
              {canResend ? 'Resend reset link' : `Resend in ${countdown}s`}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* New Password */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-bold uppercase tracking-wider text-[#c4c6d0]">
            New Password
          </label>
          <div className="relative flex items-center rounded-2xl bg-[#111318] border border-[#44474f]/50 focus-within:border-[#a8c7fa] transition-all px-3.5 py-3">
            <Lock className="w-4 h-4 text-[#8e9099] mr-2.5 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-bold uppercase tracking-wider text-[#c4c6d0]">
            Confirm New Password
          </label>
          <div className="relative flex items-center rounded-2xl bg-[#111318] border border-[#44474f]/50 focus-within:border-[#a8c7fa] transition-all px-3.5 py-3">
            <Lock className="w-4 h-4 text-[#8e9099] mr-2.5 shrink-0" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              className="w-full bg-transparent text-sm text-white placeholder-[#8e9099] focus:outline-none"
            />
            {confirmPassword.length > 0 && newPassword === confirmPassword && (
              <CheckCircle2 className="w-4 h-4 text-[#a8c7fa] mr-2 shrink-0" />
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

        {/* Action Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full m3-btn-filled py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#a8c7fa]/15 cursor-pointer disabled:opacity-50 transition-all mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Updating password...</span>
            </>
          ) : (
            <>
              <span>Save & Reset Password</span>
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
          <span>Cancel and return to sign in</span>
        </button>
      </div>
    </div>
  );
};
