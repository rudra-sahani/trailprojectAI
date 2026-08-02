import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users, UserPlus, Eye, Edit3, Archive, RotateCcw, Briefcase, Mail, Phone,
  Building2, MapPin, Sparkles, AlertTriangle, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { UserProfile } from '../../shared/types/api-contracts.js';
import { UserRole } from '../../shared/types/common.js';
import { EmployeeCreateModal } from './EmployeeCreateModal.tsx';
import { EmployeeEditDrawer } from './EmployeeEditDrawer.tsx';
import { ArchiveConfirmModal } from './ArchiveConfirmModal.tsx';
import { EmployeeDetailsView } from './EmployeeDetailsView.tsx';

interface EmployeeDirectoryViewProps {
  currentUser: UserProfile;
  authToken: string;
}

export const EmployeeDirectoryView: React.FC<EmployeeDirectoryViewProps> = ({
  currentUser,
  authToken
}) => {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null);
  const [archivingEmployee, setArchivingEmployee] = useState<{ employee: UserProfile; action: 'archive' | 'restore' } | null>(null);

  const isOwnerOrHr = currentUser.role === 'OWNER' || currentUser.role === 'HR_ADMIN';
  const isManager = currentUser.role === 'MANAGER' || isOwnerOrHr;

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const includeArchived = viewTab === 'archived';
      const res = await fetch(`/api/v1/users?includeArchived=${includeArchived}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEmployees(data.data);
      }
    } catch (err) {
      console.error('Error fetching employee directory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [viewTab, authToken]);

  if (selectedEmployeeId) {
    return (
      <EmployeeDetailsView
        employeeId={selectedEmployeeId}
        currentUser={currentUser}
        authToken={authToken}
        onBack={() => setSelectedEmployeeId(null)}
        onEdit={(emp) => setEditingEmployee(emp)}
        onArchive={(emp, action) => setArchivingEmployee({ employee: emp, action })}
      />
    );
  }

  const activeCount = employees.filter(e => !e.is_archived).length;
  const archivedCount = employees.filter(e => e.is_archived).length;

  return (
    <div className="space-y-8">
      
      {/* Top Banner & Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-purple-950/30 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800/80 text-purple-300 text-xs font-semibold">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Enterprise Workforce Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Employee Directory</h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Manage organization members, reporting assignments, contact details, and review cycle status.
          </p>
        </div>

        {isOwnerOrHr && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-950/50 flex items-center gap-2 shrink-0 z-10"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard Employee</span>
          </button>
        )}
      </div>

      {/* Directory Tab Controls */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setViewTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewTab === 'active'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Active Workforce</span>
          </button>

          {isOwnerOrHr && (
            <button
              onClick={() => setViewTab('archived')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                viewTab === 'archived'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archived Profiles</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 font-semibold">
          Showing <span className="text-purple-300 font-bold">{employees.length}</span> {viewTab} records
        </div>
      </div>

      {/* Employee List Grid */}
      {isLoading ? (
        <div className="min-h-64 flex items-center justify-center p-12 text-slate-400 text-sm">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
            <span>Loading Employee Directory...</span>
          </div>
        </div>
      ) : employees.length === 0 ? (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
          <Users className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No {viewTab} employees found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {viewTab === 'active' ? 'Click Onboard Employee above to create a new team member record.' : 'No archived employee profiles exist in the system.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map(emp => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-xl group relative overflow-hidden"
            >
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-purple-300 overflow-hidden shrink-0">
                      {emp.avatar_url ? (
                        <img src={emp.avatar_url} alt={emp.full_name} className="w-full h-full object-cover" />
                      ) : (
                        emp.full_name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                        {emp.full_name}
                      </h3>
                      <p className="text-[11px] font-mono text-purple-400/90">{emp.employee_code}</p>
                    </div>
                  </div>

                  {emp.is_archived ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 shrink-0">
                      Archived
                    </span>
                  ) : emp.is_active ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                      Inactive
                    </span>
                  )}
                </div>

                {/* Info Fields */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Briefcase className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="font-semibold line-clamp-1">{emp.job_title || 'Software Engineer'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="line-clamp-1">{emp.department_name || 'Engineering'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="line-clamp-1 text-[11px]">{emp.email}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{emp.location || 'Remote'} ({emp.employment_type || 'Full-time'})</span>
                  </div>
                </div>
              </div>

              {/* Card Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs">
                <button
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-800/80 text-purple-300 font-bold transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>

                <div className="flex items-center gap-1">
                  {isManager && (
                    <button
                      onClick={() => setEditingEmployee(emp)}
                      title="Edit Profile"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}

                  {isOwnerOrHr && (
                    <button
                      onClick={() => setArchivingEmployee({ employee: emp, action: emp.is_archived ? 'restore' : 'archive' })}
                      title={emp.is_archived ? 'Restore Employee' : 'Archive Employee'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        emp.is_archived ? 'text-emerald-400 hover:bg-emerald-950/80' : 'text-amber-400 hover:bg-amber-950/80'
                      }`}
                    >
                      {emp.is_archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Employee Modal */}
      <EmployeeCreateModal
        isOpen={showCreateModal}
        authToken={authToken}
        managers={employees}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchEmployees()}
      />

      {/* Edit Employee Drawer */}
      <EmployeeEditDrawer
        isOpen={editingEmployee !== null}
        employee={editingEmployee}
        currentUserRole={currentUser.role}
        authToken={authToken}
        managers={employees}
        onClose={() => setEditingEmployee(null)}
        onSuccess={() => fetchEmployees()}
      />

      {/* Archive / Restore Confirmation Modal */}
      <ArchiveConfirmModal
        isOpen={archivingEmployee !== null}
        employee={archivingEmployee?.employee || null}
        actionType={archivingEmployee?.action || 'archive'}
        authToken={authToken}
        onClose={() => setArchivingEmployee(null)}
        onSuccess={() => fetchEmployees()}
      />

    </div>
  );
};
