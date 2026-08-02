import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Copy, Check, RefreshCw, X, Mail, ShieldCheck, UserCheck, Clock } from 'lucide-react';
import { UserProfile, InvitationRecord } from '../../shared/types/api-contracts.js';
import { UserRole } from '../../shared/types/common.js';

interface InvitationManagementModalProps {
  currentUser: UserProfile;
  authToken: string;
  onClose: () => void;
}

export const InvitationManagementModal: React.FC<InvitationManagementModalProps> = ({
  currentUser,
  authToken,
  onClose
}) => {
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  const fetchInvitationsAndDepts = async () => {
    setIsLoading(true);
    try {
      const [invRes, deptRes] = await Promise.all([
        fetch('/api/v1/organization/invitations', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/v1/organization/me', { headers: { Authorization: `Bearer ${authToken}` } })
      ]);

      const invData = await invRes.json();
      const deptData = await deptRes.json();

      if (invData.success) setInvitations(invData.data);
      if (deptData.success && deptData.data) {
        setDepartments(deptData.data.departments || []);
      }
    } catch (err: any) {
      console.error('Error loading invitations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitationsAndDepts();
  }, [authToken]);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/v1/organization/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          email: email.trim(),
          role,
          department_id: selectedDeptId || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Invitation successfully sent to ${email}`);
        setEmail('');
        fetchInvitationsAndDepts();
      } else {
        setErrorMsg(data.error?.message || 'Failed to send invitation');
      }
    } catch (err: any) {
      setErrorMsg('Network error sending invitation');
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async (invId: string) => {
    try {
      const res = await fetch(`/api/v1/organization/invitations/${invId}/resend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Invitation extended and resent');
        fetchInvitationsAndDepts();
      }
    } catch (err) {
      console.error('Resend error:', err);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Enterprise Invitation System</h2>
            <p className="text-xs text-slate-400">Invite HR Admins, Managers, and Employees with secure tokens.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-xl">
            {successMsg}
          </div>
        )}

        {/* Invite Form */}
        <form onSubmit={handleSendInvitation} className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Send New Invitation</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1 md:col-span-1">
              <label className="text-[11px] font-semibold text-slate-300">Target Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Assigned Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-purple-500 focus:outline-none"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="HR_ADMIN">HR Admin</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Department</label>
              <select
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-purple-500 focus:outline-none"
              >
                <option value="">(None / General)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/30 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending...' : 'Send Invitation'}</span>
            </button>
          </div>
        </form>

        {/* Pending & Past Invitations List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Organization Invitations ({invitations.length})
          </h3>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading invitations...</div>
          ) : invitations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
              No invitations sent yet. Use the form above to invite team members.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {invitations.map(inv => (
                <div key={inv.id} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-white">{inv.email}</strong>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                        {inv.role}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.status === 'PENDING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        inv.status === 'ACCEPTED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        'bg-red-950 text-red-300 border border-red-800'
                      }`}>
                        {inv.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>Code: <strong className="text-slate-200">{inv.invitation_code}</strong></span>
                      <span>Expires: {new Date(inv.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyCode(inv.invitation_code, inv.id)}
                      className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs flex items-center gap-1"
                      title="Copy Code"
                    >
                      {copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {inv.status === 'PENDING' && (
                      <button
                        onClick={() => handleResend(inv.id)}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 text-purple-300 rounded-lg text-xs flex items-center gap-1"
                        title="Resend Invitation"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
