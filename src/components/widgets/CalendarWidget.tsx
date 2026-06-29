import { useEffect, useState, useCallback } from 'react';
import { invokeFunction } from '../../lib/supabase';
import type { DashboardWidget, CalendarEvent } from '../../types';

interface Props {
  widget: DashboardWidget;
  onRemove: () => void;
}

function formatEventTime(event: CalendarEvent) {
  if (event.start.date) {
    return { time: 'All day', date: new Date(event.start.date + 'T00:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) };
  }
  if (event.start.dateTime) {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime!);
    const isToday = start.toDateString() === new Date().toDateString();
    return {
      time: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      date: isToday ? 'Today' : start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  }
  return { time: '', date: '' };
}

function isUpcoming(event: CalendarEvent) {
  const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date! + 'T00:00:00');
  return start >= new Date();
}

export default function CalendarWidget({ widget, onRemove }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  // Create event form
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState(new Date().toISOString().slice(0, 10));
  const [evStartTime, setEvStartTime] = useState('09:00');
  const [evEndTime, setEvEndTime] = useState('10:00');
  const [evDesc, setEvDesc] = useState('');
  const [evAllDay, setEvAllDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const call = useCallback((action: string, params = {}) =>
    invokeFunction('calendar-proxy', { connector_id: widget.connector_id, action, params }),
    [widget.connector_id]
  );

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const data = await call('get_events', { days_ahead: 7, maxResults: 20 }) as {
        items?: CalendarEvent[]; error?: string; message?: string;
      };
      if (data.error) throw new Error(data.error);
      setEvents((data.items ?? []).filter(isUpcoming));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }

  async function createEvent() {
    if (!evTitle.trim()) { setFormError('Title is required.'); return; }
    setSaving(true); setFormError('');
    try {
      const eventBody = evAllDay
        ? {
            summary: evTitle.trim(),
            description: evDesc.trim() || undefined,
            start: { date: evDate },
            end: { date: evDate },
          }
        : {
            summary: evTitle.trim(),
            description: evDesc.trim() || undefined,
            start: { dateTime: `${evDate}T${evStartTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            end: { dateTime: `${evDate}T${evEndTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          };

      await call('create_event', { event: eventBody });
      setEvTitle(''); setEvDesc(''); setEvAllDay(false);
      setCreating(false);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create event.');
    } finally {
      setSaving(false);
    }
  }

  function groupByDay(evs: CalendarEvent[]) {
    const groups: Record<string, CalendarEvent[]> = {};
    for (const ev of evs) {
      const dateStr = ev.start.dateTime
        ? new Date(ev.start.dateTime).toDateString()
        : ev.start.date ?? '';
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(ev);
    }
    return groups;
  }

  const grouped = groupByDay(events);
  const dayKeys = Object.keys(grouped);

  function dayLabel(key: string) {
    const d = new Date(key);
    const today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  }

  return (
    <div className={`widget-card widget-${widget.size}`}>
      <div className="widget-header">
        <div className="widget-header-left">
          <span className="widget-connector-badge" style={{ background: '#E8F0FE', color: '#1a73e8' }}>G</span>
          <span className="widget-title">{widget.title}</span>
        </div>
        <div className="widget-actions">
          {creating && (
            <button className="btn btn-ghost btn-icon btn-sm" title="Back" onClick={() => { setCreating(false); setFormError(''); }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/></svg>
            </button>
          )}
          {!creating && (
            <>
              <button className="btn btn-ghost btn-icon btn-sm" title="Refresh" onClick={load}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/></svg>
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setCreating(true); setFormError(''); }}>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                Event
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" title="Remove widget" onClick={onRemove}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="widget-body">
        {error && (
          <div className="alert alert-error" style={{ margin: 12, fontSize: 12.5 }}>
            <span>{error}</span>
            <button className="btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={load}>Retry</button>
          </div>
        )}

        {loading && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 44 }}>
                  <div className="skeleton" style={{ height: 10, borderRadius: 3 }} />
                  <div className="skeleton" style={{ height: 10, borderRadius: 3 }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div className="skeleton" style={{ height: 12, width: '65%', borderRadius: 3 }} />
                  <div className="skeleton" style={{ height: 10, width: '40%', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && !creating && (
          events.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="empty-state-title">No upcoming events this week</div>
            </div>
          ) : (
            <div className="event-list">
              {dayKeys.map(dayKey => (
                <div key={dayKey}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    padding: '8px 16px 4px',
                    background: 'var(--color-surface-2)',
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    {dayLabel(dayKey)}
                  </div>
                  {grouped[dayKey].map(ev => {
                    const { time, date: _date } = formatEventTime(ev);
                    return (
                      <div key={ev.id} className="event-item">
                        <div className="event-time-col">
                          <div className="event-time-dot" />
                          <div className="event-time-label">{time.split(' – ')[0]}</div>
                          {time.includes('–') && (
                            <div className="event-date-label">{time.split(' – ')[1]}</div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="event-title">{ev.summary}</div>
                          {ev.location && (
                            <div className="event-detail">
                              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'inline', marginRight: 3 }}><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                              {ev.location}
                            </div>
                          )}
                          {ev.attendees && ev.attendees.length > 0 && (
                            <div className="event-detail">
                              {ev.attendees.length} attendee{ev.attendees.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        <a
                          href={ev.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Open in Google Calendar"
                          style={{ flexShrink: 0 }}
                        >
                          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>
                        </a>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )
        )}

        {/* Create event form */}
        {creating && (
          <div className="inline-form" style={{ padding: 16, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>New event</div>
            {formError && <div className="form-error" style={{ marginBottom: 8 }}>{formError}</div>}
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Event title" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={evDate} onChange={e => setEvDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="allday"
                checked={evAllDay}
                onChange={e => setEvAllDay(e.target.checked)}
                style={{ width: 14, height: 14 }}
              />
              <label htmlFor="allday" className="form-label" style={{ cursor: 'pointer', marginBottom: 0 }}>All day</label>
            </div>
            {!evAllDay && (
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Start</label>
                  <input className="form-input" type="time" value={evStartTime} onChange={e => setEvStartTime(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">End</label>
                  <input className="form-input" type="time" value={evEndTime} onChange={e => setEvEndTime(e.target.value)} />
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Description <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
              <textarea className="form-input" rows={2} value={evDesc} onChange={e => setEvDesc(e.target.value)} placeholder="Notes…" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={createEvent} disabled={saving}>
                {saving ? <span className="spinner" /> : null} Create Event
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setCreating(false); setFormError(''); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
