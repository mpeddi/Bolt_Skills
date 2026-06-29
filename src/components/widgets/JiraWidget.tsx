import { useEffect, useState, useCallback } from 'react';
import { invokeFunction } from '../../lib/supabase';
import type { DashboardWidget, JiraIssue, JiraProject } from '../../types';

interface Props {
  widget: DashboardWidget;
  onRemove: () => void;
}

type PanelMode = 'list' | 'create' | 'comment' | 'transition';

function statusColor(cat: string) {
  if (cat === 'done') return { bg: '#d1fae5', color: '#065f46' };
  if (cat === 'inprogress') return { bg: '#dbeafe', color: '#1e40af' };
  return { bg: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' };
}

function priorityColor(name: string) {
  if (name === 'Highest' || name === 'High') return '#ef4444';
  if (name === 'Medium') return '#f59e0b';
  return '#94a3b8';
}

export default function JiraWidget({ widget, onRemove }: Props) {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [panelMode, setPanelMode] = useState<PanelMode>('list');
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);
  const [transitions, setTransitions] = useState<Array<{ id: string; name: string }>>([]);

  // Create form
  const [newSummary, setNewSummary] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newType, setNewType] = useState('Task');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Comment form
  const [comment, setComment] = useState('');

  const call = useCallback((action: string, params = {}) =>
    invokeFunction('jira-proxy', { connector_id: widget.connector_id, action, params }),
    [widget.connector_id]
  );

  useEffect(() => {
    load();
    call('get_projects').then((d: unknown) => {
      const data = d as JiraProject[] | { values?: JiraProject[] };
      if (Array.isArray(data)) setProjects(data);
      else if (data && typeof data === 'object' && 'values' in data && Array.isArray((data as { values: JiraProject[] }).values)) setProjects((data as { values: JiraProject[] }).values);
    }).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await call('get_issues') as { issues?: JiraIssue[]; errorMessages?: string[] };
      if (data.errorMessages?.length) throw new Error(data.errorMessages[0]);
      setIssues(data.issues ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load issues.');
    } finally {
      setLoading(false);
    }
  }

  async function createIssue() {
    if (!newSummary.trim()) { setFormError('Summary is required.'); return; }
    if (!newProject) { setFormError('Project is required.'); return; }
    setSaving(true); setFormError('');
    try {
      await call('create_issue', {
        issue: {
          fields: {
            project: { key: newProject },
            summary: newSummary.trim(),
            issuetype: { name: newType },
            ...(newDesc.trim() ? { description: {
              type: 'doc', version: 1,
              content: [{ type: 'paragraph', content: [{ type: 'text', text: newDesc.trim() }] }],
            } } : {}),
          },
        },
      });
      setNewSummary(''); setNewProject(''); setNewDesc(''); setNewType('Task');
      setPanelMode('list');
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create issue.');
    } finally {
      setSaving(false);
    }
  }

  async function openTransitions(issue: JiraIssue) {
    setSelectedIssue(issue);
    setPanelMode('transition');
    const data = await call('get_transitions', { issueKey: issue.key }) as { transitions?: Array<{ id: string; name: string }> };
    setTransitions(data.transitions ?? []);
  }

  async function applyTransition(transitionId: string) {
    if (!selectedIssue) return;
    setSaving(true);
    try {
      await call('transition_issue', { issueKey: selectedIssue.key, transitionId });
      setPanelMode('list');
      setSelectedIssue(null);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Transition failed.');
    } finally {
      setSaving(false);
    }
  }

  async function submitComment() {
    if (!comment.trim() || !selectedIssue) return;
    setSaving(true); setFormError('');
    try {
      await call('add_comment', { issueKey: selectedIssue.key, comment: comment.trim() });
      setComment(''); setPanelMode('list'); setSelectedIssue(null);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to add comment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`widget-card widget-${widget.size}`}>
      <div className="widget-header">
        <div className="widget-header-left">
          <span className="widget-connector-badge" style={{ background: '#E6F0FF', color: '#0052CC' }}>J</span>
          <span className="widget-title">{widget.title}</span>
        </div>
        <div className="widget-actions">
          {panelMode !== 'list' && (
            <button className="btn btn-ghost btn-icon btn-sm" title="Back to list" onClick={() => { setPanelMode('list'); setSelectedIssue(null); setFormError(''); }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/></svg>
            </button>
          )}
          {panelMode === 'list' && (
            <>
              <button className="btn btn-ghost btn-icon btn-sm" title="Refresh" onClick={load}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/></svg>
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setPanelMode('create'); setFormError(''); }}>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                New
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" title="Remove widget" onClick={onRemove}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="widget-body">
        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ margin: 12, fontSize: 12.5 }}>
            <span>{error}</span>
            <button className="btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={load}>Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div className="skeleton" style={{ width: 60, height: 12, borderRadius: 3, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 12, borderRadius: 3, width: '80%' }} />
                  <div className="skeleton" style={{ height: 10, borderRadius: 3, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Issue list */}
        {!loading && !error && panelMode === 'list' && (
          issues.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="empty-state-title">No open issues assigned to you</div>
            </div>
          ) : (
            <div className="issue-list">
              {issues.map(issue => {
                const cat = issue.fields.status.statusCategory.colorName;
                const sc = statusColor(cat);
                return (
                  <div key={issue.id} className="issue-item">
                    <span className="issue-key">{issue.key}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="issue-summary">{issue.fields.summary}</div>
                      <div className="issue-meta">
                        <span className="issue-status" style={{ background: sc.bg, color: sc.color }}>
                          {issue.fields.status.name}
                        </span>
                        {issue.fields.priority && (
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: priorityColor(issue.fields.priority.name), display: 'inline-block', flexShrink: 0 }} title={issue.fields.priority.name} />
                        )}
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{issue.fields.project.key}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 4 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11, padding: '2px 7px' }}
                        title="Update status"
                        onClick={() => openTransitions(issue)}
                      >
                        Status
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11, padding: '2px 7px' }}
                        title="Add comment"
                        onClick={() => { setSelectedIssue(issue); setPanelMode('comment'); setFormError(''); }}
                      >
                        Comment
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Create issue form */}
        {panelMode === 'create' && (
          <div className="inline-form" style={{ padding: 16, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Create new issue</div>
            {formError && <div className="form-error">{formError}</div>}
            <div className="form-group">
              <label className="form-label">Project</label>
              <select className="form-input" value={newProject} onChange={e => setNewProject(e.target.value)}>
                <option value="">Select project…</option>
                {projects.map(p => <option key={p.id} value={p.key}>{p.name} ({p.key})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Issue type</label>
              <select className="form-input" value={newType} onChange={e => setNewType(e.target.value)}>
                {['Task', 'Bug', 'Story', 'Epic'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Summary</label>
              <input className="form-input" value={newSummary} onChange={e => setNewSummary(e.target.value)} placeholder="Brief description of the issue" />
            </div>
            <div className="form-group">
              <label className="form-label">Description <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
              <textarea className="form-input" rows={3} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="More details…" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={createIssue} disabled={saving}>
                {saving ? <span className="spinner" /> : null} Create Issue
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setPanelMode('list'); setFormError(''); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Transition panel */}
        {panelMode === 'transition' && selectedIssue && (
          <div className="inline-form" style={{ padding: 16, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              Update status — <span style={{ color: 'var(--color-primary)' }}>{selectedIssue.key}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 12 }}>{selectedIssue.fields.summary}</div>
            {formError && <div className="form-error" style={{ marginBottom: 8 }}>{formError}</div>}
            {transitions.length === 0 ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}><div className="spinner" />Loading…</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {transitions.map(t => (
                  <button key={t.id} className="btn btn-secondary btn-sm" disabled={saving} onClick={() => applyTransition(t.id)}>
                    {saving ? <span className="spinner" /> : null} {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comment panel */}
        {panelMode === 'comment' && selectedIssue && (
          <div className="inline-form" style={{ padding: 16, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              Comment on <span style={{ color: 'var(--color-primary)' }}>{selectedIssue.key}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 10 }}>{selectedIssue.fields.summary}</div>
            {formError && <div className="form-error" style={{ marginBottom: 8 }}>{formError}</div>}
            <textarea
              className="form-input"
              rows={4}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Write a comment…"
              style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-primary btn-sm" onClick={submitComment} disabled={saving || !comment.trim()}>
                {saving ? <span className="spinner" /> : null} Post Comment
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setPanelMode('list'); setSelectedIssue(null); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
