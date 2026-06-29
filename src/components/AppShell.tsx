import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Props {
  user: User;
  children: ReactNode;
}

function IconGrid() {
  return (
    <svg className="sidebar-item-icon" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg className="sidebar-item-icon" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="sidebar-item-icon" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
    </svg>
  );
}

export default function AppShell({ user, children }: Props) {
  const navigate = useNavigate();
  const initials = (user.email ?? '?').slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <IconGrid />, exact: true },
    { to: '/connectors', label: 'Connectors', icon: <IconLink />, exact: false },
    { to: '/add-widgets', label: 'Add Widgets', icon: <IconPlus />, exact: false },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">W</div>
          <div>
            <div className="sidebar-logo-text">WorkSpace</div>
            <div className="sidebar-logo-sub">Enterprise Dashboard</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map(({ to, label, icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `sidebar-item${isActive ? ' active' : ''}`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name truncate">{user.email?.split('@')[0]}</div>
              <div className="sidebar-user-email truncate">{user.email}</div>
            </div>
          </div>
          <button
            className="sidebar-item"
            onClick={handleSignOut}
            style={{ marginTop: 4 }}
          >
            <IconLogout />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
