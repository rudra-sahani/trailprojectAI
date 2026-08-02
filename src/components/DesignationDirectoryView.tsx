import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award, Plus, Search, Filter, Layers, Building2,
  Edit2, Archive, RefreshCw, AlertCircle, CheckCircle2, Users, Shield, ArrowUpDown
} from 'lucide-react';
import { DesignationRecord, DepartmentRecord, UserProfile } from '../../shared/types/api-contracts.js';
import { DesignationCreateEditModal } from './DesignationCreateEditModal.js';
import { ArchiveConfirmModal } from './ArchiveConfirmModal.js';

interface DesignationDirectoryViewProps {
  currentUser: UserProfile;
  authToken: string;
}

export const DesignationDirectoryView: React.FC<DesignationDirectoryViewProps> = ({
  currentUser,
  authToken
}) => {
  const [designations, setDesignations] = useState<DesignationRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [jobFamilyFilter, setJobFamilyFilter] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'title' | 'level' | 'employees'>('level');

  // Modal states
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<DesignationRecord | null>(null);
  const [archivingDesignation, setArchivingDesignation] = useState<DesignationRecord | null>(null);
  const [restoringDesignation, setRestoringDesignation] = useState<DesignationRecord | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const canManage = currentUser.role === 'OWNER' || currentUser.role === 'HR_ADMIN';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [desRes, deptRes] = await Promise.all([
        fetch(`/api/v1/designations?include_archived=${showArchived}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        fetch('/api/v1/departments', {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      ]);

      const desData = await desRes.json();
      const deptData = await deptRes.json();

      if (desData.success) setDesignations(desData.data || []);
      if (deptData.success) setDepartments(deptData.data || []);
    } catch (err) {
      console.error('Error fetching designations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authToken, showArchived]);

  const handleArchive = async () => {
    if (!archivingDesignation) return;
    try {
      const res = await fetch(`/api/v1/designations/${archivingDesignation.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Designation "${archivingDesignation.title}" archived successfully`);
        setArchivingDesignation(null);
        fetchData();
      }
    } catch (err) {
      console.error('Error archiving designation:', err);
    }
  };

  const handleRestore = async (des: DesignationRecord) => {
    try {
      const res = await fetch(`/api/v1/designations/${des.id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Designation "${des.title}" restored successfully`);
        fetchData();
      }
    } catch (err) {
      console.error('Error restoring designation:', err);
    }
  };

  // Filter & sort designations
  const filteredDesignations = designations.filter(d => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.job_family && d.job_family.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = departmentFilter === 'ALL' || d.department_id === departmentFilter;
    const matchesFamily = jobFamilyFilter === 'ALL' || d.job_family === jobFamilyFilter;

    return matchesSearch && matchesDept && matchesFamily;
  }).sort((a, b) => {
    if (sortBy === 'level') return (b.seniority_level || 1) - (a.seniority_level || 1);
    if (sortBy === 'employees') return (b.employee_count || 0) - (a.employee_count || 0);
    return a.title.localeCompare(b.title);
  });

  const jobFamilies = Array.from(new Set(designations.map(d => d.job_family).filter(Boolean)));

  const getSeniorityBadgeColor = (level: number) => {
    if (level <= 2) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (level <= 4) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (level <= 6) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (level <= 8) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/30 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
            <Award className="w-3.5 h-3.5 text-purple-400" />
            <span>Designation Architecture & Job Families</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">Designation Management</h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Model official job designations, seniority levels, and job families for enterprise review calibration.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setSelectedDesignation(null);
              setIsCreateEditOpen(true);
            }}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Designation</span>
          </button>
        )}
      </div>

      {/* Action Notification */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="hover:text-emerald-100 text-slate-400">
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search designation or job family..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Department filter */}
          <div className="relative w-full sm:w-48">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Job Family filter */}
          <div className="relative w-full sm:w-48">
            <select
              value={jobFamilyFilter}
              onChange={(e) => setJobFamilyFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Job Families</option>
              {jobFamilies.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Sort & Toggle options */}
        <div className="flex items-center gap-3 shrink-0 self-end lg:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="level">Seniority (High to Low)</option>
              <option value="title">Title (A-Z)</option>
              <option value="employees">Employee Count</option>
            </select>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-0"
            />
            <span>Show Archived</span>
          </label>
        </div>
      </div>

      {/* Designation Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading Designations...</div>
      ) : filteredDesignations.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Award className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No Designations Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || departmentFilter !== 'ALL' || jobFamilyFilter !== 'ALL'
              ? 'Try clearing your filters or search query.'
              : 'Create your organization’s first designation to establish structured job titles.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDesignations.map((des) => {
            const dept = departments.find(d => d.id === des.department_id);
            const level = des.seniority_level || 1;

            return (
              <motion.div
                key={des.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-lg transition-all flex flex-col justify-between ${
                  des.is_archived
                    ? 'border-slate-800/60 opacity-60 bg-slate-950/50'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${getSeniorityBadgeColor(level)}`}>
                        Level {level}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 line-clamp-1">{des.title}</h3>
                    </div>

                    {des.is_archived ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase">
                        Archived
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <p className="text-xs text-slate-400 line-clamp-2 min-h-8">
                    {des.description || 'No specific role description defined.'}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Job Family</span>
                      <span className="text-slate-300 font-medium text-xs">{des.job_family || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Department</span>
                      <span className="text-slate-300 font-medium text-xs truncate block">
                        {dept ? dept.name : 'Cross-Functional'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer bar */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-slate-200 font-bold">{des.employee_count || 0}</span>
                    <span>Employees</span>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      {des.is_archived ? (
                        <button
                          onClick={() => handleRestore(des)}
                          title="Restore Designation"
                          className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setSelectedDesignation(des);
                              setIsCreateEditOpen(true);
                            }}
                            title="Edit Designation"
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setArchivingDesignation(des)}
                            title="Archive Designation"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Components */}
      <DesignationCreateEditModal
        isOpen={isCreateEditOpen}
        onClose={() => {
          setIsCreateEditOpen(false);
          setSelectedDesignation(null);
        }}
        onSuccess={() => {
          setActionSuccessMsg(selectedDesignation ? 'Designation updated' : 'Designation created');
          fetchData();
        }}
        authToken={authToken}
        designationToEdit={selectedDesignation}
        departments={departments}
      />

      <ArchiveConfirmModal
        isOpen={!!archivingDesignation}
        onClose={() => setArchivingDesignation(null)}
        onConfirm={handleArchive}
        title="Archive Designation"
        message={`Are you sure you want to archive the designation "${archivingDesignation?.title}"? Employees currently holding this designation will retain their historical record.`}
      />
    </div>
  );
};
