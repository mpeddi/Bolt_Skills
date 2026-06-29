import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { UserConnector, WidgetDefinition } from '../types';
import { WIDGET_DEFINITIONS, CONNECTOR_META } from '../types';

interface WidgetConfig {
  channelId?: string;
  channelName?: string;
}

export default function AddWidgetsPage() {
  const [connectors, setConnectors] = useState<UserConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<{ def: WidgetDefinition; connector: UserConnector } | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({});
  const [slackChannels, setSlackChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadConnectors(); }, []);

  async function loadConnectors() {
    setLoading(true);
    const { data } = await supabase
      .from('user_connectors')
      .select('*')
      .eq('status', 'active');
    if (data) setConnectors(data as UserConnector[]);
    setLoading(false);
  }

  async function loadSlackChannels(connectorId: string) {
    setChannelsLoading(true);
    const { data } = await supabase.functions.invoke('slack-proxy', {
      body: { connector_id: connectorId, action: 'list_channels', params: {} },
    });
    if (data?.channels) {
      setSlackChannels(data.channels.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    }
    setChannelsLoading(false);
  }

  function openConfig(def: WidgetDefinition, connector: UserConnector) {
    setConfiguring({ def, connector });
    setWidgetConfig({});
    if (def.type === 'slack_channel') {
      loadSlackChannels(connector.id);
    }
  }

  async function addWidget(def: WidgetDefinition, connector: UserConnector) {
    if (def.requires_config) {
      openConfig(def, connector);
      return;
    }
    await doAddWidget(def, connector, {});
  }

  async function doAddWidget(def: WidgetDefinition, connector: UserConnector, config: Record<string, unknown>) {
    setAdding(def.type + connector.id);
    const { data: existing } = await supabase
      .from('dashboard_widgets')
      .select('position')
      .order('position', { ascending: false })
      .limit(1);
    const nextPos = existing && existing.length > 0 ? (existing[0].position + 1) : 0;

    await supabase.from('dashboard_widgets').insert({
      connector_id: connector.id,
      widget_type: def.type,
      title: def.default_title,
      config,
      position: nextPos,
      size: def.default_size,
    });
    setAdding(null);
    setConfiguring(null);
    navigate('/');
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-header-title">Add Widgets</h1>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
            <div className="spinner" />Loading…
          </div>
        ) : connectors.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <div className="empty-state-title">No active connectors</div>
            <div className="empty-state-desc">Connect a service first before adding widgets.</div>
            <a href="/connectors" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Go to Connectors</a>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
              Choose widgets to add to your dashboard. Widgets pull live data from your connected services.
            </p>

            {WIDGET_DEFINITIONS.map(def => {
              const matchingConnectors = connectors.filter(c => c.connector_type === def.connector_type);
              if (matchingConnectors.length === 0) return null;
              const meta = CONNECTOR_META[def.connector_type];

              return (
                <div key={def.type} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div className="connector-icon" style={{ background: meta.bg, color: meta.color, width: 28, height: 28, fontSize: 13 }}>
                      {def.connector_type === 'jira' ? 'J' : def.connector_type === 'slack' ? 'S' : 'G'}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{def.name}</span>
                    <span className="badge badge-neutral">{meta.name}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12, maxWidth: 520 }}>{def.description}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {matchingConnectors.map(connector => (
                      <button
                        key={connector.id}
                        className="btn btn-secondary"
                        style={{ fontSize: 13 }}
                        disabled={adding === def.type + connector.id}
                        onClick={() => addWidget(def, connector)}
                      >
                        {adding === def.type + connector.id ? <span className="spinner" /> : (
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        Add from {connector.display_name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Slack channel config modal */}
      {configuring && configuring.def.type === 'slack_channel' && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Configure Slack Widget</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setConfiguring(null)}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Select a channel</label>
                {channelsLoading ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                    <div className="spinner" />Loading channels…
                  </div>
                ) : (
                  <select
                    className="form-input"
                    value={widgetConfig.channelId ?? ''}
                    onChange={e => {
                      const ch = slackChannels.find(c => c.id === e.target.value);
                      setWidgetConfig({ channelId: e.target.value, channelName: ch?.name });
                    }}
                  >
                    <option value="">Choose a channel…</option>
                    {slackChannels.map(ch => (
                      <option key={ch.id} value={ch.id}>#{ch.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfiguring(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!widgetConfig.channelId || adding !== null}
                onClick={() => doAddWidget(
                  configuring.def,
                  configuring.connector,
                  { channel_id: widgetConfig.channelId, channel_name: widgetConfig.channelName }
                )}
              >
                {adding ? <span className="spinner" /> : null}
                Add Widget
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
