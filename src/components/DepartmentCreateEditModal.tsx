import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, X, User, Check, AlertCircle, Sparkles } from 'lucide-react';
import { DepartmentRecord, UserProfile } from '../../shared/types/api-contracts.js';

interface DepartmentCreateEditModalProps {
  isOpen: boolean;
  department: DepartmentRecord | null;
  employees: UserProfile[];
  authToken: string;
  onClose: () => void;
  onSuccess: (savedDepartment: DepartmentRecord) => void;
}

export const DepartmentCreateEditModal: React.FC<DepartmentCreateEditModalProps> = ({
  isOpen,
  department,
  employees,
  authToken,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [headId, setHeadId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (department) {
      setName(department.name || '');
      setDescription(department.description || '');
      setHeadId(department.head_id || '');
    } else {
      setName('');
      setDescription('');
      setHeadId('');
    }
    setErrorMsg(null);
  }, [department, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Department name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const url = department ? `/api/v1/departments/${department.id}` : '/api/v1/departments';
      const method = department ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          head_id: headId || null
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        onSuccess(data.data);
        onClose();
      } else {
        setErrorMsg(data.error?.message || 'Failed to save department');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {department ? 'Edit Department' : 'Create New Department'}
                </h2>
                <p className="text-xs text-slate-400">
                  {department ? 'Update department details and head assignment' : 'Add a new functional unit to your organization'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                Department Name <span className="text-purple-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Engineering, Product Management, Human Resources"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of department responsibilities and mission..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>Department Head</span>
              </label>
              <select
                value={headId}
                onChange={(e) => setHeadId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              >
                <option value="">Unassigned (Select Department Head)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.job_title || emp.role}) - {emp.email}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                The Department Head will have supervisory oversight over all teams within this department.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/50 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{department ? 'Update Department' : 'Create Department'}</span>
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
