import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, Users, Layers, Plus, Search, Archive, RefreshCw, Trash2, Edit3,
  UserCheck, AlertCircle, Sparkles, ChevronRight, CheckCircle2, ShieldAlert,
  Repeat, ArrowRight, User
} from 'lucide-react';
import { DepartmentRecord, UserProfile } from '../../shared/types/api-contracts.js';
import { DepartmentCreateEditModal } from './DepartmentCreateEditModal.tsx';
import { ArchiveConfirmModal } from './ArchiveConfirmModal.tsx';

interface DepartmentDirectoryViewProps {
  currentUser: UserProfile;
  authToken: string;
  onNavigateToTeams?: (departmentId?: string) => void;
}

export const DepartmentDirectoryView: React.FC<DepartmentDirectoryViewProps> = ({
  currentUser,
  authToken,
  onNavigateToTeams
}) => {
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [selectedDeptForDetails, setSelectedDeptForDetails] = useState<DepartmentRecord | null>(null);

  // Archive / Restore / Delete confirm modal
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    dept: DepartmentRecord | null;
    action: 'archive' | 'restore' | 'delete';
  }>({ isOpen: false, dept: null, action: 'archive' });

  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState<boolean>(false);

  const isOwnerOrHr = currentUser.role === 'OWNER' || currentUser.role === 'HR_ADMIN';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [deptRes, empRes] = await Promise.all([
        fetch('/api/v1/departments?include_archived=true', {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        fetch('/api/v1/users', {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      ]);

      const deptData = await deptRes.json();
      const empData = await empRes.json();

      if (deptData.success && Array.isArray(deptData.data)) {
        setDepartments(deptData.data);
      }

      if (empData.success && Array.isArray(empData.data)) {
        setEmployees(empData.data);
      }
    } catch (err) {
      console.error('Error fetching departments data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authToken]);

  // Filter departments
  const filteredDepartments = departments.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.head_name && d.head_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === 'active') return matchesSearch && !d.is_archived;
    if (statusFilter === 'archived') return matchesSearch && d.is_archived;
    return matchesSearch;
  });

  // Calculate stats
  const activeDepts = departments.filter(d => !d.is_archived);
  const totalEmployeesInDepts = activeDepts.reduce((sum, d) => sum + d.employee_count, 0);
  const totalTeamsInDepts = activeDepts.reduce((sum, d) => sum + d.active_team_count, 0);
  const deptsWithoutHead = activeDepts.filter(d => !d.head_id);

  const handleConfirmAction = async () => {
    if (!confirmModalState.dept) return;
    const { dept, action } = confirmModalState;

    setIsSubmittingConfirm(true);
    setConfirmError(null);

    try {
      let url = `/api/v1/departments/${dept.id}`;
      let method = 'POST';

      if (action === 'archive') url += '/archive';
      else if (action === 'restore') url += '/restore';
      else if (action === 'delete') method = 'DELETE';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const data = await res.json();
      if (data.success) {
        setConfirmModalState({ isOpen: false, dept: null, action: 'archive' });
        fetchData();
      } else {
        setConfirmError(data.error?.message || `Failed to ${action} department`);
      }
    } catch (err: any) {
      setConfirmError(err.message || 'Action failed');
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-64 flex items-center justify-center p-12 text-slate-400 text-sm">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
          <span>Loading Department Hierarchy...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Workforce Organizational Structure</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Departments Directory</h1>
          <p className="text-xs text-slate-400 max-w-xl mt-1">
            Model internal functional divisions, assign department heads, monitor team distribution, and review performance metrics across teams.
          </p>
        </div>

        {isOwnerOrHr && (
          <button
            onClick={() => {
              setEditingDept(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Department</span>
          </button>
        )}
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Active Departments</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{activeDepts.length}</div>
          <div className="text-[11px] text-slate-500">Total functional units modeled</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Active Teams</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalTeamsInDepts}</div>
          <div className="text-[11px] text-slate-500">Nested working groups</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Assigned Employees</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalEmployeesInDepts}</div>
          <div className="text-[11px] text-slate-500">Across all department rosters</div>
        </div>

        <div className={`border rounded-2xl p-5 space-y-2 ${
          deptsWithoutHead.length > 0
            ? 'bg-amber-950/20 border-amber-800/50'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Depts Without Head</span>
            <ShieldAlert className={`w-4 h-4 ${deptsWithoutHead.length > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className={`text-2xl font-black ${deptsWithoutHead.length > 0 ? 'text-amber-400' : 'text-white'}`}>
            {deptsWithoutHead.length}
          </div>
          <div className="text-[11px] text-slate-500">
            {deptsWithoutHead.length > 0 ? 'Requires leadership assignment' : 'All departments have leadership'}
          </div>
        </div>
      </div>

      {/* Controls: Search & Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/50 p-3 border border-slate-800 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search departments by name, description, or head..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'active' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active ({departments.filter(d => !d.is_archived).length})
          </button>
          <button
            onClick={() => setStatusFilter('archived')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'archived' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Archived ({departments.filter(d => d.is_archived).length})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'all' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({departments.length})
          </button>
        </div>
      </div>

      {/* Department Cards Grid */}
      {filteredDepartments.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">No departments found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'No departments match your search criteria. Try modifying your filter.'
              : 'No departments created yet. Get started by creating your organization\'s first department.'}
          </p>
          {isOwnerOrHr && !searchQuery && (
            <button
              onClick={() => {
                setEditingDept(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-500 transition-all"
            >
              Create First Department
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((dept) => (
            <motion.div
              key={dept.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-slate-900 border rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5 transition-all hover:border-slate-700 ${
                dept.is_archived ? 'opacity-60 border-slate-800/60 bg-slate-900/40' : 'border-slate-800'
              }`}
            >
              <div className="space-y-4">
                {/* Card Top Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                        {dept.name}
                      </h3>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        dept.is_archived
                          ? 'bg-amber-950/60 border border-amber-800 text-amber-300'
                          : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      }`}>
                        {dept.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions dropdown or button cluster */}
                  {isOwnerOrHr && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingDept(dept);
                          setIsCreateModalOpen(true);
                        }}
                        title="Edit Department"
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {dept.is_archived ? (
                        <button
                          onClick={() => setConfirmModalState({ isOpen: true, dept, action: 'restore' })}
                          title="Restore Department"
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-950/40 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmModalState({ isOpen: true, dept, action: 'archive' })}
                          title="Archive Department"
                          className="p-1.5 text-amber-400 hover:text-amber-300 rounded-lg hover:bg-amber-950/40 transition-colors"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmModalState({ isOpen: true, dept, action: 'delete' })}
                        title="Delete Department"
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 min-h-[2.25rem]">
                  {dept.description || 'No description provided.'}
                </p>

                {/* Department Head Section */}
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Department Head
                  </div>
                  {dept.head_id ? (
                    <div className="flex items-center gap-2.5 pt-0.5">
                      <div className="w-6 h-6 rounded-full bg-purple-900 border border-purple-700 flex items-center justify-center text-[10px] font-bold text-purple-200 shrink-0">
                        {dept.head_name?.charAt(0) || 'H'}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-200 truncate">{dept.head_name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{dept.head_email}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Unassigned (Head needed)</span>
                    </div>
                  )}
                </div>

                {/* Metrics Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 bg-slate-950/40 border border-slate-800/50 rounded-xl">
                    <div className="text-sm font-black text-white">{dept.employee_count}</div>
                    <div className="text-[10px] text-slate-500">Employees</div>
                  </div>
                  <div className="p-2 bg-slate-950/40 border border-slate-800/50 rounded-xl">
                    <div className="text-sm font-black text-indigo-300">{dept.active_team_count}</div>
                    <div className="text-[10px] text-slate-500">Teams</div>
                  </div>
                  <div className="p-2 bg-slate-950/40 border border-slate-800/50 rounded-xl">
                    <div className="text-sm font-black text-purple-300">{dept.active_review_count}</div>
                    <div className="text-[10px] text-slate-500">Active Reviews</div>
                  </div>
                </div>
              </div>

              {/* View Details / Navigate to Teams */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedDeptForDetails(dept)}
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                >
                  <span>Department Roster</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {onNavigateToTeams && (
                  <button
                    onClick={() => onNavigateToTeams(dept.id)}
                    className="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <span>View Teams</span>
                    <ArrowRight className="w-3 h-3 text-indigo-400" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Department Create / Edit Modal */}
      <DepartmentCreateEditModal
        isOpen={isCreateModalOpen}
        department={editingDept}
        employees={employees}
        authToken={authToken}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingDept(null);
        }}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Archive / Restore / Delete Confirmation Modal */}
      <ArchiveConfirmModal
        isOpen={confirmModalState.isOpen}
        title={
          confirmModalState.action === 'archive'
            ? `Archive Department "${confirmModalState.dept?.name}"?`
            : confirmModalState.action === 'restore'
            ? `Restore Department "${confirmModalState.dept?.name}"?`
            : `Delete Department "${confirmModalState.dept?.name}"?`
        }
        description={
          confirmModalState.action === 'archive'
            ? 'Archiving this department will preserve all employee performance history while hiding it from active organizational selection lists.'
            : confirmModalState.action === 'restore'
            ? 'Restoring this department will reactivate it across the organizational directory.'
            : 'Safe Delete: Department deletion will fail if teams or active employees are assigned.'
        }
        confirmLabel={
          confirmModalState.action === 'archive' ? 'Archive Department' : confirmModalState.action === 'restore' ? 'Restore Department' : 'Delete Department'
        }
        actionType={confirmModalState.action}
        isSubmitting={isSubmittingConfirm}
        errorMsg={confirmError}
        onClose={() => {
          setConfirmModalState({ isOpen: false, dept: null, action: 'archive' });
          setConfirmError(null);
        }}
        onConfirm={handleConfirmAction}
      />

      {/* Department Roster / Details Slide-over Drawer */}
      {selectedDeptForDetails && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl p-6 overflow-y-auto space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedDeptForDetails.name}</h2>
                    <span className="text-xs text-slate-400">Department Overview & Assigned Workforce</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDeptForDetails(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Head info */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Department Head</span>
                {selectedDeptForDetails.head_id ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-900 border border-purple-700 flex items-center justify-center text-xs font-bold text-purple-200">
                      {selectedDeptForDetails.head_name?.charAt(0) || 'H'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{selectedDeptForDetails.head_name}</div>
                      <div className="text-[11px] text-slate-400">{selectedDeptForDetails.head_email}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-400 font-medium">No Department Head assigned.</p>
                )}
              </div>

              {/* Employee list for this dept */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Assigned Employees ({selectedDeptForDetails.employee_count})</span>
                </h3>

                {employees.filter(e => e.department_id === selectedDeptForDetails.id).length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 border border-slate-800 rounded-xl text-center">
                    No employees directly assigned to this department yet.
                  </p>
                ) : (
                  <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950/40">
                    {employees.filter(e => e.department_id === selectedDeptForDetails.id).map(emp => (
                      <div key={emp.id} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                            {emp.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">{emp.full_name}</div>
                            <div className="text-[11px] text-slate-400">{emp.job_title || emp.role} • {emp.email}</div>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          {emp.team_name || 'No Team'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedDeptForDetails(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl"
                >
                  Close Panel
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}

    </div>
  );
};
