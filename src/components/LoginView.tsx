import React, { useState } from 'react';
import { Brain, Shield, ArrowRight, ArrowLeft, Lock, KeyRound, Mail, CheckCircle2, AlertCircle, RefreshCw, UserPlus } from 'lucide-react';
import { UserRole } from '../../shared/types/common.js';
import { UserProfile } from '../../shared/types/api-contracts.js';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile, token: string) => void;
  onBackToLanding?: () => void;
}

type AuthMode = 'login' | 'signup' | 'verify' | 'forgot' | 'reset';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onBackToLanding }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Login fields
  const [email, setEmail] = useState('hr.admin@verireview.ai');
  const [password, setPassword] = useState('VeriReview2026!');
  
  // Signup fields
  const [fullName, setFullName] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('EMPLOYEE');
  
  // Verification / Reset fields
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Status & error messages
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Clear notices when switching mode
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setInfoMessage(null);
  };

  // 1. Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error?.code === 'ERR_EMAIL_NOT_VERIFIED') {
          setInfoMessage('Your email address requires verification. Please enter the verification code.');
          switchMode('verify');
        } else {
          setErrorMessage(data.error?.message || 'Login failed. Please check your credentials.');
        }
        setLoading(false);
        return;
      }

      // Save token to localStorage for persistent sessions
      if (data.data?.accessToken || data.data?.token) {
        const token = data.data.accessToken || data.data.token;
        localStorage.setItem('verireview_token', token);
        onLoginSuccess(data.data.user, token);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error connecting to auth service.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Signup Handler
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role: signupRole
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || 'Failed to create account.');
        setLoading(false);
        return;
      }

      setInfoMessage('Account created successfully! Please enter the 6-digit verification code.');
      switchMode('verify');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating account.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify Email Handler
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || 'Invalid or expired verification code.');
        setLoading(false);
        return;
      }

      if (data.data?.accessToken || data.data?.token) {
        const token = data.data.accessToken || data.data.token;
        localStorage.setItem('verireview_token', token);
        onLoginSuccess(data.data.user, token);
      } else {
        setInfoMessage('Email verified successfully! You can now log in.');
        switchMode('login');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error verifying email code.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Resend Verification Code Handler
  const handleResendCode = async () => {
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/v1/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || 'Failed to resend code.');
      } else {
        setInfoMessage('A new verification code has been dispatched to your email.');
      }
    } catch (err: any) {
      setErrorMessage('Error resending verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Forgot Password Handler
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || 'Failed to send password reset code.');
        setLoading(false);
        return;
      }

      setInfoMessage('Password reset code sent! Please check your email.');
      switchMode('reset');
    } catch (err: any) {
      setErrorMessage('Error requesting password reset.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Reset Password Handler
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: verificationCode,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || 'Failed to reset password.');
        setLoading(false);
        return;
      }

      setInfoMessage('Password reset successfully! Please sign in with your new password.');
      switchMode('login');
    } catch (err: any) {
      setErrorMessage('Error resetting password.');
    } finally {
      setLoading(false);
    }
  };

  // Demo Preset Quick Selector
  const handleSelectPreset = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('VeriReview2026!');
    setErrorMessage(null);
    setInfoMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#080C14] flex flex-col justify-center items-center p-4 text-slate-100">
      
      {onBackToLanding && (
        <button
          onClick={onBackToLanding}
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-[#51E2F5] transition-colors px-3.5 py-1.5 rounded-xl bg-[#0E1626] border border-[#A28089]/30 hover:border-[#51E2F5]/40 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </button>
      )}

      <div className="w-full max-w-md bg-[#0E1626] border border-[#A28089]/30 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#51E2F5]/10 border border-[#51E2F5]/30 flex items-center justify-center mx-auto shadow-lg text-[#51E2F5]">
            <Brain className="w-7 h-7 text-[#51E2F5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-display">VeriReview AI</h1>
          <p className="text-xs text-slate-400 font-medium">Enterprise Authentication & Performance Governance</p>
        </div>

        {/* Status Notices */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Mode 1: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#131F33] border border-[#A28089]/30 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#51E2F5] focus:ring-1 focus:ring-[#51E2F5] transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-[11px] font-semibold text-[#51E2F5] hover:text-[#9DF9EF] transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#131F33] border border-[#A28089]/30 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#51E2F5] focus:ring-1 focus:ring-[#51E2F5] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 px-4 font-bold flex items-center justify-center gap-2 text-xs"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#080C14]" />
              ) : (
                <>
                  <Shield className="w-4 h-4 text-[#080C14]" />
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Don't have an account? <span className="text-[#51E2F5] underline">Sign up</span>
              </button>
            </div>
          </form>
        )}

        {/* Mode 2: SIGNUP */}
        {mode === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="e.g. Eleanor Vance"
                className="w-full bg-[#131F33] border border-[#A28089]/30 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#51E2F5] focus:ring-1 focus:ring-[#51E2F5] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                className="w-full bg-[#131F33] border border-[#A28089]/30 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#51E2F5] focus:ring-1 focus:ring-[#51E2F5] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password (min 8 chars)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#131F33] border border-[#A28089]/30 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#51E2F5] focus:ring-1 focus:ring-[#51E2F5] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Organization Role
              </label>
              <select
                value={signupRole}
                onChange={(e) => setSignupRole(e.target.value as UserRole)}
                className="w-full bg-[#131F33] border border-[#A28089]/30 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#51E2F5] focus:ring-1 focus:ring-[#51E2F5] transition-colors"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="HR_ADMIN">HR Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 px-4 font-bold flex items-center justify-center gap-2 text-xs"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin text-[#080C14]" /> : <UserPlus className="w-4 h-4 text-[#080C14]" />}
              <span>Register & Send Code</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Already registered? <span className="text-[#51E2F5] underline">Sign in</span>
              </button>
            </div>
          </form>
        )}

        {/* Mode 3: VERIFY EMAIL */}
        {mode === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="text-xs text-slate-300 bg-[#131F33] p-3 rounded-xl border border-[#A28089]/30">
              Enter the 6-digit verification code sent to <strong className="text-[#51E2F5]">{email}</strong>.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                maxLength={6}
                placeholder="123456"
                className="w-full bg-[#131F33] border border-[#A28089]/30 rounded-xl px-3.5 py-2.5 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-[#51E2F5] focus:ring-1 focus:ring-[#51E2F5]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 px-4 font-bold text-xs flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin text-[#080C14]" /> : <CheckCircle2 className="w-4 h-4 text-[#080C14]" />}
              <span>Verify & Access Workspace</span>
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResendCode}
                className="text-xs font-semibold text-[#51E2F5] hover:text-[#9DF9EF]"
              >
                Resend Code
              </button>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs font-semibold text-slate-400 hover:text-white"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Mode 4: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Account Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#131F33] border border-[#A28089]/30 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#51E2F5]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 px-4 font-bold text-xs flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin text-[#080C14]" /> : <KeyRound className="w-4 h-4 text-[#080C14]" />}
              <span>Send Reset Code</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs font-semibold text-slate-400 hover:text-white"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Mode 5: RESET PASSWORD */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reset Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                maxLength={6}
                placeholder="123456"
                className="w-full bg-[#131F33] border border-[#A28089]/30 rounded-xl px-3.5 py-2.5 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-[#51E2F5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                New Password (min 8 chars)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#131F33] border border-[#A28089]/30 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#51E2F5]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 px-4 font-bold text-xs flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin text-[#080C14]" /> : <Lock className="w-4 h-4 text-[#080C14]" />}
              <span>Reset Password</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs font-semibold text-slate-400 hover:text-white"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Demo Preset Accounts Fast-Fill */}
        {mode === 'login' && (
          <div className="pt-4 border-t border-[#A28089]/20 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center font-mono">
              Verified Pre-Seeded Accounts
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('hr.admin@verireview.ai')}
                className="text-left p-2.5 rounded-xl bg-[#131F33] hover:bg-[#182842] border border-[#A28089]/30 hover:border-[#51E2F5]/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-100 group-hover:text-[#51E2F5] transition-colors font-display">Eleanor Vance</div>
                  <div className="text-[10px] text-slate-400 font-mono">hr.admin@verireview.ai</div>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#51E2F5] bg-[#51E2F5]/10 px-2 py-0.5 rounded border border-[#51E2F5]/30">
                  HR Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('marcus.manager@verireview.ai')}
                className="text-left p-2.5 rounded-xl bg-[#131F33] hover:bg-[#182842] border border-[#A28089]/30 hover:border-[#51E2F5]/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-100 group-hover:text-[#9DF9EF] transition-colors font-display">Marcus Brody</div>
                  <div className="text-[10px] text-slate-400 font-mono">marcus.manager@verireview.ai</div>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#9DF9EF] bg-[#9DF9EF]/10 px-2 py-0.5 rounded border border-[#9DF9EF]/30">
                  Manager
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('alex.employee@verireview.ai')}
                className="text-left p-2.5 rounded-xl bg-[#131F33] hover:bg-[#182842] border border-[#A28089]/30 hover:border-[#51E2F5]/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-100 group-hover:text-[#FFA8BE] transition-colors font-display">Alex Rivera</div>
                  <div className="text-[10px] text-slate-400 font-mono">alex.employee@verireview.ai</div>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#FFA8BE] bg-[#FFA8BE]/10 px-2 py-0.5 rounded border border-[#FFA8BE]/30">
                  Employee
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1 pt-2 font-mono">
          <Lock className="w-3 h-3 text-[#51E2F5]" />
          <span>Signed JWT Tokens • RLS & Audit Ledger</span>
        </div>

      </div>
    </div>
  );
};
