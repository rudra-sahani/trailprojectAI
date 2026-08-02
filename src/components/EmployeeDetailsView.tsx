import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, UserCheck, Mail, Phone, Briefcase, Building2, Users, Calendar,
  MapPin, Shield, Edit3, Archive, RotateCcw, FileText, CheckCircle2, Clock, Sparkles
} from 'lucide-react';
import { UserProfile } from '../../shared/types/api-contracts.js';
import { UserRole } from '../../shared/types/common.js';

interface EmployeeDetailsViewProps {
  employeeId: string;
  currentUser: UserProfile;
  authToken: string;
  onBack: () => void;
  onEdit: (employee: UserProfile) => void;
  onArchive: (employee: UserProfile, action: 'archive' | 'restore') => void;
}

export const EmployeeDetailsView: React.FC<EmployeeDetailsViewProps> = ({
  employeeId,
  currentUser,
  authToken,
  onBack,
  onEdit,
  onArchive
}) => {
  const [employee, setEmployee] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchEmployeeDetails = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/users/${employeeId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setEmployee(data.data);
      } else {
        throw new Error(data.error?.message || 'Employee profile not found');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load employee details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();
  }, [employeeId, authToken]);

  if (isLoading) {
    return (
      <div className="min-h-64 flex items-center justify-center p-12 text-slate-400 text-sm">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
          <span>Fetching Enterprise Employee Profile...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !employee) {
    return (
      <div className="p-8 space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employee Directory</span>
        </button>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2">
          <p className="text-sm font-semibold text-rose-400">{errorMsg || 'Employee profile unavailable'}</p>
        </div>
      </div>
    );
  }

  const isOwnerOrHr = currentUser.role === 'OWNER' || currentUser.role === 'HR_ADMIN';
  const isManager = currentUser.role === 'MANAGER' || isOwnerOrHr;
  const isArchived = Boolean(employee.is_archived);

  return (
    <div className="space-y-8">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-purple-400" />
          <span>Back to Employee Directory</span>
        </button>

        <div className="flex items-center gap-3">
          {isManager && (
            <button
              onClick={() => onEdit(employee)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-bold hover:bg-purple-600/30 transition-all shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          )}

          {isOwnerOrHr && (
            <button
              onClick={() => onArchive(employee, isArchived ? 'restore' : 'archive')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                isArchived
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-amber-950/80 border-amber-800 text-amber-300 hover:bg-amber-900'
              }`}
            >
              {isArchived ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Profile</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Employee</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-purple-950/30 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-6 z-10">
          <div className="w-20 h-20 rounded-3xl bg-slate-800 border-2 border-purple-500/40 flex items-center justify-center text-2xl font-black text-purple-300 shadow-lg shrink-0 overflow-hidden">
            {employee.avatar_url ? (
              <img src={employee.avatar_url} alt={employee.full_name} className="w-full h-full object-cover" />
            ) : (
              employee.full_name.slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{employee.full_name}</h1>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-slate-800 text-purple-300 border border-purple-800/50">
                {employee.employee_code}
              </span>
              {isArchived ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                  Archived
                </span>
              ) : employee.is_active ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Active
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Deactivated
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-400" />
              <span>{employee.job_title || 'Software Engineer'}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{employee.department_name || 'Engineering'}</span>
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                {employee.location || 'Remote'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Joined {employee.joining_date ? String(employee.joining_date).split('T')[0] : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 z-10 w-full md:w-auto">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Role</span>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-purple-950 border border-purple-800 text-purple-300 uppercase">
            {employee.role}
          </span>
          <span className="text-[11px] text-slate-400 mt-1">
            Employment: <strong className="text-slate-200">{employee.employment_type || 'Full-time'}</strong>
          </span>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Contact & Organizational Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-purple-400" />
              <span>Workplace Profile & Attributes</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  Work Email
                </div>
                <div className="text-xs font-bold text-slate-200 break-all">{employee.email}</div>
              </div>

              <div className="space-y-1 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  Phone
                </div>
                <div className="text-xs font-bold text-slate-200">{employee.phone || 'N/A'}</div>
              </div>

              <div className="space-y-1 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  Department
                </div>
                <div className="text-xs font-bold text-slate-200">{employee.department_name || 'Engineering'}</div>
              </div>

              <div className="space-y-1 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-pink-400" />
                  Team
                </div>
                <div className="text-xs font-bold text-slate-200">{employee.team_name || 'Core System Team'}</div>
              </div>

              <div className="space-y-1 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Reporting Manager
                </div>
                <div className="text-xs font-bold text-slate-200">{employee.manager_name || 'Marcus Vance (VP Tech)'}</div>
              </div>

              <div className="space-y-1 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  Organization
                </div>
                <div className="text-xs font-bold text-slate-200">{employee.organization_name || 'Acme Global AI'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Review & Performance Column */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Current Review Cycle</span>
            </h2>

            {employee.current_review_cycle ? (
              <div className="bg-purple-950/40 border border-purple-800/60 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-200">{employee.current_review_cycle.review_period}</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-900 text-purple-300 border border-purple-700">
                    {employee.current_review_cycle.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Active 360° review cycle in progress with bias detection guardrails enabled.
                </p>
              </div>
            ) : (
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-400">No active cycle in progress.</p>
                <p className="text-[11px] text-slate-500">Reviews are scheduled by HR Administration.</p>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Review History</span>
            </h2>

            {employee.review_history && employee.review_history.length > 0 ? (
              <div className="space-y-2.5">
                {employee.review_history.map(item => (
                  <div key={item.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{item.review_period}</div>
                      <div className="text-[10px] text-slate-500">Finalized: {item.finalized_at ? item.finalized_at.split('T')[0] : 'In Progress'}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-center text-xs text-slate-500">
                No past review cycles recorded for this employee.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
