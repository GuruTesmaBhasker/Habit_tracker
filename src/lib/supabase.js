import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.includes('your_actual') || supabaseAnonKey.length < 100) {
  console.error('❌ Missing or invalid Supabase configuration!')
  console.log('📋 To fix this:')
  console.log('1. Go to https://supabase.com/dashboard')
  console.log('2. Create a new project or select existing one')
  console.log('3. Go to Settings → API')
  console.log('4. Copy your Project URL and anon public key to .env file')
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Get logged-in user
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user   // null if not logged in
}

// HABITS — DATABASE FUNCTIONS
// Fetch habits
export async function fetchHabits() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('habits')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// Add habit
export async function addHabit(name) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // Check if user has too many habits (performance limit)
  const { count } = await supabase
    .from('habits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
  
  if (count >= 100) {
    throw new Error('Maximum of 100 habits allowed. Please delete some before adding new ones.')
  }
  
  const { data, error } = await supabase
    .from('habits')
    .insert([
      {
        name,
        completed: false,
        date: new Date().toISOString().slice(0, 10),
        user_id: user.id
      },
    ])
    .select()

  if (error) throw error
  return data[0]
}

// Toggle habit (check / uncheck)
export async function toggleHabit(id, completed) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { error } = await supabase
    .from('habits')
    .update({ completed: !completed })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

// Delete habit
export async function deleteHabit(id) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

// HABIT LOGS — DATABASE FUNCTIONS
// Fetch habit logs for current month
export async function fetchHabitLogs(monthStart, monthEnd) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('habit_logs')
    .select('habit_id, log_date, habits!inner(user_id)')
    .eq('habits.user_id', user.id)
    .gte('log_date', monthStart)
    .lte('log_date', monthEnd)

  if (error) throw error
  return data
}

// Check a day (checkbox ON)
export async function checkHabit(habitId, date) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // First verify the habit belongs to the user
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single()
    
  if (habitError || !habit) throw new Error('Habit not found or access denied')
  
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // First verify the habit belongs to the user
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single()
    
  if (habitError || !habit) throw new Error('Habit not found or access denied')
  
  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habitId)
    .eq('log_date', date)

  if (error) throw error
}

// Graph data (daily performance)
export async function fetchDailyCounts(monthStart, monthEnd) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('habit_logs')
    .select('log_date, habits!inner(user_id)')
    .eq('habits.user_id', user.id)
    .gte('log_date', monthStart)
    .lte('log_date', monthEnd)

  if (error) throw error
  return data
}

// TODOS — DATABASE FUNCTIONS
// Fetch todos
export async function fetchTodos() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// Add todo
export async function addTodo(title) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // Check if user has too many todos (performance limit)
  const { count } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
  
  if (count >= 200) {
    throw new Error('Maximum of 200 tasks allowed. Please complete or delete some before adding new ones.')
  }
  
  const { data, error } = await supabase
    .from('todos')
    .insert([{ 
      title, 
      completed: false,
      user_id: user.id
    }])
    .select()

  if (error) throw error
  return data[0]
}

// Toggle todo
export async function toggleTodo(id, completed) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { error } = await supabase
    .from('todos')
    .update({ completed: !completed })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

// Delete todo
export async function deleteTodo(id) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

