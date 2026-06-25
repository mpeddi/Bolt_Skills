import type { Expense } from '../lib/supabase'
import { CATEGORIES } from './ExpenseForm'

interface Props {
  expenses: Expense[]
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f97316',
  transport: '#3b82f6',
  housing: '#8b5cf6',
  health: '#ec4899',
  entertainment: '#f59e0b',
  shopping: '#10b981',
  other: '#6b7280',
}

export default function ExpenseSummary({ expenses }: Props) {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const byCategory = CATEGORIES.map(cat => {
    const catExpenses = expenses.filter(e => e.category === cat.value)
    const catTotal = catExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
    return { ...cat, total: catTotal, count: catExpenses.length }
  }).filter(c => c.count > 0)
    .sort((a, b) => b.total - a.total)

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthTotal = expenses
    .filter(e => e.date.startsWith(thisMonth))
    .reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{
          background: 'var(--primary)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          color: '#fff',
        }}>
          <p style={{ fontSize: 12, fontWeight: 500, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total
          </p>
          <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
            ${total.toFixed(2)}
          </p>
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
        }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            This Month
          </p>
          <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
            ${monthTotal.toFixed(2)}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {byCategory.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)' }}>
            BY CATEGORY
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {byCategory.map(cat => {
              const pct = total > 0 ? (cat.total / total) * 100 : 0
              return (
                <div key={cat.value}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.icon} {cat.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>${cat.total.toFixed(2)}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99 }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: CATEGORY_COLORS[cat.value],
                      borderRadius: 99,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
