import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface BoltSkill {
  id: string
  slug: string
  name: string
  description: string
  content: string
  created_at: string
  updated_at: string
}

export type Category = 'food' | 'transport' | 'housing' | 'health' | 'entertainment' | 'shopping' | 'other'

export interface Expense {
  id: string
  user_id: string
  amount: number
  category: Category
  date: string
  note: string | null
  created_at: string
  updated_at: string
}

export type ExpenseInsert = Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>
