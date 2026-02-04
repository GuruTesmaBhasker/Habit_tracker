import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Get logged-in user
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user   // null if not logged in
}

// HABITS — DATABASE FUNCTIONS
// Fetch habits
export async function fetchHabits() {
  const { data, error } = await supabase
    .from('habits')
    .select('id, name')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// Add habit
export async function addHabit(name) {
  const { data, error } = await supabase
    .from('habits')
    .insert([
      {
        name,
        completed: false,
        date: new Date().toISOString().slice(0, 10),
        user_id: (await supabase.auth.getUser()).data.user?.id
      },
    ])
    .select()

  if (error) throw error
  return data[0]
}

// Toggle habit (check / uncheck)
export async function toggleHabit(id, completed) {
  const { error } = await supabase
    .from('habits')
    .update({ completed: !completed })
    .eq('id', id)

  if (error) throw error
}

// Delete habit
export async function deleteHabit(id) {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// HABIT LOGS — DATABASE FUNCTIONS
// Fetch habit logs for current month
export async function fetchHabitLogs(monthStart, monthEnd) {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('habit_id, log_date')
    .gte('log_date', monthStart)
    .lte('log_date', monthEnd)

  if (error) throw error
  return data
}

// Check a day (checkbox ON)
export async function checkHabit(habitId, date) {
  const { error } = await supabase
    .from('habit_logs')
    .upsert(
      { habit_id: habitId, log_date: date, completed: true },
      { onConflict: ['habit_id', 'log_date'] }
    )

  if (error) throw error
}

// Uncheck a day (checkbox OFF)
export async function uncheckHabit(habitId, date) {
  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habitId)
    .eq('log_date', date)

  if (error) throw error
}

// Graph data (daily performance)
export async function fetchDailyCounts(monthStart, monthEnd) {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('log_date')
    .gte('log_date', monthStart)
    .lte('log_date', monthEnd)

  if (error) throw error
  return data
}

// TODOS — DATABASE FUNCTIONS
// Fetch todos
export async function fetchTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// Add todo
export async function addTodo(title) {
  const { data, error } = await supabase
    .from('todos')
    .insert([{ 
      title, 
      completed: false,
      user_id: (await supabase.auth.getUser()).data.user?.id
    }])
    .select()

  if (error) throw error
  return data[0]
}

// Toggle todo
export async function toggleTodo(id, completed) {
  const { error } = await supabase
    .from('todos')
    .update({ completed: !completed })
    .eq('id', id)

  if (error) throw error
}

// Delete todo
export async function deleteTodo(id) {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)

  if (error) throw error
}

