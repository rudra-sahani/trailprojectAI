import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, X, AlertTriangle, Building2, UserCheck, Mail, Phone, Briefcase, MapPin, Calendar, Shield } from 'lucide-react';
import { UserProfile, CreateEmployeeRequest } from '../../shared/types/api-contracts.js';
import { UserRole } from '../../shared/types/common.js';

interface EmployeeCreateModalProps {
  isOpen: boolean;
  authToken: string;
  departments?: { id: string; name: string }[];
  managers?: UserProfile[];
  onClose: () => void;
  onSuccess: (newEmployee: UserProfile) => void;
}

export const EmployeeCreateModal: React.FC<EmployeeCreateModalProps> = ({
  isOpen,
  authToken,
  departments = [],
  managers = [],
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<CreateEmployeeRequest>({
    full_name: '',
    email: '',
    role: 'EMPLOYEE',
    phone: '',
    job_title: 'Software Engineer',
    department_id: '',
    team_id: '',
    manager_id: '',
    employment_type: 'Full-time',
    joining_date: new Date().toISOString().split('T')[0],
    location: 'Remote',
    avatar_url: ''
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (field: keyof CreateEmployeeRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    if (!formData.full_name.trim()) {
      setErrorMsg('Full name is required.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ...formData,
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase()
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to create employee profile');
      }

      onSuccess(data.data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while creating employee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 relative my-8"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-xl hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-950/80 border border-purple-800/80 text-purple-400">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Onboard New Employee</h2>
              <p className="text-xs text-slate-400">Create an enterprise employee record in the organization database.</p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs rounded-xl flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  Work Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="elena@company.com"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  System Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value as UserRole)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="HR_ADMIN">HR Admin</option>
                </select>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* Job Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-pink-400" />
                  Job Title
                </label>
                <input
                  type="text"
                  value={formData.job_title || ''}
                  onChange={(e) => handleChange('job_title', e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  Department
                </label>
                {departments.length > 0 ? (
                  <select
                    value={formData.department_id || ''}
                    onChange={(e) => handleChange('department_id', e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.department_id || ''}
                    onChange={(e) => handleChange('department_id', e.target.value)}
                    placeholder="e.g. Engineering"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                  />
                )}
              </div>

              {/* Manager */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Direct Manager
                </label>
                <select
                  value={formData.manager_id || ''}
                  onChange={(e) => handleChange('manager_id', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                >
                  <option value="">-- Select Manager (Optional) --</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name} ({m.job_title || 'Manager'})</option>
                  ))}
                </select>
              </div>

              {/* Employment Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Employment Type</label>
                <select
                  value={formData.employment_type || 'Full-time'}
                  onChange={(e) => handleChange('employment_type', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>

              {/* Joining Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Joining Date
                </label>
                <input
                  type="date"
                  value={formData.joining_date || ''}
                  onChange={(e) => handleChange('joining_date', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  Location / Office
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="e.g. San Francisco HQ / Remote"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

            </div>

            {/* Avatar URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Avatar Image URL (Optional)</label>
              <input
                type="url"
                value={formData.avatar_url || ''}
                onChange={(e) => handleChange('avatar_url', e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-lg shadow-purple-950/50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Employee Record</span>
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
