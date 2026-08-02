import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Award, Building2, Layers, AlignLeft, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DesignationRecord, DepartmentRecord } from '../../shared/types/api-contracts.js';

interface DesignationCreateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  authToken: string;
  designationToEdit?: DesignationRecord | null;
  departments: DepartmentRecord[];
}

const JOB_FAMILIES = [
  'Engineering',
  'Product Management',
  'Design & UX',
  'Operations',
  'Sales & Business Development',
  'Marketing',
  'Human Resources & Talent',
  'Finance & Legal',
  'Executive & Leadership',
  'Customer Success & Support'
];

export const DesignationCreateEditModal: React.FC<DesignationCreateEditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  authToken,
  designationToEdit,
  departments
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [seniorityLevel, setSeniorityLevel] = useState<number>(3);
  const [jobFamily, setJobFamily] = useState<string>('Engineering');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (designationToEdit) {
      setTitle(designationToEdit.title || '');
      setDescription(designationToEdit.description || '');
      setDepartmentId(designationToEdit.department_id || '');
      setSeniorityLevel(designationToEdit.seniority_level || 3);
      setJobFamily(designationToEdit.job_family || 'Engineering');
    } else {
      setTitle('');
      setDescription('');
      setDepartmentId('');
      setSeniorityLevel(3);
      setJobFamily('Engineering');
    }
    setErrorMsg(null);
  }, [designationToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Designation title is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const isEdit = !!designationToEdit;
      const url = isEdit ? `/api/v1/designations/${designationToEdit.id}` : '/api/v1/designations';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          department_id: departmentId || null,
          seniority_level: Number(seniorityLevel),
          job_family: jobFamily
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save designation');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving designation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeniorityBadgeLabel = (level: number) => {
    if (level <= 2) return `Level ${level} - Junior / Entry Level`;
    if (level <= 4) return `Level ${level} - Mid / Senior Individual Contributor`;
    if (level <= 6) return `Level ${level} - Lead / Staff / Manager`;
    if (level <= 8) return `Level ${level} - Principal / Director`;
    return `Level ${level} - VP / C-Suite / Executive`;
  };

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
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  {designationToEdit ? 'Edit Designation' : 'Create Designation'}
                </h2>
                <p className="text-xs text-slate-400">
                  Define title, seniority band, job family, and department alignment.
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

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Designation Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Senior Software Engineer, Director of Product"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
            </div>

            {/* Job Family & Seniority Level in Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Job Family</span>
                </label>
                <select
                  value={jobFamily}
                  onChange={(e) => setJobFamily(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                >
                  {JOB_FAMILIES.map((family) => (
                    <option key={family} value={family}>
                      {family}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Seniority Level (1 - 10)</span>
                  <span className="text-purple-400 font-bold text-xs">L{seniorityLevel}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={seniorityLevel}
                  onChange={(e) => setSeniorityLevel(Number(e.target.value))}
                  className="w-full accent-purple-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                />
                <span className="block text-[11px] text-purple-300/80 mt-1">
                  {getSeniorityBadgeLabel(seniorityLevel)}
                </span>
              </div>
            </div>

            {/* Department Alignment */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Associated Department (Optional)</span>
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">-- All Departments / Cross-Functional --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Link to a specific department or leave cross-functional across the organization.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
                <span>Description / Scope</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Key responsibilities, expectations, or scope for this role level..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

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
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{designationToEdit ? 'Update Designation' : 'Create Designation'}</span>
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
