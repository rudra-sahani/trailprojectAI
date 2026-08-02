import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, X, Check, AlertCircle, Sparkles, UserCheck, Search, Building2 } from 'lucide-react';
import { TeamRecord, DepartmentRecord, UserProfile } from '../../shared/types/api-contracts.js';

interface TeamCreateEditModalProps {
  isOpen: boolean;
  team: TeamRecord | null;
  departments: DepartmentRecord[];
  employees: UserProfile[];
  authToken: string;
  onClose: () => void;
  onSuccess: (savedTeam: TeamRecord) => void;
}

export const TeamCreateEditModal: React.FC<TeamCreateEditModalProps> = ({
  isOpen,
  team,
  departments,
  employees,
  authToken,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [managerId, setManagerId] = useState<string>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (team) {
      setName(team.name || '');
      setDescription(team.description || '');
      setDepartmentId(team.department_id || '');
      setManagerId(team.manager_id || '');
      setSelectedMemberIds(team.members ? team.members.map(m => m.id) : []);
    } else {
      setName('');
      setDescription('');
      setDepartmentId(departments.length > 0 ? departments[0].id : '');
      setManagerId('');
      setSelectedMemberIds([]);
    }
    setErrorMsg(null);
    setMemberSearch('');
  }, [team, departments, isOpen]);

  if (!isOpen) return null;

  const toggleMember = (empId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const filteredEmployees = employees.filter(e =>
    e.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    e.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (e.job_title && e.job_title.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Team name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const url = team ? `/api/v1/teams/${team.id}` : '/api/v1/teams';
      const method = team ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          department_id: departmentId || null,
          manager_id: managerId || null,
          member_ids: selectedMemberIds
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        onSuccess(data.data);
        onClose();
      } else {
        setErrorMsg(data.error?.message || 'Failed to save team');
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
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {team ? 'Edit Team' : 'Create New Team'}
                </h2>
                <p className="text-xs text-slate-400">
                  {team ? 'Update team configuration, manager, and member roster' : 'Model a collaborative group under a department'}
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
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  Team Name <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Core Frontend, AI Platform, Security Ops"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Department</span>
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                >
                  <option value="">Unassigned (Cross-Functional)</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Team Manager</span>
                </label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                >
                  <option value="">No Manager Assigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.job_title || emp.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Team mission, core deliverables, and domain scope..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
              />
            </div>

            {/* Member Selection Section */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Select Team Members ({selectedMemberIds.length} selected)</span>
                </label>
                {selectedMemberIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMemberIds([])}
                    className="text-[11px] text-purple-400 hover:underline"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {/* Search members */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Filter employees by name or email..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Member Selection List */}
              <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/60 bg-slate-950/40 p-1">
                {filteredEmployees.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-500">No employees match your filter.</p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = selectedMemberIds.includes(emp.id);
                    return (
                      <div
                        key={emp.id}
                        onClick={() => toggleMember(emp.id)}
                        className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-purple-950/40 border border-purple-800/40' : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                            {emp.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-white">{emp.full_name}</div>
                            <div className="text-[11px] text-slate-400">
                              {emp.job_title || emp.role} • {emp.department_name || 'No Dept'}
                            </div>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
                    <span>Saving Team...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{team ? 'Update Team' : 'Create Team'}</span>
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
