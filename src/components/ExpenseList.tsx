import { useState } from 'react'
import type { Expense, ExpenseInsert } from '../lib/supabase'
import ExpenseForm from './ExpenseForm'
import { CATEGORIES } from './ExpenseForm'

interface Props {
  expenses: Expense[]
  onAdd: (data: ExpenseInsert) => Promise<void>
  onUpdate: (id: string, data: ExpenseInsert) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function ExpenseList({ expenses, onAdd, onUpdate, onDelete }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const filtered = filterCategory === 'all'
    ? expenses
    : expenses.filter(e => e.category === filterCategory)

  const grouped = filtered.reduce<Record<string, Expense[]>>((acc, e) => {
    const month = e.date.slice(0, 7)
    if (!acc[month]) acc[month] = []
    acc[month].push(e)
    return acc
  }, {})

  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function formatMonth(m: string) {
    return new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  const catMap = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          aria-label="Filter by category"
          style={{
            padding: '8px 12px',
            border: '1.5px solid var(--border)',
            borderRadius: 8,
            fontSize: 13,
            outline: 'none',
            background: 'var(--surface)',
            cursor: 'pointer',
          }}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>

        <button
          onClick={() => { setShowAdd(true); setEditingId(null) }}
          style={{
            padding: '9px 18px',
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          + Add Expense
        </button>
      </div>

      {showAdd && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          boxShadow: 'var(--shadow)',
        }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>New Expense</h3>
          <ExpenseForm
            onSave={async data => { await onAdd(data); setShowAdd(false) }}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p>
          <p style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>No expenses yet</p>
          <p style={{ fontSize: 13 }}>Add your first expense to get started.</p>
        </div>
      ) : (
        months.map(month => (
          <div key={month}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {formatMonth(month)}
              </h3>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                ${grouped[month].reduce((s, e) => s + Number(e.amount), 0).toFixed(2)}
              </span>
            </div>

            <div style={{ display: 'grid', gap: 2 }}>
              {grouped[month].map(expense => (
                editingId === expense.id ? (
                  <div key={expense.id} style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--primary)',
                    borderRadius: 'var(--radius)',
                    padding: '20px',
                    boxShadow: 'var(--shadow)',
                  }}>
                    <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Edit Expense</h3>
                    <ExpenseForm
                      expense={expense}
                      onSave={async data => { await onUpdate(expense.id, data); setEditingId(null) }}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div
                    key={expense.id}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <span style={{ fontSize: 20 }}>{catMap[expense.category]?.icon ?? '📦'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>
                          {catMap[expense.category]?.label ?? expense.category}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                          ${Number(expense.amount).toFixed(2)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(expense.date)}</span>
                        {expense.note && (
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            · {expense.note}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => setEditingId(expense.id)}
                        aria-label={`Edit expense`}
                        style={{
                          width: 30, height: 30,
                          borderRadius: 6,
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          fontSize: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        disabled={deletingId === expense.id}
                        aria-label={`Delete expense`}
                        style={{
                          width: 30, height: 30,
                          borderRadius: 6,
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          fontSize: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.15s, color 0.15s',
                          cursor: deletingId === expense.id ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-light)'; e.currentTarget.style.color = 'var(--danger)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
