import { useState } from 'react'
import type { Category, Expense, ExpenseInsert } from '../lib/supabase'

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'food', label: 'Food & Drink', icon: '🍽️' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'housing', label: 'Housing', icon: '🏠' },
  { value: 'health', label: 'Health', icon: '❤️' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'other', label: 'Other', icon: '📦' },
]

interface Props {
  expense?: Expense
  onSave: (data: ExpenseInsert) => Promise<void>
  onCancel: () => void
}

export default function ExpenseForm({ expense, onSave, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [category, setCategory] = useState<Category>(expense?.category ?? 'food')
  const [date, setDate] = useState(expense?.date ?? today)
  const [note, setNote] = useState(expense?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const errs: Record<string, string> = {}
    const parsedAmount = parseFloat(amount)
    if (!amount.trim()) errs.amount = 'Amount is required.'
    else if (isNaN(parsedAmount) || parsedAmount <= 0) errs.amount = 'Amount must be a positive number.'
    if (!date) errs.date = 'Date is required.'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setLoading(true)
    try {
      await onSave({
        amount: parseFloat(parseFloat(amount).toFixed(2)),
        category,
        date,
        note: note.trim() || null,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label htmlFor="amount" style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 13 }}>
            Amount ($)
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })) }}
            placeholder="0.00"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1.5px solid ${errors.amount ? 'var(--danger)' : 'var(--border)'}`,
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
            }}
            onFocus={e => { if (!errors.amount) e.target.style.borderColor = 'var(--primary)' }}
            onBlur={e => { if (!errors.amount) e.target.style.borderColor = 'var(--border)' }}
          />
          {errors.amount && (
            <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }} role="alert">{errors.amount}</p>
          )}
        </div>

        <div>
          <label htmlFor="category" style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 13 }}>
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={e => setCategory(e.target.value as Category)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1.5px solid var(--border)',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              background: 'var(--surface)',
              cursor: 'pointer',
            }}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date" style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 13 }}>
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setErrors(p => ({ ...p, date: '' })) }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1.5px solid ${errors.date ? 'var(--danger)' : 'var(--border)'}`,
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
            }}
            onFocus={e => { if (!errors.date) e.target.style.borderColor = 'var(--primary)' }}
            onBlur={e => { if (!errors.date) e.target.style.borderColor = 'var(--border)' }}
          />
          {errors.date && (
            <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }} role="alert">{errors.date}</p>
          )}
        </div>

        <div>
          <label htmlFor="note" style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 13 }}>
            Note <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id="note"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What was this for?"
            rows={2}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1.5px solid var(--border)',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              resize: 'vertical',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 13,
              background: 'var(--surface-2)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              background: loading ? '#93c5fd' : 'var(--primary)',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Saving…' : expense ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </div>
    </form>
  )
}

export { CATEGORIES }
