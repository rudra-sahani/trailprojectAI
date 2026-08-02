import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserCheck, X, AlertTriangle, Building2, Mail, Phone, Briefcase, MapPin, Calendar, Shield, Save, Power } from 'lucide-react';
import { UserProfile, UpdateEmployeeRequest } from '../../shared/types/api-contracts.js';
import { UserRole } from '../../shared/types/common.js';

interface EmployeeEditDrawerProps {
  isOpen: boolean;
  employee: UserProfile | null;
  currentUserRole: UserRole;
  authToken: string;
  departments?: { id: string; name: string }[];
  managers?: UserProfile[];
  onClose: () => void;
  onSuccess: (updatedEmployee: UserProfile) => void;
}

export const EmployeeEditDrawer: React.FC<EmployeeEditDrawerProps> = ({
  isOpen,
  employee,
  currentUserRole,
  authToken,
  departments = [],
  managers = [],
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<UpdateEmployeeRequest>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name || '',
        email: employee.email || '',
        role: employee.role || 'EMPLOYEE',
        phone: employee.phone || '',
        job_title: employee.job_title || '',
        department_id: employee.department_id || '',
        team_id: employee.team_id || '',
        manager_id: employee.manager_id || '',
        employment_type: employee.employment_type || 'Full-time',
        joining_date: employee.joining_date ? String(employee.joining_date).split('T')[0] : '',
        location: employee.location || 'Remote',
        avatar_url: employee.avatar_url || '',
        is_active: employee.is_active
      });
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleChange = (field: keyof UpdateEmployeeRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/users/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update employee profile');
      }

      onSuccess(data.data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while updating profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEditRole = currentUserRole === 'OWNER' || currentUserRole === 'HR_ADMIN';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-6 md:p-8"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-950/80 border border-purple-800/80 flex items-center justify-center text-purple-300 font-bold">
                  {employee.avatar_url ? (
                    <img src={employee.avatar_url} alt={employee.full_name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    employee.full_name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Edit Profile</h2>
                  <p className="text-xs text-slate-400">{employee.full_name} ({employee.employee_code})</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-4">
              
              {/* Active / Deactive Toggle */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <Power className={`w-3.5 h-3.5 ${formData.is_active ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span>Account Status: {formData.is_active ? 'Active' : 'Deactivated'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Deactivating revokes active workspace login permissions.</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('is_active', !formData.is_active)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    formData.is_active
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {formData.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name || ''}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* Work Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* System Role */}
              {canEditRole && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    System Role
                  </label>
                  <select
                    value={formData.role || 'EMPLOYEE'}
                    onChange={(e) => handleChange('role', e.target.value as UserRole)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR_ADMIN">HR Admin</option>
                  </select>
                </div>
              )}

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
                    <option value="">-- None / Select --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.department_id || ''}
                    onChange={(e) => handleChange('department_id', e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                  />
                )}
              </div>

              {/* Manager */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Reporting Manager
                </label>
                <select
                  value={formData.manager_id || ''}
                  onChange={(e) => handleChange('manager_id', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                >
                  <option value="">-- Select Manager (Optional) --</option>
                  {managers.filter(m => m.id !== employee.id).map(m => (
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
                  Office Location
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* Avatar URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Avatar Image URL</label>
                <input
                  type="url"
                  value={formData.avatar_url || ''}
                  onChange={(e) => handleChange('avatar_url', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

            </form>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
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
              form="edit-employee-form"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-lg shadow-purple-950/50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving Changes...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Profile</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
