import { UserRole, FeedbackSource, Severity } from './common.js';
import { EvidenceNode } from './evidence.js';
import { ClaimCandidate } from './claims.js';
import { BiasFlag } from './bias.js';
import { DraftReport, FinalReport, ReportClaim } from './reports.js';
import { AuditLogEntry, AgentRunRecord } from './audit.js';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface UserProfile {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  designation_id?: string | null;
  designation_title?: string | null;
  seniority_level?: number | null;
  job_family?: string | null;
  job_title?: string;
  department_id?: string | null;
  department_name?: string;
  team_id?: string | null;
  team_name?: string;
  manager_id?: string | null;
  manager_name?: string;
  employment_type?: string;
  joining_date?: string;
  location?: string;
  organization_id?: string | null;
  organization_name?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  is_archived?: boolean;
  created_at: string;
  updated_at?: string;
  current_review_cycle?: {
    id: string;
    review_period: string;
    status: string;
  } | null;
  review_history?: Array<{
    id: string;
    review_period: string;
    status: string;
    finalized_at?: string | null;
  }>;
}

export interface CreateEmployeeRequest {
  full_name: string;
  email: string;
  role?: UserRole;
  phone?: string;
  job_title?: string;
  designation_id?: string;
  department_id?: string;
  team_id?: string;
  manager_id?: string;
  employment_type?: string;
  joining_date?: string;
  location?: string;
  avatar_url?: string;
}

export interface UpdateEmployeeRequest {
  full_name?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  job_title?: string;
  designation_id?: string;
  department_id?: string;
  team_id?: string;
  manager_id?: string;
  employment_type?: string;
  joining_date?: string;
  location?: string;
  avatar_url?: string;
  is_active?: boolean;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  logo_url?: string | null;
  industry?: string | null;
  company_size?: string | null;
  website?: string | null;
  timezone: string;
  default_review_cycle: string;
  language: string;
  review_frequency: string;
  org_code: string;
  created_at: string;
  updated_at: string;
}

export interface InvitationRecord {
  id: string;
  organization_id: string;
  organization_name?: string;
  email: string;
  role: UserRole;
  department_id?: string | null;
  department_name?: string;
  team_id?: string | null;
  team_name?: string;
  invitation_code: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  invited_by?: string | null;
  invited_by_name?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentRecord {
  id: string;
  name: string;
  description?: string | null;
  organization_id?: string | null;
  head_id?: string | null;
  head_name?: string | null;
  head_email?: string | null;
  is_archived: boolean;
  employee_count: number;
  active_team_count: number;
  active_review_count: number;
  status: 'ACTIVE' | 'ARCHIVED';
  created_at: string;
  updated_at?: string | null;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
  head_id?: string | null;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
  head_id?: string | null;
}

export interface TeamRecord {
  id: string;
  name: string;
  description?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  organization_id?: string | null;
  manager_id?: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  members?: UserProfile[];
  member_count: number;
  is_archived: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  created_at: string;
  updated_at?: string | null;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  department_id?: string | null;
  manager_id?: string | null;
  member_ids?: string[];
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  department_id?: string | null;
  manager_id?: string | null;
  member_ids?: string[];
}

export interface CreateOrganizationRequest {
  name: string;
  logo_url?: string;
  industry?: string;
  company_size?: string;
  website?: string;
  timezone?: string;
  default_review_cycle?: string;
  language?: string;
  review_frequency?: string;
  departments?: { name: string; description?: string }[];
  teams?: { name: string; department_name?: string }[];
  managers?: { full_name: string; email: string; job_title?: string; department_name?: string }[];
}

export interface JoinOrganizationRequest {
  codeOrToken: string;
}

export interface CreateInvitationRequest {
  email: string;
  role: UserRole;
  department_id?: string;
  team_id?: string;
}

export interface AuthLoginRequest {
  email: string;
  password?: string;
}

export interface AuthLoginResponse {
  user: UserProfile;
  token: string;
  role: UserRole;
}

export interface RawFeedbackSubmission {
  reviewId?: string;
  sourceType: FeedbackSource;
  title?: string;
  content: string;
  subjectEmployeeId: string;
  authorRole: 'self' | 'peer' | 'manager';
  authorId?: string | null;
  metadata?: Record<string, any>;
}

export interface ReviewCycleRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  manager_id: string;
  manager_name?: string;
  review_period: string;
  status: string;
  started_at?: string | null;
  finalized_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateClaimDecisionRequest {
  action: 'APPROVE' | 'REJECT' | 'EDIT';
  editedText?: string | null;
  comment?: string | null;
  acknowledgedHighSeverityBias?: boolean;
}

export interface EscalatedQueueItem {
  reviewId: string;
  employeeId: string;
  employeeName: string;
  pipelineStage: string;
  failureReason: string;
  retryCount: number;
  status: string;
  createdAt: string;
}

export interface DesignationRecord {
  id: string;
  organization_id: string;
  title: string;
  description?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  seniority_level: number;
  job_family: string;
  is_archived: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  employee_count: number;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateDesignationRequest {
  title: string;
  description?: string;
  department_id?: string | null;
  seniority_level?: number;
  job_family?: string;
}

export interface UpdateDesignationRequest {
  title?: string;
  description?: string;
  department_id?: string | null;
  seniority_level?: number;
  job_family?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}

export interface HierarchyChainNode {
  id: string;
  employee_code?: string;
  full_name: string;
  email: string;
  role: UserRole;
  job_title?: string;
  designation_title?: string;
  department_name?: string;
  team_name?: string;
  avatar_url?: string | null;
  depth: number;
}

export interface HierarchyDetailsResponse {
  user: UserProfile;
  manager: HierarchyChainNode | null;
  skip_level_manager: HierarchyChainNode | null;
  chain: HierarchyChainNode[];
  direct_reports: UserProfile[];
  depth: number;
}

export interface OrgTreeNode {
  id: string;
  employee_code?: string;
  full_name: string;
  email: string;
  role: UserRole;
  job_title?: string;
  designation_title?: string;
  department_id?: string | null;
  department_name?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  manager_id?: string | null;
  avatar_url?: string | null;
  direct_reports_count: number;
  children: OrgTreeNode[];
}

export interface HierarchyHealthMetrics {
  total_employees: number;
  missing_manager_count: number;
  missing_designation_count: number;
  hierarchy_health_score: number;
  largest_departments: Array<{ id: string; name: string; employee_count: number }>;
  largest_teams: Array<{ id: string; name: string; member_count: number }>;
}

