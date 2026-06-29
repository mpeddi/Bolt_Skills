import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, invokeFunction } from '../lib/supabase';
import type { UserConnector, ConnectorType } from '../types';
import { CONNECTOR_META } from '../types';
import AddConnectorModal from '../components/connectors/AddConnectorModal';

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<UserConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    loadConnectors();
    const success = searchParams.get('success');
    const err = searchParams.get('error');
    if (success) { setBanner({ type: 'success', msg: 'Google Calendar connected successfully!' }); }
    if (err) { setBanner({ type: 'error', msg: `Connection failed: ${err.replace(/_/g, ' ')}` }); }
    if (success || err) setSearchParams({});
  }, []);

  async function loadConnectors() {
    setLoading(true);
    const { data } = await supabase
      .from('user_connectors')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setConnectors(data as UserConnector[]);
    setLoading(false);
  }

  async function removeConnector(id: string) {
    if (!confirm('Remove this connector? All associated widgets will also be deleted.')) return;
    await supabase.from('user_connectors').delete().eq('id', id);
    setConnectors(prev => prev.filter(c => c.id !== id));
  }

  async function testConnector(c: UserConnector) {
    setTestingId(c.id);
    try {
      const fn = c.connector_type === 'jira' ? 'jira-proxy'
        : c.connector_type === 'slack' ? 'slack-proxy'
        : 'calendar-proxy';
      await invokeFunction(fn, { connector_id: c.id, action: 'test_connection', params: {} });
      await supabase.from('user_connectors').update({ status: 'active', last_synced_at: new Date().toISOString() }).eq('id', c.id);
      setConnectors(prev => prev.map(x => x.id === c.id ? { ...x, status: 'active', last_synced_at: new Date().toISOString() } : x));
      setBanner({ type: 'success', msg: `${CONNECTOR_META[c.connector_type].name} is connected and working.` });
    } catch (e: unknown) {
      await supabase.from('user_connectors').update({ status: 'error' }).eq('id', c.id);
      setConnectors(prev => prev.map(x => x.id === c.id ? { ...x, status: 'error' } : x));
      setBanner({ type: 'error', msg: e instanceof Error ? e.message : 'Connection test failed.' });
    } finally {
      setTestingId(null);
    }
  }

  const connectorTypes: ConnectorType[] = ['jira', 'slack', 'google_calendar'];

  function statusBadge(status: string) {
    if (status === 'active') return <span className="badge badge-success">Active</span>;
    if (status === 'error')  return <span className="badge badge-error">Error</span>;
    return <span className="badge badge-neutral">Disconnected</span>;
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-header-title">Connectors</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Connector
        </button>
      </div>

      <div className="page-body">
        {banner && (
          <div className={`alert alert-${banner.type}`} style={{ marginBottom: 20 }}>
            <span>{banner.msg}</span>
            <button className="btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setBanner(null)}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
            </button>
          </div>
        )}

        {/* Available connectors */}
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available Services</h2>
        <div className="connector-grid" style={{ marginBottom: 32 }}>
          {connectorTypes.map(type => {
            const meta = CONNECTOR_META[type];
            const existing = connectors.filter(c => c.connector_type === type);
            return (
              <div key={type} className="connector-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="connector-icon" style={{ background: meta.bg, color: meta.color }}>
                    {type === 'jira' ? 'J' : type === 'slack' ? 'S' : 'G'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{meta.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {existing.length} connection{existing.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {type === 'jira'
                    ? 'View and manage Jira issues, create tickets, update statuses, and comment — without leaving your dashboard.'
                    : type === 'slack'
                    ? 'Read channel messages and post replies directly from your workspace.'
                    : 'See upcoming calendar events and create new ones on the fly.'}
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => setShowModal(true)}
                >
                  Connect {meta.name}
                </button>
              </div>
            );
          })}
        </div>

        {/* My connections */}
        {loading ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
            <div className="spinner" />Loading…
          </div>
        ) : connectors.length > 0 && (
          <>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>My Connections</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {connectors.map(c => {
                const meta = CONNECTOR_META[c.connector_type];
                return (
                  <div key={c.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="connector-icon" style={{ background: meta.bg, color: meta.color, width: 32, height: 32, fontSize: 14 }}>
                      {c.connector_type === 'jira' ? 'J' : c.connector_type === 'slack' ? 'S' : 'G'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{c.display_name}</span>
                        {statusBadge(c.status)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>
                        {meta.name}
                        {c.last_synced_at ? ` · Last tested ${new Date(c.last_synced_at).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => testConnector(c)}
                        disabled={testingId === c.id}
                      >
                        {testingId === c.id ? <span className="spinner" /> : null}
                        Test
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeConnector(c.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <AddConnectorModal
          onClose={() => setShowModal(false)}
          onAdded={(c) => { setConnectors(prev => [...prev, c]); setShowModal(false); }}
        />
      )}
    </>
  );
}
