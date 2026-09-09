import React, { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, Loader2, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { resetPassword } from '../../services/authService';

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
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleanVal = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanVal ? cleanVal[cleanVal.length - 1] : '';
    setOtp(newOtp);

    // Auto-advance
    if (cleanVal && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const focusIdx = Math.min(pasted.length, 5);
    digitRefs.current[focusIdx]?.focus();
  };

  const handleResend = () => {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(45);
    setOtp(['', '', '', '', '', '']);
    digitRefs.current[0]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
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
      setError(err?.message || 'Failed to update password. Please try again.');
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
            We sent a 6-digit code to{' '}
            <span className="font-semibold text-white font-mono">{email || 'your email'}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-[#93000a]/20 border border-[#93000a]/50 text-xs text-[#ffb4ab] text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 6-Digit OTP Box */}
        <div className="space-y-2 text-left">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#c4c6d0]">
              6-Digit Verification Code
            </label>
            <button
              type="button"
              disabled={!canResend}
              onClick={handleResend}
              className={`text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                canResend
                  ? 'text-[#a8c7fa] hover:underline'
                  : 'text-[#8e9099] cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              <span>{canResend ? 'Resend code' : `Resend in ${countdown}s`}</span>
            </button>
          </div>

          <div className="flex justify-between gap-2 on-paste" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { digitRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-13 text-center text-lg font-bold font-mono rounded-2xl bg-[#111318] border border-[#44474f]/60 text-white focus:border-[#a8c7fa] focus:outline-none transition-all shadow-inner"
              />
            ))}
          </div>
        </div>

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
