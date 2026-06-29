import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { DashboardWidget } from '../types';
import JiraWidget from '../components/widgets/JiraWidget';
import SlackWidget from '../components/widgets/SlackWidget';
import CalendarWidget from '../components/widgets/CalendarWidget';

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWidgets();
  }, []);

  async function loadWidgets() {
    setLoading(true);
    const { data, error } = await supabase
      .from('dashboard_widgets')
      .select('*, connector:user_connectors(*)')
      .order('position', { ascending: true });

    if (!error && data) setWidgets(data as DashboardWidget[]);
    setLoading(false);
  }

  async function removeWidget(id: string) {
    await supabase.from('dashboard_widgets').delete().eq('id', id);
    setWidgets(prev => prev.filter(w => w.id !== id));
  }

  function renderWidget(widget: DashboardWidget) {
    const props = { widget, onRemove: () => removeWidget(widget.id) };
    switch (widget.widget_type) {
      case 'jira_my_issues': return <JiraWidget key={widget.id} {...props} />;
      case 'slack_channel':  return <SlackWidget key={widget.id} {...props} />;
      case 'calendar_agenda': return <CalendarWidget key={widget.id} {...props} />;
      default: return null;
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-header-title">My Dashboard</h1>
        <Link to="/add-widgets" className="btn btn-primary btn-sm">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Widget
        </Link>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="widget-grid">
            {[1, 2, 3].map(n => (
              <div key={n} className="widget-card">
                <div className="widget-header">
                  <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 4 }} />
                </div>
                <div className="widget-body" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} className="skeleton" style={{ height: 14, borderRadius: 4, width: `${70 + i * 5}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : widgets.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 80 }}>
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            <div className="empty-state-title">Your dashboard is empty</div>
            <div className="empty-state-desc">Connect services and add widgets to build your personalised workspace.</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Link to="/connectors" className="btn btn-secondary btn-sm">Connect a service</Link>
              <Link to="/add-widgets" className="btn btn-primary btn-sm">Add widgets</Link>
            </div>
          </div>
        ) : (
          <div className="widget-grid">
            {widgets.map(renderWidget)}
          </div>
        )}
      </div>
    </>
  );
}
