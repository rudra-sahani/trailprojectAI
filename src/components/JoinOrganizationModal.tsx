import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, ShieldAlert, CheckCircle2, ArrowRight, X, Building2, Lock } from 'lucide-react';
import { UserProfile } from '../../shared/types/api-contracts.js';

interface JoinOrganizationModalProps {
  currentUser: UserProfile;
  authToken: string;
  onSuccess: (orgData: any, updatedUser: UserProfile) => void;
  onCancel: () => void;
}

export const JoinOrganizationModal: React.FC<JoinOrganizationModalProps> = ({
  currentUser,
  authToken,
  onSuccess,
  onCancel
}) => {
  const [codeOrToken, setCodeOrToken] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [validationInfo, setValidationInfo] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!codeOrToken.trim()) return;
    setIsValidating(true);
    setErrorMsg(null);
    setValidationInfo(null);

    try {
      const res = await fetch('/api/v1/organization/join/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeOrToken: codeOrToken.trim() })
      });

      const data = await res.json();
      if (data.success && data.data) {
        setValidationInfo(data.data);
      } else {
        setErrorMsg(data.error?.message || 'Invalid or expired invitation code or link');
      }
    } catch (err: any) {
      setErrorMsg('Failed to connect to verification server');
    } finally {
      setIsValidating(false);
    }
  };

  const handleJoin = async () => {
    if (!codeOrToken.trim()) return;
    setIsJoining(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/organization/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ codeOrToken: codeOrToken.trim() })
      });

      const data = await res.json();
      if (data.success && data.data) {
        onSuccess(data.data.organization, data.data.user);
      } else {
        setErrorMsg(data.error?.message || 'Failed to join organization');
      }
    } catch (err: any) {
      setErrorMsg('Network error while joining organization');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative"
      >
        <button
          onClick={onCancel}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Join Organization</h2>
            <p className="text-xs text-slate-400">Enter an invitation code, link, or company code.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Invitation Code / Token / Org Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={codeOrToken}
                onChange={e => {
                  setCodeOrToken(e.target.value);
                  setValidationInfo(null);
                  setErrorMsg(null);
                }}
                placeholder="e.g. INV-A1B2C3 or ORG-X9Y8Z7"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleValidate}
                disabled={isValidating || !codeOrToken.trim()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-indigo-300 text-xs font-bold rounded-xl border border-slate-700"
              >
                {isValidating ? 'Checking...' : 'Verify'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              You can paste the full invitation link or the 6-character code.
            </p>
          </div>

          {/* Validation Info Box */}
          {validationInfo && (
            <div className="p-4 bg-indigo-950/40 border border-indigo-800/80 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                <span>Valid Invitation Found!</span>
              </div>

              <div className="space-y-1 text-slate-300">
                <div>
                  <span className="text-slate-400">Organization:</span>{' '}
                  <strong className="text-white">{validationInfo.organizationName}</strong>
                </div>
                {validationInfo.role && (
                  <div>
                    <span className="text-slate-400">Assigned Role:</span>{' '}
                    <span className="px-2 py-0.5 bg-indigo-900/80 border border-indigo-700 rounded text-indigo-200 font-bold uppercase text-[10px]">
                      {validationInfo.role}
                    </span>
                  </div>
                )}
                {validationInfo.email && (
                  <div>
                    <span className="text-slate-400">Invited Email:</span>{' '}
                    <span className="text-slate-200">{validationInfo.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
          >
            Cancel
          </button>

          <button
            onClick={handleJoin}
            disabled={isJoining || !codeOrToken.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
          >
            {isJoining ? 'Joining...' : 'Confirm & Join Organization'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
