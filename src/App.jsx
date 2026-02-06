import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { supabase, fetchHabits, addHabit as dbAddHabit, toggleHabit as dbToggleHabit, deleteHabit as dbDeleteHabit, fetchTodos, addTodo as dbAddTodo, toggleTodo as dbToggleTodo, deleteTodo as dbDeleteTodo, fetchHabitLogs, checkHabit, uncheckHabit, fetchDailyCounts } from './lib/supabase';
import { realtimeManager, optimisticUpdates, dataCache, connectionMonitor } from './lib/realtime';
import Analytics from './components/Analytics';
import Notifications from './components/Notifications';
import ResetPassword from './components/ResetPassword';
import { ConnectionStatus, ToastContainer, Button, LoadingSpinner, Card, ProgressBar, AnimatedCounter } from './components/UI';
import Auth from './Auth';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Calendar, 
  TrendingUp, 
  PieChart as PieIcon,
  Target,
  ClipboardList,
  Check,
  LogOut
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Tracker = ({ user }) => {
  // --- State Management ---
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [habits, setHabits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [isOnline, setIsOnline] = useState(connectionMonitor.getStatus());
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('habits'); // 'habits', 'analytics'
  const [pendingUpdates, setPendingUpdates] = useState(new Set());

  // --- Realtime Setup ---
  useEffect(() => {
    if (!user) return;

    const unsubscribeConnection = connectionMonitor.subscribe(setIsOnline);

    const unsubscribeHabits = realtimeManager.subscribeToHabits((payload) => {
      switch (payload.eventType) {
        case 'INSERT':
          setHabits(prev => [...prev, payload.new]);
          if (window.showToast) window.showToast('Habit synced across devices', 'success');
          break;
        case 'UPDATE':
          setHabits(prev => prev.map(h => h.id === payload.new.id ? payload.new : h));
          break;
        case 'DELETE':
          setHabits(prev => prev.filter(h => h.id !== payload.old.id));
          if (window.showToast) window.showToast('Habit deleted on another device', 'info');
          break;
      }
    }, user.id);

    const unsubscribeHabitLogs = realtimeManager.subscribeToHabitLogs((payload) => {
      switch (payload.eventType) {
        case 'INSERT':
          setHabitLogs(prev => [...prev, payload.new]);
          break;
        case 'DELETE':
          setHabitLogs(prev => prev.filter(log => 
            !(log.habit_id === payload.old.habit_id && log.log_date === payload.old.log_date)
          ));
          break;
      }
    }, user.id);

    const unsubscribeTodos = realtimeManager.subscribeToTodos((payload) => {
      switch (payload.eventType) {
        case 'INSERT':
          setTasks(prev => [...prev, {
            ...payload.new,
            name: payload.new.title || payload.new.name || ''
          }]);
          break;
        case 'UPDATE':
          setTasks(prev => prev.map(t => t.id === payload.new.id ? {
            ...payload.new,
            name: payload.new.title || payload.new.name || ''
          } : t));
          break;
        case 'DELETE':
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
          break;
      }
    }, user.id);

    return () => {
      unsubscribeConnection();
      unsubscribeHabits();
      unsubscribeHabitLogs();
      unsubscribeTodos();
    };
  }, [user]);

  // --- Data Loading with Caching ---
  const loadData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [year, month] = currentMonth.split('-').map(Number);
      const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      
      const cacheKey = `data-${user.id}-${currentMonth}`;
      const cachedData = dataCache.get(cacheKey);
      
      if (cachedData && isOnline) {
        setHabits(cachedData.habits || []);
        setTasks(cachedData.tasks || []);
        setHabitLogs(cachedData.habitLogs || []);
        setIsLoading(false);
        return;
      }
      
      const [habitsData, tasksData, habitLogsData] = await Promise.all([
        fetchHabits(),
        fetchTodos(),
        fetchHabitLogs(monthStart, monthEnd)
      ]);
      
      const processedHabits = habitsData || [];
      const processedHabitLogs = habitLogsData || [];
      const mappedTasks = (tasksData || []).map(task => ({
        ...task,
        name: task.title || task.name || ''
      }));
      
      setHabits(processedHabits);
      setHabitLogs(processedHabitLogs);
      setTasks(mappedTasks);
      
      dataCache.set(cacheKey, {
        habits: processedHabits,
        tasks: mappedTasks,
        habitLogs: processedHabitLogs
      });
      
      if (window.showToast && !cachedData) {
        window.showToast('Data loaded successfully', 'success');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      if (window.showToast) {
        window.showToast(
          isOnline ? 'Failed to load data. Please try again.' : 'Offline - using cached data',
          isOnline ? 'error' : 'warning'
        );
      }
      setHabits([]);
      setTasks([]);
      setHabitLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentMonth, isOnline]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- Helper Functions ---
  const getDaysInMonth = (yearMonth) => {
    const [year, month] = yearMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  const daysArray = useMemo(() => {
    const count = getDaysInMonth(currentMonth);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [currentMonth]);

  // --- Enhanced Action Handlers ---
  const addHabit = async () => {
    if (!newHabitName.trim()) return;
    if (newHabitName.length > 100) {
      if (window.showToast) window.showToast('Habit name must be 100 characters or less', 'error');
      return;
    }
    
    const tempId = `temp-${Date.now()}`;
    const tempHabit = { id: tempId, name: newHabitName, user_id: user.id };
    
    setHabits(prev => [...prev, tempHabit]);
    setPendingUpdates(prev => new Set([...prev, tempId]));
    
    try {
      const newHabit = await dbAddHabit(newHabitName);
      setHabits(prev => prev.map(h => h.id === tempId ? newHabit : h));
      setNewHabitName('');
      if (window.showToast) window.showToast('Habit added successfully', 'success');
    } catch (error) {
      console.error('Error adding habit:', error);
      setHabits(prev => prev.filter(h => h.id !== tempId));
      const errorMessage = error.message?.includes('Maximum of') 
        ? error.message 
        : 'Failed to add habit';
      if (window.showToast) window.showToast(errorMessage, 'error');
    } finally {
      setPendingUpdates(prev => { const next = new Set(prev); next.delete(tempId); return next; });
    }
  };

  const toggleHabit = async (habitId, day) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const logDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    const existingLog = habitLogs.find(log => 
      log.habit_id === habitId && log.log_date === logDate
    );
    
    const updateKey = `${habitId}-${logDate}`;
    setPendingUpdates(prev => new Set([...prev, updateKey]));
    
    if (existingLog) {
      setHabitLogs(prev => prev.filter(log => 
        !(log.habit_id === habitId && log.log_date === logDate)
      ));
      
      try {
        await uncheckHabit(habitId, logDate);
      } catch (error) {
        console.error('Error unchecking habit:', error);
        setHabitLogs(prev => [...prev, { habit_id: habitId, log_date: logDate }]);
        if (window.showToast) window.showToast('Failed to uncheck habit', 'error');
      }
    } else {
      setHabitLogs(prev => [...prev, { habit_id: habitId, log_date: logDate }]);
      
      try {
        await checkHabit(habitId, logDate);
      } catch (error) {
        console.error('Error checking habit:', error);
        setHabitLogs(prev => prev.filter(log => 
          !(log.habit_id === habitId && log.log_date === logDate)
        ));
        if (window.showToast) window.showToast('Failed to check habit', 'error');
      }
    }
    
    setPendingUpdates(prev => { const next = new Set(prev); next.delete(updateKey); return next; });
  };

  const deleteHabit = async (id) => {
    const habitToDelete = habits.find(h => h.id === id);
    if (!habitToDelete) return;
    
    setHabits(prev => prev.filter(h => h.id !== id));
    setPendingUpdates(prev => new Set([...prev, `delete-${id}`]));
    
    try {
      await dbDeleteHabit(id);
      if (window.showToast) window.showToast('Habit deleted', 'success');
    } catch (error) {
      console.error('Error deleting habit:', error);
      setHabits(prev => [...prev, habitToDelete]);
      if (window.showToast) window.showToast('Failed to delete habit', 'error');
    } finally {
      setPendingUpdates(prev => { const next = new Set(prev); next.delete(`delete-${id}`); return next; });
    }
  };

  const addTask = async () => {
    if (!newTaskName.trim()) return;
    if (newTaskName.length > 200) {
      if (window.showToast) window.showToast('Task name must be 200 characters or less', 'error');
      return;
    }
    
    const tempId = `temp-task-${Date.now()}`;
    const tempTask = { id: tempId, name: newTaskName, title: newTaskName, completed: false };
    
    setTasks(prev => [...prev, tempTask]);
    setPendingUpdates(prev => new Set([...prev, tempId]));
    
    try {
      const newTask = await dbAddTodo(newTaskName);
      const taskForUI = { ...newTask, name: newTask.title || newTask.name || newTaskName };
      setTasks(prev => prev.map(t => t.id === tempId ? taskForUI : t));
      setNewTaskName('');
      if (window.showToast) window.showToast('Task added successfully', 'success');
    } catch (error) {
      console.error('Error adding task:', error);
      if (isOnline) {
        setTasks(prev => prev.filter(t => t.id !== tempId));
        const errorMessage = error.message?.includes('Maximum of') 
          ? error.message 
          : 'Failed to add task';
        if (window.showToast) window.showToast(errorMessage, 'error');
      } else {
        if (window.showToast) window.showToast('Task saved locally - will sync when online', 'info');
        setNewTaskName('');
      }
    } finally {
      setPendingUpdates(prev => { const next = new Set(prev); next.delete(tempId); return next; });
    }
  };

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
    setPendingUpdates(prev => new Set([...prev, `task-${id}`]));
    
    try {
      await dbToggleTodo(id, task.completed);
    } catch (error) {
      console.error('Error toggling task:', error);
      setTasks(prev => prev.map(t => 
        t.id === id ? { ...t, completed: !t.completed } : t
      ));
      if (window.showToast) window.showToast('Failed to update task', 'error');
    } finally {
      setPendingUpdates(prev => { const next = new Set(prev); next.delete(`task-${id}`); return next; });
    }
  };

  const deleteTask = async (id) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;
    
    setTasks(prev => prev.filter(t => t.id !== id));
    setPendingUpdates(prev => new Set([...prev, `delete-task-${id}`]));
    
    try {
      await dbDeleteTodo(id);
      if (window.showToast) window.showToast('Task deleted', 'success');
    } catch (error) {
      console.error('Error deleting task:', error);
      setTasks(prev => [...prev, taskToDelete]);
      if (window.showToast) window.showToast('Failed to delete task', 'error');
    } finally {
      setPendingUpdates(prev => { const next = new Set(prev); next.delete(`delete-task-${id}`); return next; });
    }
  };

  // --- Calculations ---
  const getHabitProgress = (habit) => {
    if (!habit) return 0;
    const logsForHabit = habitLogs.filter(log => log.habit_id === habit.id);
    return Math.round((logsForHabit.length / daysArray.length) * 100);
  };
  
  // Helper function to check if habit is completed for a day
  const isHabitCompleted = (habitId, day) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const logDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return habitLogs.some(log => log.habit_id === habitId && log.log_date === logDate);
  };

  // ✅ STEP 1 — Compute Perfect Days From Existing Data
  const perfectDaysSet = useMemo(() => {
    if (!habits.length) return new Set();

    // Group logs by date
    const logsByDate = {};

    habitLogs.forEach(log => {
      if (!logsByDate[log.log_date]) {
        logsByDate[log.log_date] = new Set();
      }
      logsByDate[log.log_date].add(log.habit_id);
    });

    const perfectDays = new Set();

    Object.entries(logsByDate).forEach(([date, habitIds]) => {
      if (habitIds.size === habits.length) {
        perfectDays.add(date);
      }
    });

    return perfectDays;
  }, [habitLogs, habits]);

  // ✅ STEP 2 — Optimized Streak Calculation (No Extra Queries)
  const currentStreak = useMemo(() => {
    if (!perfectDaysSet.size) return 0;

    let streak = 0;
    let today = new Date();

    // OPTIONAL: if today not perfect, start from yesterday
    const todayStr = today.toISOString().split('T')[0];
    if (!perfectDaysSet.has(todayStr)) {
      today.setDate(today.getDate() - 1);
    }

    while (true) {
      const dateStr = today.toISOString().split('T')[0];

      if (perfectDaysSet.has(dateStr)) {
        streak++;
        today.setDate(today.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [perfectDaysSet]);

  // --- Chart Data Preparation ---
  const habitChartData = {
    labels: daysArray,
    datasets: [
      {
        label: 'Daily Habits Completed',
        data: daysArray.map(day => {
          const [year, month] = currentMonth.split('-').map(Number);
          const logDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          return habitLogs.filter(log => log.log_date === logDate).length;
        }),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5,
      }
    ]
  };

  const completedTasks = (tasks || []).filter(t => t && t.completed).length;
  const pendingTasks = (tasks || []).length - completedTasks;

  const taskPieData = {
    labels: ['Done', 'To Do'],
    datasets: [
      {
        data: tasks.length > 0 ? [completedTasks, pendingTasks] : [0, 1],
        backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(244, 244, 245, 1)'],
        borderColor: ['#22c55e', '#e4e4e7'],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw} habits completed`
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        ticks: { stepSize: 1, precision: 0 },
        grid: { color: 'rgba(0,0,0,0.03)' }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Enhanced Header with Mobile-First Layout */}
        <header className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Mobile Layout: App Title/Description on Left, Email/Streak on Right */}
          <div className="flex items-start justify-between p-6 gap-4">
            {/* Left Side: App Title + Description in Mobile-friendly Box */}
            <div className="flex-1 min-w-0">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Habit & Task Master</h1>
                <p className="text-slate-500 text-sm mt-1">
                  {isLoading 
                    ? 'Loading your progress...' 
                    : activeView === 'habits' 
                      ? 'Track daily habits with ease' 
                      : 'Deep insights into your habit journey'
                  }
                </p>
              </div>
            </div>
            
            {/* Right Side: Email + Streak Stack */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {/* Email */}
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">{user.email}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  {pendingUpdates.size > 0 && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <LoadingSpinner size="small" />
                      <span>Syncing...</span>
                    </div>
                  )}
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
              </div>
              
              {/* Streak */}
              {habits.length > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-3 text-right">
                  <p className="text-xs text-orange-600 font-bold">
                    🔥 <AnimatedCounter value={currentStreak} /> day{currentStreak !== 1 ? 's' : ''} streak
                  </p>
                </div>
              )}
              
              {/* Logout Button */}
              <Button 
                onClick={handleLogout}
                variant="secondary"
                size="small"
                className="p-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Desktop View Toggle + Notifications (Below on Mobile) */}
          <div className="border-t border-slate-100 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="bg-slate-100 p-1 rounded-lg flex">
              <button
                onClick={() => setActiveView('habits')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeView === 'habits' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Habits
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeView === 'analytics' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Analytics
              </button>
            </div>
            
            <Notifications habits={habits} />
          </div>
        </header>

        {/* Main Content Area */}
        {activeView === 'analytics' ? (
          <Analytics 
            habits={habits}
            habitLogs={habitLogs}
            perfectDaysSet={perfectDaysSet}
            currentStreak={currentStreak}
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            
            {/* Enhanced Habits Section */}
            <section className="xl:col-span-3 space-y-6">
              <Card className="overflow-hidden" loading={isLoading}>
                <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    Monthly Habit Grid
                    {habits.length > 0 && (
                      <span className="text-sm font-normal text-slate-500">
                        ({habits.length} habit{habits.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </h2>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="New habit..."
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addHabit()}
                      className="text-sm px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48 bg-slate-50"
                      disabled={isLoading}
                      maxLength="100"
                    />
                    <Button 
                      onClick={addHabit}
                      loading={pendingUpdates.has(`temp-${Date.now()}`)}
                      disabled={isLoading || !newHabitName.trim()}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="p-8">
                    <LoadingSpinner size="large" className="mx-auto mb-4" />
                    <p className="text-center text-slate-500">Loading your habits...</p>
                  </div>
                ) : habits.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50">
                    <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">Your habit grid is empty.</p>
                    <p className="text-slate-300 text-xs mt-1">Add a habit to see the full month calendar.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="sticky left-0 z-20 bg-white p-4 font-semibold text-slate-400 text-[10px] uppercase tracking-wider w-48 shadow-[2px_0_5px_rgba(0,0,0,0.02)] border-b border-slate-100">
                            Habit
                          </th>
                          {daysArray.map(day => (
                            <th key={day} className="p-2 font-bold text-slate-400 text-[10px] text-center w-8 border-l border-slate-100 border-b border-slate-100">
                              {day}
                            </th>
                          ))}
                          <th className="p-4 font-semibold text-slate-400 text-[10px] uppercase tracking-wider text-right w-24 border-b border-slate-100">
                            Progress
                          </th>
                          <th className="p-4 w-12 border-b border-slate-100"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {habits.map(habit => habit ? (
                          <tr key={habit.id} className={`group hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-0 ${
                            pendingUpdates.has(`delete-${habit.id}`) ? 'opacity-50' : ''
                          }`}>
                            <td className="sticky left-0 z-20 bg-white p-4 font-semibold text-slate-700 truncate shadow-[2px_0_5px_rgba(0,0,0,0.02)] group-hover:bg-blue-50/30 transition-colors">
                              <div className="flex items-center gap-2">
                                {habit.name}
                                {habit.id?.toString().startsWith('temp-') && (
                                  <LoadingSpinner size="small" className="text-blue-500" />
                                )}
                              </div>
                            </td>
                            {daysArray.map(day => {
                              const isCompleted = isHabitCompleted(habit.id, day);
                              const isPending = pendingUpdates.has(`${habit.id}-${currentMonth.split('-').map(Number)[0]}-${currentMonth.split('-').map(Number)[1].toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
                              
                              return (
                                <td key={day} className="p-1 border-l border-slate-100">
                                  <button
                                    onClick={() => toggleHabit(habit.id, day)}
                                    disabled={isPending || habit.id?.toString().startsWith('temp-')}
                                    className={`w-full aspect-square flex items-center justify-center rounded-sm transition-all border-2 relative
                                      ${isCompleted
                                        ? 'bg-blue-600 text-white border-blue-700' 
                                        : 'bg-white hover:bg-slate-100 text-transparent border-slate-400 hover:border-slate-500'
                                      } ${isPending ? 'opacity-50' : ''}`}
                                  >
                                    {isPending ? (
                                      <LoadingSpinner size="small" />
                                    ) : (
                                      <Check className={`w-3 h-3 ${isCompleted ? 'opacity-100' : 'opacity-0'}`} />
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="p-4 text-right">
                              <div className="flex flex-col items-end">
                                <AnimatedCounter 
                                  value={getHabitProgress(habit)} 
                                  className="text-[11px] font-bold text-blue-600"
                                />
                                <span className="text-[11px] text-blue-600">%</span>
                                <ProgressBar
                                  value={getHabitProgress(habit)}
                                  max={100}
                                  className="w-12 h-1 mt-1"
                                  color="blue"
                                  animate={pendingUpdates.size > 0}
                                />
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <Button
                                onClick={() => deleteHabit(habit.id)}
                                variant="secondary"
                                size="small"
                                loading={pendingUpdates.has(`delete-${habit.id}`)}
                                disabled={habit.id?.toString().startsWith('temp-')}
                                className="p-1 text-slate-400 hover:text-red-500 bg-transparent border-0 shadow-none"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ) : null)}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Enhanced Performance Chart */}
              {!isLoading && habits.length > 0 && (
                <Card>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Performance Over Time</h3>
                    </div>
                    <div className="h-64">
                      <Line data={habitChartData} options={chartOptions} />
                    </div>
                  </div>
                </Card>
              )}
            </section>

            {/* Enhanced To-Do List Section */}
            <section className="space-y-6">
              <Card className="h-full flex flex-col" loading={isLoading}>
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-emerald-500" />
                      To-Do List
                      {tasks.length > 0 && (
                        <span className="text-sm font-normal text-slate-500">
                          ({completedTasks}/{tasks.length})
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">One-off tasks for this month.</p>
                  </div>

                  <div className="flex gap-2 mb-6">
                    <input 
                      type="text" 
                      placeholder="New task..."
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTask()}
                      className="flex-1 text-sm px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 placeholder-slate-400"
                      disabled={isLoading}
                      maxLength="200"
                    />
                    <Button 
                      onClick={addTask}
                      variant="success"
                      loading={pendingUpdates.has(`temp-task-${Date.now()}`)}
                      disabled={isLoading || !newTaskName.trim()}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[400px] mb-6 pr-1 custom-scrollbar">
                    {isLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="animate-pulse flex items-center gap-3">
                              <div className="w-5 h-5 bg-slate-200 rounded-full" />
                              <div className="flex-1 h-4 bg-slate-200 rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : tasks.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">List is empty.</p>
                      </div>
                    ) : (
                      tasks.map(task => task ? (
                        <div 
                          key={task.id} 
                          className={`group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all ${
                            pendingUpdates.has(`task-${task.id}`) || pendingUpdates.has(`delete-task-${task.id}`) ? 'opacity-50' : ''
                          }`}
                        >
                          <button 
                            onClick={() => toggleTask(task.id)}
                            className="flex items-center gap-3 flex-1 text-left"
                            disabled={pendingUpdates.has(`task-${task.id}`) || task.id?.toString().startsWith('temp-task-')}
                          >
                            {pendingUpdates.has(`task-${task.id}`) ? (
                              <LoadingSpinner size="small" className="text-emerald-600" />
                            ) : task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shadow-sm rounded-full" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-slate-500 rounded-full group-hover:border-emerald-500 transition-colors bg-white" />
                            )}
                            <div className="flex items-center gap-2 flex-1">
                              <span className={`text-sm font-semibold transition-all ${
                                task.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                              }`}>
                                {task.name}
                              </span>
                              {task.id?.toString().startsWith('temp-task-') && (
                                <LoadingSpinner size="small" className="text-blue-500" />
                              )}
                            </div>
                          </button>
                          <Button
                            onClick={() => deleteTask(task.id)}
                            variant="secondary"
                            size="small"
                            loading={pendingUpdates.has(`delete-task-${task.id}`)}
                            disabled={task.id?.toString().startsWith('temp-task-')}
                            className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-transparent border-0 shadow-none"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : null)
                    )}
                  </div>

                  {/* Enhanced Task Stats with Animation */}
                  {!isLoading && (
                    <div className="pt-6 border-t border-slate-100 space-y-4">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <span className="flex items-center gap-2">
                          <PieIcon className="w-4 h-4" /> 
                          Completion
                        </span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">
                          <AnimatedCounter value={completedTasks} />/<AnimatedCounter value={tasks.length} />
                        </span>
                      </div>
                      
                      <div className="relative h-48 flex items-center justify-center">
                        <Pie 
                          data={taskPieData} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { 
                              legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } },
                              tooltip: { enabled: tasks.length > 0 }
                            },
                            cutout: '75%'
                          }} 
                        />
                        {tasks.length > 0 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
                            <AnimatedCounter 
                              value={Math.round((completedTasks / tasks.length) * 100)}
                              className="text-2xl font-black text-slate-700"
                            />
                            <span className="text-2xl font-black text-slate-700">%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </section>

          </div>
        )}

        {/* Global UI Components */}
        <ConnectionStatus isOnline={connectionMonitor?.isOnline} />
        <ToastContainer />
        
        {/* Personal Branding Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-full text-sm text-slate-600">
            <span className="text-blue-500">🚀</span>
            <span>Built by <span className="font-semibold text-slate-800">Guru</span> — Feedback welcome</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const MainApp = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading your habits...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!user ? <Auth /> : <Tracker user={user} />}
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
  );
};

export default App;