import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { invokeFunction } from '../lib/supabase';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      navigate('/connectors?error=' + encodeURIComponent(error));
      return;
    }

    if (!code || !state) {
      navigate('/connectors');
      return;
    }

    handleCallback(code, state);
  }, []);

  async function handleCallback(code: string, state: string) {
    try {
      const stored = sessionStorage.getItem('oauth_state');
      const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
      const clientId = sessionStorage.getItem('oauth_client_id');
      const pendingConnectorId = sessionStorage.getItem('oauth_connector_id');

      if (!stored || stored !== state || !codeVerifier || !clientId) {
        navigate('/connectors?error=invalid_state');
        return;
      }

      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_code_verifier');
      sessionStorage.removeItem('oauth_client_id');
      sessionStorage.removeItem('oauth_connector_id');

      const redirectUri = `${window.location.origin}/oauth/callback`;

      const tokenData = await invokeFunction<{
        access_token?: string;
        refresh_token?: string;
        error?: string;
      }>('calendar-proxy', {
        action: 'exchange_code',
        params: { code, code_verifier: codeVerifier, client_id: clientId, redirect_uri: redirectUri },
      });

      if (!tokenData.refresh_token) {
        navigate('/connectors?error=no_refresh_token');
        return;
      }

      if (pendingConnectorId) {
        await supabase
          .from('user_connectors')
          .update({
            credentials: { client_id: clientId, refresh_token: tokenData.refresh_token, access_token: tokenData.access_token },
            status: 'active',
          })
          .eq('id', pendingConnectorId);
      }

      navigate('/connectors?success=google_calendar_connected');
    } catch {
      navigate('/connectors?error=exchange_failed');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', gap: 16 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Connecting Google Calendar…</p>
    </div>
  );
}
