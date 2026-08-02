import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { LoginView } from './components/LoginView.tsx';
import { PublicLandingView } from './components/PublicLandingView.tsx';
import { EmployeeDashboard } from './components/EmployeeDashboard.tsx';
import { ManagerDashboard } from './components/ManagerDashboard.tsx';
import { HrDashboard } from './components/HrDashboard.tsx';
import { ReviewWorkspace } from './components/ReviewWorkspace.tsx';
import { FeedbackSubmissionModal } from './components/FeedbackSubmissionModal.tsx';
import { AuditCenterView } from './components/AuditCenterView.tsx';
import { OnboardingWelcomeView } from './components/OnboardingWelcomeView.tsx';
import { CreateOrganizationWizard } from './components/CreateOrganizationWizard.tsx';
import { JoinOrganizationModal } from './components/JoinOrganizationModal.tsx';
import { InvitationManagementModal } from './components/InvitationManagementModal.tsx';
import { OrganizationDashboardView } from './components/OrganizationDashboardView.tsx';
import { EmployeeDirectoryView } from './components/EmployeeDirectoryView.tsx';
import { DepartmentDirectoryView } from './components/DepartmentDirectoryView.tsx';
import { TeamDirectoryView } from './components/TeamDirectoryView.tsx';
import { ToastProvider } from './components/ui/Toast.tsx';
import { UserProfile } from '../shared/types/api-contracts.js';
import { UserRole } from '../shared/types/common.js';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [teamEmployees, setTeamEmployees] = useState<UserProfile[]>([]);
  const [showPublicLanding, setShowPublicLanding] = useState<boolean>(false);
  const [onboardingMode, setOnboardingMode] = useState<'welcome' | 'create' | 'join' | null>(null);
  const [showInvitationsModal, setShowInvitationsModal] = useState<boolean>(false);
  const [selectedDeptForTeams, setSelectedDeptForTeams] = useState<string | undefined>(undefined);

  // Restore authenticated session on mount via GET /api/v1/auth/me
  useEffect(() => {
    const savedToken = localStorage.getItem('verireview_token');
    if (savedToken) {
      fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setCurrentUser(data.data);
            setAuthToken(savedToken);
            setShowPublicLanding(false);
          } else {
            // Token expired or invalid
            localStorage.removeItem('verireview_token');
            setShowPublicLanding(true);
          }
        })
        .catch(() => {
          setShowPublicLanding(true);
        });
    } else {
      setShowPublicLanding(true);
    }
  }, []);

  // Login helper for role switcher and public landing
  const handleRoleLogin = async (email: string) => {
    setShowPublicLanding(false);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'VeriReview2026!' })
      });
      const data = await res.json();
      if (data.success && data.data) {
        const token = data.data.accessToken || data.data.token;
        setCurrentUser(data.data.user);
        setAuthToken(token);
        if (token) localStorage.setItem('verireview_token', token);
      }
    } catch (err) {
      console.error('Role login error:', err);
    }
  };

  const handleSelectRole = (role: UserRole) => {
    if (role === 'HR_ADMIN') handleRoleLogin('hr.admin@verireview.ai');
    else if (role === 'MANAGER') handleRoleLogin('marcus.manager@verireview.ai');
    else handleRoleLogin('alex.employee@verireview.ai');
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch (err) {
        console.error('Logout request error:', err);
      }
    }
    localStorage.removeItem('verireview_token');
    setCurrentUser(null);
    setAuthToken(null);
    setShowPublicLanding(true);
  };

  // Fetch team list for managers/HR
  useEffect(() => {
    if (currentUser && (currentUser.role === 'MANAGER' || currentUser.role === 'HR_ADMIN') && authToken) {
      fetch('/api/v1/users/team', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setTeamEmployees(data.data);
        })
        .catch((err) => console.error('Error fetching team employees:', err));
    }
  }, [currentUser, authToken]);

  if (showPublicLanding) {
    return (
      <ToastProvider>
        <PublicLandingView
          onSignIn={() => setShowPublicLanding(false)}
          onGetStarted={() => setShowPublicLanding(false)}
          onDemoLogin={(email) => handleRoleLogin(email)}
          onExploreDemo={() => {
            setShowPublicLanding(false);
            if (!currentUser) handleRoleLogin('hr.admin@verireview.ai');
          }}
        />
      </ToastProvider>
    );
  }

  if (!currentUser) {
    return (
      <ToastProvider>
        <LoginView
          onBackToLanding={() => setShowPublicLanding(true)}
          onLoginSuccess={(user, token) => {
            setCurrentUser(user);
            setAuthToken(token);
            if (!user.organization_id) {
              setOnboardingMode('welcome');
            }
          }}
        />
      </ToastProvider>
    );
  }

  // Handle post-auth onboarding for users without an organization
  if (!currentUser.organization_id && onboardingMode !== null) {
    if (onboardingMode === 'welcome') {
      return (
        <ToastProvider>
          <OnboardingWelcomeView
            currentUser={currentUser}
            onCreateOrg={() => setOnboardingMode('create')}
            onJoinOrg={() => setOnboardingMode('join')}
            onLogout={handleLogout}
          />
        </ToastProvider>
      );
    }

    if (onboardingMode === 'create') {
      return (
        <ToastProvider>
          <CreateOrganizationWizard
            currentUser={currentUser}
            authToken={authToken || ''}
            onSuccess={(orgData, updatedUser) => {
              setCurrentUser(updatedUser);
              setOnboardingMode(null);
              setCurrentTab('organization');
            }}
            onCancel={() => setOnboardingMode('welcome')}
          />
        </ToastProvider>
      );
    }

    if (onboardingMode === 'join') {
      return (
        <ToastProvider>
          <JoinOrganizationModal
            currentUser={currentUser}
            authToken={authToken || ''}
            onSuccess={(orgData, updatedUser) => {
              setCurrentUser(updatedUser);
              setOnboardingMode(null);
              setCurrentTab('organization');
            }}
            onCancel={() => setOnboardingMode('welcome')}
          />
        </ToastProvider>
      );
    }
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-purple-500 selection:text-white">
        
        {/* Top Navbar */}
        <Navbar
          currentUser={currentUser}
          onSelectRole={handleSelectRole}
          onLogout={handleLogout}
          currentTab={currentTab}
          onNavigate={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'workspace') setActiveReviewId(null);
          }}
          onOpenPublicLanding={() => setShowPublicLanding(true)}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <Sidebar
            currentTab={currentTab}
            onNavigate={(tab) => {
              setCurrentTab(tab);
              if (tab !== 'workspace') setActiveReviewId(null);
            }}
            userRole={currentUser.role}
          />

          {/* Main Content Workspace */}
          <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full">
            {currentTab === 'organization' && (
              <OrganizationDashboardView
                currentUser={currentUser}
                authToken={authToken || ''}
                onOpenInvitations={() => setShowInvitationsModal(true)}
                onNavigateToReviews={() => setCurrentTab('reviews')}
              />
            )}

            {currentTab === 'employees' && (
              <EmployeeDirectoryView
                currentUser={currentUser}
                authToken={authToken || ''}
              />
            )}

            {currentTab === 'departments' && (
              <DepartmentDirectoryView
                currentUser={currentUser}
                authToken={authToken || ''}
                onNavigateToTeams={(deptId) => {
                  setSelectedDeptForTeams(deptId);
                  setCurrentTab('teams');
                }}
              />
            )}

            {currentTab === 'teams' && (
              <TeamDirectoryView
                currentUser={currentUser}
                authToken={authToken || ''}
                initialDepartmentId={selectedDeptForTeams}
              />
            )}

            {currentTab === 'dashboard' && (
              currentUser.role === 'EMPLOYEE' ? (
                <EmployeeDashboard currentUser={currentUser} />
              ) : currentUser.role === 'MANAGER' ? (
                <ManagerDashboard
                  currentUser={currentUser}
                  onOpenWorkspace={(reviewId) => {
                    setActiveReviewId(reviewId);
                    setCurrentTab('workspace');
                  }}
                />
              ) : (
                <HrDashboard
                  currentUser={currentUser}
                  onNavigate={(tab) => setCurrentTab(tab)}
                />
              )
            )}

            {(currentTab === 'reviews' || currentTab === 'workspace') && (
              activeReviewId ? (
                <ReviewWorkspace
                  reviewId={activeReviewId}
                  currentUser={currentUser}
                  onFinalized={() => {
                    setCurrentTab('dashboard');
                  }}
                />
              ) : (
                <ManagerDashboard
                  currentUser={currentUser}
                  onOpenWorkspace={(reviewId) => {
                    setActiveReviewId(reviewId);
                    setCurrentTab('workspace');
                  }}
                />
              )
            )}

            {currentTab === 'feedback' && (
              <div className="py-4">
                <FeedbackSubmissionModal
                  currentUser={currentUser}
                  employees={teamEmployees}
                  onSubmitSuccess={() => {
                    setCurrentTab('dashboard');
                  }}
                />
              </div>
            )}

            {currentTab === 'evidence' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h1 className="text-lg font-bold text-white tracking-tight">Evidence Explorer & Query Hub</h1>
                <p className="text-xs text-slate-400">View and inspect all normalized evidence nodes indexed across review cycles.</p>
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                  Select a review cycle from Manager Dashboard or Workspace to inspect detailed linked evidence nodes.
                </div>
              </div>
            )}

            {currentTab === 'bias' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h1 className="text-lg font-bold text-white tracking-tight">Bias Analysis & Guardrails Panel</h1>
                <p className="text-xs text-slate-400">System-wide detection of source imbalance, recency weight, sentiment extremity, and unsupported claims.</p>
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                  Open active Review Workspace to view and acknowledge high-severity bias flags.
                </div>
              </div>
            )}

            {currentTab === 'audit' && (
              <AuditCenterView currentUser={currentUser} />
            )}

            {currentTab === 'ops-queue' && (
              <HrDashboard currentUser={currentUser} onNavigate={(tab) => setCurrentTab(tab)} />
            )}

            {currentTab === 'agents-health' && (
              <HrDashboard currentUser={currentUser} onNavigate={(tab) => setCurrentTab(tab)} />
            )}
          </main>
        </div>

        {showInvitationsModal && (
          <InvitationManagementModal
            currentUser={currentUser}
            authToken={authToken || ''}
            onClose={() => setShowInvitationsModal(false)}
          />
        )}

      </div>
    </ToastProvider>
  );
}

export default App;
