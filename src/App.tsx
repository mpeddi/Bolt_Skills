import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import AppShell from './components/AppShell';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ConnectorsPage from './pages/ConnectorsPage';
import AddWidgetsPage from './pages/AddWidgetsPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (() => { setUser(session?.user ?? null); })();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-sidebar)' }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <AppShell user={user}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/connectors" element={<ConnectorsPage />} />
        <Route path="/add-widgets" element={<AddWidgetsPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
