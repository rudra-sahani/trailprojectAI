import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserCheck, Search, AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, Building2 } from 'lucide-react';
import { UserProfile } from '../../shared/types/api-contracts.js';

interface AssignManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  authToken: string;
  targetUser: UserProfile | null;
  allEmployees: UserProfile[];
}

export const AssignManagerModal: React.FC<AssignManagerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  authToken,
  targetUser,
  allEmployees
}) => {
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (targetUser) {
      setSelectedManagerId(targetUser.manager_id || '');
    }
    setErrorMsg(null);
  }, [targetUser, isOpen]);

  if (!isOpen || !targetUser) return null;

  // Filter possible managers (excluding target user themselves to prevent immediate self-assignment)
  const candidateManagers = allEmployees.filter(emp => {
    if (emp.id === targetUser.id) return false;
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.job_title && emp.job_title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const newManagerId = selectedManagerId || null;

      const res = await fetch(`/api/v1/users/${targetUser.id}/manager`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ manager_id: newManagerId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update reporting manager');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating manager');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedManager = allEmployees.find(e => e.id === selectedManagerId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Assign Reporting Manager
                </h2>
                <p className="text-xs text-slate-400">
                  Select direct supervisor for <span className="text-purple-300 font-semibold">{targetUser.full_name}</span>.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Target employee summary card */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-950 text-purple-300 border border-purple-800 flex items-center justify-center font-bold text-sm shrink-0">
                {targetUser.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-200 block truncate">{targetUser.full_name}</span>
                <span className="text-[11px] text-slate-400 block truncate">
                  {targetUser.designation_title || targetUser.job_title} • {targetUser.department_name || 'General'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase block">Current Manager</span>
                <span className="text-xs text-slate-300 font-medium">
                  {targetUser.manager_name || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Search candidate manager */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select New Reporting Manager
              </label>
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search manager by name or email..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Unassign option */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setSelectedManagerId('')}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                    selectedManagerId === ''
                      ? 'bg-purple-950/40 border-purple-500/50 text-purple-300'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="italic font-medium">No Manager / Root Executive</span>
                  {selectedManagerId === '' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                </button>

                {candidateManagers.map((emp) => {
                  const isSelected = selectedManagerId === emp.id;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedManagerId(emp.id)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? 'bg-purple-950/50 border-purple-500/60 text-slate-100'
                          : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {emp.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold block truncate">{emp.full_name}</span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {emp.designation_title || emp.job_title} ({emp.department_name || 'General'})
                          </span>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected preview summary */}
            {selectedManager && (
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 text-xs text-purple-200 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  <strong className="text-white">{targetUser.full_name}</strong> will now report directly to{' '}
                  <strong className="text-purple-300">{selectedManager.full_name}</strong>.
                </span>
              </div>
            )}

            {/* Footer buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Validating Hierarchy...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Manager Assignment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
