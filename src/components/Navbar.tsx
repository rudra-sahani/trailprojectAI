import React, { useState } from 'react';
import { Shield, User, LogOut, Bell, Search, Database, Brain, Sparkles, Settings, Command } from 'lucide-react';
import { UserProfile } from '../../shared/types/api-contracts.js';
import { UserRole } from '../../shared/types/common.js';
import { SettingsModal } from './SettingsModal.tsx';
import { useToast } from './ui/Toast.tsx';

interface NavbarProps {
  currentUser: UserProfile | null;
  onSelectRole: (role: UserRole) => void;
  onLogout: () => void;
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenPublicLanding?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSelectRole,
  onLogout,
  currentTab,
  onNavigate,
  onOpenPublicLanding
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToast();

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      addToast({
        type: 'info',
        title: 'Evidence Query Dispatched',
        description: `Filtering indexed evidence nodes and reviews for "${searchQuery.trim()}"`
      });
      onNavigate('evidence');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#080C14]/90 backdrop-blur-xl border-b border-[#A28089]/20 text-slate-100 shadow-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo & App Name */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => onNavigate('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#51E2F5] via-[#38c1e8] to-[#131F33] p-[1px] shadow-lg shadow-[#51E2F5]/20">
              <div className="w-full h-full bg-[#0E1626] rounded-[11px] flex items-center justify-center text-[#51E2F5]">
                <Brain className="w-5 h-5 text-[#51E2F5]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white font-display">VeriReview AI</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#51E2F5]/10 text-[#51E2F5] border border-[#51E2F5]/30 font-mono tracking-wider">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">360° AI Performance Governance</p>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="hidden md:flex items-center relative flex-1 max-w-md mx-4">
            <Search className="w-4 h-4 absolute left-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search evidence claims, employees, bias flags... (Press Enter)"
              className="w-full bg-[#0E1626] border border-[#A28089]/30 rounded-xl pl-9 pr-12 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#51E2F5] focus:ring-1 focus:ring-[#51E2F5] transition-all shadow-inner"
            />
            <div className="absolute right-2.5 flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-[#131F33] px-1.5 py-0.5 rounded border border-[#A28089]/30">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </div>

          {/* Controls, Role Switcher & Profile */}
          <div className="flex items-center gap-3">
            
            {/* Quick Public Architecture Showcase button */}
            {onOpenPublicLanding && (
              <button
                onClick={onOpenPublicLanding}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1626] text-xs font-semibold text-slate-300 hover:text-white hover:border-[#51E2F5]/40 border border-[#A28089]/30 transition-all focus-ring"
                title="View Value Showcase"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#51E2F5]" />
                <span>Showcase</span>
              </button>
            )}

            {/* Quick Demo Role Switcher */}
            <div className="hidden sm:flex items-center bg-[#0E1626] rounded-xl p-1 border border-[#A28089]/30">
              <span className="text-[10px] font-bold uppercase text-slate-400 px-2 tracking-wider font-mono">Role:</span>
              <button
                onClick={() => onSelectRole('HR_ADMIN')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  currentUser?.role === 'HR_ADMIN'
                    ? 'bg-[#51E2F5] text-[#080C14] shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-[#131F33]'
                }`}
              >
                HR Admin
              </button>
              <button
                onClick={() => onSelectRole('MANAGER')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  currentUser?.role === 'MANAGER'
                    ? 'bg-[#51E2F5] text-[#080C14] shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-[#131F33]'
                }`}
              >
                Manager
              </button>
              <button
                onClick={() => onSelectRole('EMPLOYEE')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  currentUser?.role === 'EMPLOYEE'
                    ? 'bg-[#51E2F5] text-[#080C14] shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-[#131F33]'
                }`}
              >
                Employee
              </button>
            </div>

            {/* Settings Trigger */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-[#0E1626] text-slate-300 hover:text-white hover:border-[#51E2F5]/40 border border-[#A28089]/30 transition-all focus-ring"
              title="Settings & Thresholds"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Notifications Badge */}
            <button
              onClick={() => {
                addToast({
                  type: 'info',
                  title: 'System Notifications',
                  description: 'Zero unresolved critical alerts. 5-agent pipeline running smoothly.'
                });
              }}
              className="relative p-2 rounded-xl bg-[#0E1626] text-slate-300 hover:text-white hover:border-[#51E2F5]/40 border border-[#A28089]/30 transition-all focus-ring"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#51E2F5] rounded-full ring-2 ring-[#080C14] animate-pulse" />
            </button>

            {/* User Profile Card */}
            {currentUser && (
              <div className="flex items-center gap-2.5 pl-3 border-l border-[#A28089]/20">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#51E2F5] to-[#131F33] border border-[#51E2F5]/40 flex items-center justify-center font-extrabold text-xs text-[#080C14] shadow font-display">
                  {currentUser.full_name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-100 leading-none font-display">{currentUser.full_name}</div>
                  <div className="text-[10px] text-[#51E2F5] font-semibold mt-0.5 font-mono">{currentUser.role}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors focus-ring"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {currentUser && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentUser={currentUser}
        />
      )}
    </>
  );
};
