import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, ShieldCheck, ArrowRight, Loader2, LogIn, UserPlus, Check, KeyRound, RotateCw, AlertCircle } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, verifyEmailOtp, resendVerificationEmail } from '../../services/supabaseAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email verification state
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendNotice(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          throw new Error('Please enter your display name');
        }
        const signupRes = await signUpWithEmail(email, password, displayName);
        if (signupRes?.needsEmailConfirmation) {
          setIsAwaitingConfirmation(true);
          setResendCooldown(60);
          return;
        }
      } else {
        await signInWithEmail(email, password);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = err.message || 'Authentication failed. Please try again.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || message.includes('Invalid email or password') || message.includes('invalid_grant')) {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use' || message.includes('already registered')) {
        message = 'An account with this email already exists.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/user-not-found' || message.includes('User not found')) {
        message = 'No account found with this email.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the verification code.');
      return;
    }
    setError(null);
    setVerifyingOtp(true);
    try {
      await verifyEmailOtp(email.trim(), otpCode.trim(), 'signup');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email.trim()) return;
    setError(null);
    setResendNotice(null);
    try {
      const res = await resendVerificationEmail(email.trim());
      if (res.success) {
        setResendNotice('Verification email resent! Check your inbox.');
        setResendCooldown(60);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend email.');
    }
  };

  const handleCheckConfirmed = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Email not yet verified. Please click the link in your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14] backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-[#1C232E] bg-[#12161D] p-6 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-[#1A1F27] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              {mode === 'signin' ? 'Sign In to TradeForge' : 'Create TradeForge Account'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {mode === 'signin'
              ? 'Access your cloud-synced trading journal and isolated database'
              : 'Start your trading journey with strictly isolated user storage'}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signin'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <span className="font-bold shrink-0">Note:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {resendNotice && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{resendNotice}</span>
          </div>
        )}

        {isAwaitingConfirmation ? (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center space-y-2">
              <Mail className="w-8 h-8 text-blue-400 mx-auto animate-pulse" />
              <h3 className="font-semibold text-slate-100 text-sm">Verify Your Email</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                We sent a confirmation link to <strong className="text-slate-200 font-mono">{email}</strong>. Click the link in your email to activate your account.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-slate-300 font-medium">Or enter 6-digit confirmation code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.trim())}
                    placeholder="e.g. 123456"
                    maxLength={12}
                    className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl pl-9 pr-3 py-2 text-slate-100 font-mono tracking-widest placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={verifyingOtp || !otpCode.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Verify Code</span>
              </button>
            </form>

            <div className="pt-2 border-t border-[#1C232E] space-y-2">
              <button
                type="button"
                onClick={handleCheckConfirmed}
                disabled={loading}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
                <span>I've Clicked the Verification Link</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-blue-400 hover:text-blue-300 transition disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAwaitingConfirmation(false);
                    setMode('signin');
                    setError(null);
                  }}
                  className="text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="block text-slate-300 font-medium">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex River"
                    className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-slate-300 font-medium">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@example.com"
                  className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          Your data is encrypted and strictly isolated in your PostgreSQL database instance.
        </p>
      </div>
    </div>
  );
};
