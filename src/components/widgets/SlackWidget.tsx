import { useEffect, useState, useCallback, useRef } from 'react';
import { invokeFunction } from '../../lib/supabase';
import type { DashboardWidget, SlackMessage } from '../../types';

interface Props {
  widget: DashboardWidget;
  onRemove: () => void;
}

function formatSlackTs(ts: string) {
  const d = new Date(parseFloat(ts) * 1000);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function renderSlackText(text: string) {
  // Very basic Slack mrkdwn: bold, code, links
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\*(.+?)\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:var(--color-surface-2);padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '<a href="$1" target="_blank" rel="noreferrer" style="color:var(--color-primary)">$2</a>')
    .replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1" target="_blank" rel="noreferrer" style="color:var(--color-primary)">link</a>');
}

export default function SlackWidget({ widget, onRemove }: Props) {
  const channelId = (widget.config as { channel_id?: string }).channel_id;
  const channelName = (widget.config as { channel_name?: string }).channel_name ?? 'channel';
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composing, setComposing] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  const call = useCallback((action: string, params = {}) =>
    invokeFunction('slack-proxy', { connector_id: widget.connector_id, action, params }),
    [widget.connector_id]
  );

  useEffect(() => { load(); }, [channelId]);

  async function load() {
    if (!channelId) { setError('No channel configured.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const data = await call('get_messages', { channel_id: channelId, limit: 30 }) as {
        ok: boolean; messages?: SlackMessage[]; error?: string;
      };
      if (!data.ok) throw new Error(data.error || 'Failed to load messages.');
      setMessages((data.messages ?? []).slice().reverse());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, composing]);

  async function sendMessage() {
    if (!messageText.trim() || !channelId) return;
    setSending(true); setSendError('');
    try {
      const data = await call('post_message', { channel_id: channelId, text: messageText.trim() }) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || 'Failed to send message.');
      setMessageText('');
      setComposing(false);
      await load();
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : 'Failed to send.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`widget-card widget-${widget.size}`}>
      <div className="widget-header">
        <div className="widget-header-left">
          <span className="widget-connector-badge" style={{ background: '#F4EFF4', color: '#4A154B' }}>S</span>
          <span className="widget-title">{widget.title}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>#{channelName}</span>
        </div>
        <div className="widget-actions">
          <button className="btn btn-ghost btn-icon btn-sm" title="Refresh" onClick={load}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/></svg>
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" title="Remove widget" onClick={onRemove}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
          </button>
        </div>
      </div>

      <div className="widget-body" ref={bodyRef}>
        {error && (
          <div className="alert alert-error" style={{ margin: 12, fontSize: 12.5 }}>
            <span>{error}</span>
            <button className="btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={load}>Retry</button>
          </div>
        )}
        {loading && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 11, width: '40%', borderRadius: 3 }} />
                  <div className="skeleton" style={{ height: 11, width: '75%', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <div className="empty-state-title">No recent messages</div>
          </div>
        )}
        {!loading && !error && (
          <div className="message-list">
            {messages.map(msg => (
              <div key={msg.ts} className="message-item">
                <div className="message-avatar">{initials(msg.user_name || 'U')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
                    <span className="message-user">{msg.user_name}</span>
                    <span className="message-time">{formatSlackTs(msg.ts)}</span>
                  </div>
                  <div
                    className="message-text"
                    dangerouslySetInnerHTML={{ __html: renderSlackText(msg.text || '') }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="widget-footer">
        {composing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sendError && <div className="form-error" style={{ fontSize: 12 }}>{sendError}</div>}
            <textarea
              className="form-input"
              rows={2}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${channelName} (Enter to send, Shift+Enter for newline)`}
              style={{ resize: 'none', fontSize: 13 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setComposing(false); setMessageText(''); setSendError(''); }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={sendMessage} disabled={sending || !messageText.trim()}>
                {sending ? <span className="spinner" /> : (
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                )}
                Send
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-secondary btn-sm w-full"
            style={{ justifyContent: 'center', fontSize: 13 }}
            onClick={() => setComposing(true)}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/></svg>
            Post a message
          </button>
        )}
      </div>
    </div>
  );
}
