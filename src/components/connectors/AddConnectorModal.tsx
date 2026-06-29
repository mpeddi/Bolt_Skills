import { useState } from 'react';
import { supabase, invokeFunction } from '../../lib/supabase';
import type { UserConnector, ConnectorType } from '../../types';
import { CONNECTOR_META } from '../../types';

interface Props {
  onClose: () => void;
  onAdded: (connector: UserConnector) => void;
}

type Step = 'pick' | 'configure';

async function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return { codeVerifier, codeChallenge };
}

export default function AddConnectorModal({ onClose, onAdded }: Props) {
  const [step, setStep] = useState<Step>('pick');
  const [type, setType] = useState<ConnectorType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Jira fields
  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraName, setJiraName] = useState('My Jira');

  // Slack fields
  const [slackToken, setSlackToken] = useState('');
  const [slackName, setSlackName] = useState('My Slack');

  // Google Calendar fields
  const [calClientId, setCalClientId] = useState('');
  const [calName, setCalName] = useState('My Calendar');

  function pickType(t: ConnectorType) {
    setType(t);
    setStep('configure');
    setError('');
  }

  async function saveJira() {
    if (!jiraDomain.trim() || !jiraEmail.trim() || !jiraToken.trim()) {
      setError('All fields are required.'); return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: row, error: insertErr } = await supabase
        .from('user_connectors')
        .insert({
          connector_type: 'jira',
          display_name: jiraName.trim() || 'My Jira',
          config: { domain: jiraDomain.trim() },
          credentials: { domain: jiraDomain.trim(), email: jiraEmail.trim(), api_token: jiraToken.trim() },
          status: 'active',
        })
        .select()
        .single();
      if (insertErr) throw new Error(insertErr.message);

      // test immediately
      await invokeFunction('jira-proxy', { connector_id: row.id, action: 'test_connection', params: {} });
      await supabase.from('user_connectors').update({ last_synced_at: new Date().toISOString() }).eq('id', row.id);
      onAdded({ ...row, last_synced_at: new Date().toISOString() } as UserConnector);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to connect. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function saveSlack() {
    if (!slackToken.trim()) { setError('Bot token is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data: row, error: insertErr } = await supabase
        .from('user_connectors')
        .insert({
          connector_type: 'slack',
          display_name: slackName.trim() || 'My Slack',
          config: {},
          credentials: { bot_token: slackToken.trim() },
          status: 'active',
        })
        .select()
        .single();
      if (insertErr) throw new Error(insertErr.message);

      await invokeFunction('slack-proxy', { connector_id: row.id, action: 'test_connection', params: {} });
      await supabase.from('user_connectors').update({ last_synced_at: new Date().toISOString() }).eq('id', row.id);
      onAdded({ ...row, last_synced_at: new Date().toISOString() } as UserConnector);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to connect. Check your bot token.');
    } finally {
      setLoading(false);
    }
  }

  async function startGoogleOAuth() {
    if (!calClientId.trim()) { setError('Client ID is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const { codeVerifier, codeChallenge } = await generatePKCE();
      const state = btoa(crypto.getRandomValues(new Uint8Array(16)).join(''));

      // Save a placeholder connector row to update after OAuth completes
      const { data: row, error: insertErr } = await supabase
        .from('user_connectors')
        .insert({
          connector_type: 'google_calendar',
          display_name: calName.trim() || 'My Calendar',
          config: { calendar_id: 'primary' },
          credentials: { client_id: calClientId.trim() },
          status: 'disconnected',
        })
        .select()
        .single();
      if (insertErr) throw new Error(insertErr.message);

      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_code_verifier', codeVerifier);
      sessionStorage.setItem('oauth_client_id', calClientId.trim());
      sessionStorage.setItem('oauth_connector_id', row.id);

      const redirectUri = `${window.location.origin}/oauth/callback`;
      const params = new URLSearchParams({
        client_id: calClientId.trim(),
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar',
        access_type: 'offline',
        prompt: 'consent',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to initiate OAuth.');
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 'pick' ? 'Add Connector' : `Connect ${type ? CONNECTOR_META[type].name : ''}`}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {step === 'pick' && (
          <div className="modal-body">
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Select a service to connect.</p>
            {(['jira', 'slack', 'google_calendar'] as ConnectorType[]).map(t => {
              const meta = CONNECTOR_META[t];
              return (
                <button
                  key={t}
                  onClick={() => pickType(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    width: '100%', padding: '14px 16px',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                    background: 'var(--color-surface)', cursor: 'pointer',
                    transition: 'all 0.15s', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = meta.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <div className="connector-icon" style={{ background: meta.bg, color: meta.color }}>
                    {t === 'jira' ? 'J' : t === 'slack' ? 'S' : 'G'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{meta.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {t === 'jira' ? 'Requires API token from Atlassian'
                        : t === 'slack' ? 'Requires a Slack Bot Token'
                        : 'Requires a Google OAuth Client ID'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {step === 'configure' && type === 'jira' && (
          <>
            <div className="modal-body">
              {error && <div className="alert alert-error"><span>{error}</span></div>}
              <div className="form-group">
                <label className="form-label">Display name</label>
                <input className="form-input" value={jiraName} onChange={e => setJiraName(e.target.value)} placeholder="My Jira" />
              </div>
              <div className="form-group">
                <label className="form-label">Jira domain</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input className="form-input" value={jiraDomain} onChange={e => setJiraDomain(e.target.value)} placeholder="yourcompany" style={{ paddingRight: 160 }} />
                  <span style={{ position: 'absolute', right: 12, fontSize: 12, color: 'var(--color-text-muted)', pointerEvents: 'none' }}>.atlassian.net</span>
                </div>
                <span className="form-hint">The subdomain of your Atlassian workspace.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Account email</label>
                <input className="form-input" type="email" value={jiraEmail} onChange={e => setJiraEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <div className="form-group">
                <label className="form-label">API token</label>
                <input className="form-input" type="password" value={jiraToken} onChange={e => setJiraToken(e.target.value)} placeholder="Your Atlassian API token" />
                <span className="form-hint">Generate one at id.atlassian.com → Security → API tokens.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStep('pick')}>Back</button>
              <button className="btn btn-primary" onClick={saveJira} disabled={loading}>
                {loading ? <span className="spinner" /> : null} Connect Jira
              </button>
            </div>
          </>
        )}

        {step === 'configure' && type === 'slack' && (
          <>
            <div className="modal-body">
              {error && <div className="alert alert-error"><span>{error}</span></div>}
              <div className="form-group">
                <label className="form-label">Display name</label>
                <input className="form-input" value={slackName} onChange={e => setSlackName(e.target.value)} placeholder="My Slack" />
              </div>
              <div className="form-group">
                <label className="form-label">Bot token</label>
                <input className="form-input" type="password" value={slackToken} onChange={e => setSlackToken(e.target.value)} placeholder="xoxb-..." />
                <span className="form-hint">
                  Create a Slack app at api.slack.com → OAuth & Permissions. Add scopes: <code style={{ fontSize: 11, background: 'var(--color-surface-2)', padding: '1px 4px', borderRadius: 3 }}>channels:read channels:history chat:write users:read</code>. Install to workspace and copy the Bot User OAuth Token.
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStep('pick')}>Back</button>
              <button className="btn btn-primary" onClick={saveSlack} disabled={loading}>
                {loading ? <span className="spinner" /> : null} Connect Slack
              </button>
            </div>
          </>
        )}

        {step === 'configure' && type === 'google_calendar' && (
          <>
            <div className="modal-body">
              {error && <div className="alert alert-error"><span>{error}</span></div>}
              <div className="alert alert-info" style={{ fontSize: 12.5 }}>
                <div>
                  <strong>Setup:</strong> In Google Cloud Console, create a project, enable the Calendar API, then create an OAuth 2.0 Client ID of type <strong>Desktop app</strong>. Copy the Client ID below.
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Display name</label>
                <input className="form-input" value={calName} onChange={e => setCalName(e.target.value)} placeholder="My Calendar" />
              </div>
              <div className="form-group">
                <label className="form-label">Google OAuth Client ID</label>
                <input className="form-input" value={calClientId} onChange={e => setCalClientId(e.target.value)} placeholder="xxxxxx.apps.googleusercontent.com" />
                <span className="form-hint">You'll be redirected to Google to authorise access.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStep('pick')}>Back</button>
              <button className="btn btn-primary" onClick={startGoogleOAuth} disabled={loading}>
                {loading ? <span className="spinner" /> : null} Authorise with Google
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
