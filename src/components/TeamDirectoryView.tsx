import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Building2, Plus, Search, Archive, RefreshCw, Trash2, Edit3,
  UserCheck, AlertCircle, Sparkles, ChevronRight, UserPlus, ShieldAlert,
  User, CheckCircle2, Layers
} from 'lucide-react';
import { TeamRecord, DepartmentRecord, UserProfile } from '../../shared/types/api-contracts.js';
import { TeamCreateEditModal } from './TeamCreateEditModal.tsx';
import { ArchiveConfirmModal } from './ArchiveConfirmModal.tsx';

interface TeamDirectoryViewProps {
  currentUser: UserProfile;
  authToken: string;
  initialDepartmentId?: string;
}

export const TeamDirectoryView: React.FC<TeamDirectoryViewProps> = ({
  currentUser,
  authToken,
  initialDepartmentId
}) => {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>(initialDepartmentId || '');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingTeam, setEditingTeam] = useState<TeamRecord | null>(null);
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState<TeamRecord | null>(null);

  // Archive / Restore / Delete confirm modal
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    team: TeamRecord | null;
    action: 'archive' | 'restore' | 'delete';
  }>({ isOpen: false, team: null, action: 'archive' });

  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState<boolean>(false);

  const canManageTeams = currentUser.role === 'OWNER' || currentUser.role === 'HR_ADMIN' || currentUser.role === 'MANAGER';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [teamRes, deptRes, empRes] = await Promise.all([
        fetch('/api/v1/teams?include_archived=true', {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        fetch('/api/v1/departments', {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        fetch('/api/v1/users', {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      ]);

      const teamData = await teamRes.json();
      const deptData = await deptRes.json();
      const empData = await empRes.json();

      if (teamData.success && Array.isArray(teamData.data)) {
        setTeams(teamData.data);
      }

      if (deptData.success && Array.isArray(deptData.data)) {
        setDepartments(deptData.data);
      }

      if (empData.success && Array.isArray(empData.data)) {
        setEmployees(empData.data);
      }
    } catch (err) {
      console.error('Error fetching team directory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authToken]);

  // Filter teams
  const filteredTeams = teams.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.manager_name && t.manager_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.department_name && t.department_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = !departmentFilter || t.department_id === departmentFilter;

    if (statusFilter === 'active') return matchesSearch && matchesDept && !t.is_archived;
    if (statusFilter === 'archived') return matchesSearch && matchesDept && t.is_archived;
    return matchesSearch && matchesDept;
  });

  // Calculate stats
  const activeTeams = teams.filter(t => !t.is_archived);
  const teamsWithoutManager = activeTeams.filter(t => !t.manager_id);
  const totalMembersCount = activeTeams.reduce((sum, t) => sum + t.member_count, 0);

  const handleConfirmAction = async () => {
    if (!confirmModalState.team) return;
    const { team, action } = confirmModalState;

    setIsSubmittingConfirm(true);
    setConfirmError(null);

    try {
      let url = `/api/v1/teams/${team.id}`;
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
        setConfirmModalState({ isOpen: false, team: null, action: 'archive' });
        fetchData();
      } else {
        setConfirmError(data.error?.message || `Failed to ${action} team`);
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
          <Sparkles className="w-5 h-5 text-indigo-400 animate-spin" />
          <span>Loading Team Hierarchy & Member Rosters...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Header & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Cross-Functional Working Groups</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Teams Directory</h1>
          <p className="text-xs text-slate-400 max-w-xl mt-1">
            Organize employees into collaborative teams, assign team managers, map department alignment, and manage member rosters.
          </p>
        </div>

        {canManageTeams && (
          <button
            onClick={() => {
              setEditingTeam(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </button>
        )}
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Active Teams</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{activeTeams.length}</div>
          <div className="text-[11px] text-slate-500">Across all departments</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Total Team Members</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalMembersCount}</div>
          <div className="text-[11px] text-slate-500">Active assigned personnel</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Departments Mapped</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{departments.length}</div>
          <div className="text-[11px] text-slate-500">Parent organizational units</div>
        </div>

        <div className={`border rounded-2xl p-5 space-y-2 ${
          teamsWithoutManager.length > 0
            ? 'bg-amber-950/20 border-amber-800/50'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Teams Without Manager</span>
            <ShieldAlert className={`w-4 h-4 ${teamsWithoutManager.length > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className={`text-2xl font-black ${teamsWithoutManager.length > 0 ? 'text-amber-400' : 'text-white'}`}>
            {teamsWithoutManager.length}
          </div>
          <div className="text-[11px] text-slate-500">
            {teamsWithoutManager.length > 0 ? 'Requires manager assignment' : 'All teams have assigned managers'}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/50 p-3 border border-slate-800 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams by name, description, manager, or department..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Department Dropdown Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'active' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active ({teams.filter(t => !t.is_archived).length})
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'archived' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Archived ({teams.filter(t => t.is_archived).length})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({teams.length})
            </button>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">No teams found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || departmentFilter
              ? 'No teams match your search or department filter. Try clearing filters.'
              : 'No teams created yet. Start by creating a team under a department.'}
          </p>
          {canManageTeams && !searchQuery && !departmentFilter && (
            <button
              onClick={() => {
                setEditingTeam(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-all"
            >
              Create First Team
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <motion.div
              key={team.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-slate-900 border rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5 transition-all hover:border-slate-700 ${
                team.is_archived ? 'opacity-60 border-slate-800/60 bg-slate-900/40' : 'border-slate-800'
              }`}
            >
              <div className="space-y-4">
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{team.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-indigo-300 border border-slate-700">
                          {team.department_name || 'Cross-Functional'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          team.is_archived
                            ? 'bg-amber-950/60 border border-amber-800 text-amber-300'
                            : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                        }`}>
                          {team.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canManageTeams && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingTeam(team);
                          setIsCreateModalOpen(true);
                        }}
                        title="Edit Team"
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {team.is_archived ? (
                        <button
                          onClick={() => setConfirmModalState({ isOpen: true, team, action: 'restore' })}
                          title="Restore Team"
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-950/40 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmModalState({ isOpen: true, team, action: 'archive' })}
                          title="Archive Team"
                          className="p-1.5 text-amber-400 hover:text-amber-300 rounded-lg hover:bg-amber-950/40 transition-colors"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmModalState({ isOpen: true, team, action: 'delete' })}
                        title="Delete Team"
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 min-h-[2.25rem]">
                  {team.description || 'No description provided.'}
                </p>

                {/* Manager Card */}
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Team Manager
                  </div>
                  {team.manager_id ? (
                    <div className="flex items-center gap-2.5 pt-0.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-900 border border-indigo-700 flex items-center justify-center text-[10px] font-bold text-indigo-200 shrink-0">
                        {team.manager_name?.charAt(0) || 'M'}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-200 truncate">{team.manager_name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{team.manager_email}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>No Manager Assigned</span>
                    </div>
                  )}
                </div>

                {/* Member Count & Avatar Stack */}
                <div className="p-3 bg-slate-950/40 border border-slate-800/50 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">{team.member_count} Members</span>
                  </div>

                  {/* Avatar Stack */}
                  <div className="flex items-center -space-x-2">
                    {team.members && team.members.slice(0, 4).map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="w-6 h-6 rounded-full bg-slate-800 border border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-300"
                        title={m.full_name}
                      >
                        {m.full_name.charAt(0)}
                      </div>
                    ))}
                    {team.member_count > 4 && (
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        +{team.member_count - 4}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Roster & Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedTeamForMembers(team)}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Manage Roster</span>
                </button>

                <span className="text-[10px] text-slate-500 font-mono">
                  Created {new Date(team.created_at).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Team Create / Edit Modal */}
      <TeamCreateEditModal
        isOpen={isCreateModalOpen}
        team={editingTeam}
        departments={departments}
        employees={employees}
        authToken={authToken}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTeam(null);
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
            ? `Archive Team "${confirmModalState.team?.name}"?`
            : confirmModalState.action === 'restore'
            ? `Restore Team "${confirmModalState.team?.name}"?`
            : `Delete Team "${confirmModalState.team?.name}"?`
        }
        description={
          confirmModalState.action === 'archive'
            ? 'Archiving this team preserves member review history while removing it from active review assignment flows.'
            : confirmModalState.action === 'restore'
            ? 'Restoring this team reactivates it across department rosters.'
            : 'Deleting this team will unassign all current team members.'
        }
        confirmLabel={
          confirmModalState.action === 'archive' ? 'Archive Team' : confirmModalState.action === 'restore' ? 'Restore Team' : 'Delete Team'
        }
        actionType={confirmModalState.action}
        isSubmitting={isSubmittingConfirm}
        errorMsg={confirmError}
        onClose={() => {
          setConfirmModalState({ isOpen: false, team: null, action: 'archive' });
          setConfirmError(null);
        }}
        onConfirm={handleConfirmAction}
      />

      {/* Manage Members Modal / Drawer */}
      {selectedTeamForMembers && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedTeamForMembers.name} Roster</h3>
                    <p className="text-xs text-slate-400">Assigned members ({selectedTeamForMembers.member_count})</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTeamForMembers(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 flex-1">
                {employees.filter(e => e.team_id === selectedTeamForMembers.id).length === 0 ? (
                  <p className="text-xs text-slate-500 p-6 text-center">No members currently assigned to this team.</p>
                ) : (
                  employees.filter(e => e.team_id === selectedTeamForMembers.id).map(emp => (
                    <div key={emp.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{emp.full_name}</div>
                          <div className="text-[11px] text-slate-400">{emp.job_title || emp.role} • {emp.email}</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-medium">
                        Active
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingTeam(selectedTeamForMembers);
                    setSelectedTeamForMembers(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl"
                >
                  Edit Roster Selection
                </button>
                <button
                  onClick={() => setSelectedTeamForMembers(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}

    </div>
  );
};
