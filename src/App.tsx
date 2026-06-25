import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Expense, ExpenseInsert } from './lib/supabase'
import type { User } from '@supabase/supabase-js'
import AuthForm from './components/AuthForm'
import ExpenseList from './components/ExpenseList'
import ExpenseSummary from './components/ExpenseSummary'
import SkillsView from './components/SkillsView'

type Tab = 'expenses' | 'summary' | 'skills'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('expenses')
  const [globalError, setGlobalError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setExpenses([])
      return
    }
    fetchExpenses()
  }, [user])

  async function fetchExpenses() {
    setExpensesLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setGlobalError('Failed to load expenses.')
    } else {
      setExpenses(data as Expense[])
    }
    setExpensesLoading(false)
  }

  async function handleAdd(data: ExpenseInsert) {
    setGlobalError(null)
    const { data: created, error } = await supabase
      .from('expenses')
      .insert({ ...data, user_id: user!.id })
      .select()
      .single()

    if (error) throw new Error(error.message)
    setExpenses(prev => [created as Expense, ...prev])
  }

  async function handleUpdate(id: string, data: ExpenseInsert) {
    setGlobalError(null)
    const { data: updated, error } = await supabase
      .from('expenses')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    setExpenses(prev => prev.map(e => e.id === id ? updated as Expense : e))
  }

  async function handleDelete(id: string) {
    setGlobalError(null)
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) {
      setGlobalError('Failed to delete expense.')
      return
    }
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onAuth={() => {}} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '0 24px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>💰</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Expense Tracker</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              style={{
                padding: '6px 14px',
                borderRadius: 7,
                fontWeight: 500,
                fontSize: 13,
                background: 'var(--surface-2)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px' }}>
        {globalError && (
          <div style={{
            background: 'var(--danger-light)',
            border: '1px solid #fecaca',
            color: 'var(--danger)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }} role="alert">
            {globalError}
            <button onClick={() => setGlobalError(null)} style={{ background: 'none', color: 'inherit', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 4,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 4,
          marginBottom: 20,
        }}>
          {(['expenses', 'summary', 'skills'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '9px 0',
                borderRadius: 7,
                fontWeight: 500,
                fontSize: 13,
                transition: 'all 0.15s',
                background: activeTab === t ? 'var(--primary)' : 'transparent',
                color: activeTab === t ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {t === 'expenses' ? '📋 Expenses' : t === 'summary' ? '📊 Summary' : '🧠 Skills'}
            </button>
          ))}
        </div>

        {activeTab === 'skills' ? (
          <SkillsView />
        ) : expensesLoading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading expenses…</div>
        ) : (
          activeTab === 'expenses' ? (
            <ExpenseList
              expenses={expenses}
              onAdd={handleAdd}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ) : (
            <ExpenseSummary expenses={expenses} />
          )
        )}
      </main>
    </div>
  )
}
