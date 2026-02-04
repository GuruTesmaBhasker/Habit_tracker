import React, { useState, useEffect, useMemo } from 'react';
import { supabase, fetchHabits, addHabit as dbAddHabit, toggleHabit as dbToggleHabit, deleteHabit as dbDeleteHabit, fetchTodos, addTodo as dbAddTodo, toggleTodo as dbToggleTodo, deleteTodo as dbDeleteTodo, fetchHabitLogs, checkHabit, uncheckHabit, fetchDailyCounts } from './lib/supabase';
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
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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

  // --- Data Loading ---
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, currentMonth]);

  const loadData = async () => {
    try {
      const [year, month] = currentMonth.split('-').map(Number);
      const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      
      const [habitsData, tasksData, habitLogsData] = await Promise.all([
        fetchHabits(),
        fetchTodos(),
        fetchHabitLogs(monthStart, monthEnd)
      ]);
      setHabits(habitsData || []);
      setHabitLogs(habitLogsData || []);
      // Map database fields to UI fields for tasks
      const mappedTasks = (tasksData || []).map(task => ({
        ...task,
        name: task.title || task.name || ''
      }));
      setTasks(mappedTasks);
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty arrays on error
      setHabits([]);
      setTasks([]);
      setHabitLogs([]);
    }
  };

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

  // --- Action Handlers ---
  const addHabit = async () => {
    if (!newHabitName.trim()) return;
    try {
      const newHabit = await dbAddHabit(newHabitName);
      setHabits([...(habits || []), newHabit]);
      setNewHabitName('');
    } catch (error) {
      console.error('Error adding habit:', error);
    }
  };

  const toggleHabit = async (habitId, day) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const logDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    // Check if log exists
    const existingLog = habitLogs.find(log => 
      log.habit_id === habitId && log.log_date === logDate
    );
    
    if (existingLog) {
      // OPTIMISTIC UPDATE: Remove from UI immediately
      setHabitLogs(habitLogs.filter(log => 
        !(log.habit_id === habitId && log.log_date === logDate)
      ));
      
      // Sync with database in background
      try {
        await uncheckHabit(habitId, logDate);
      } catch (error) {
        console.error('Error unchecking habit:', error);
        // Revert UI on error
        setHabitLogs([...habitLogs, { habit_id: habitId, log_date: logDate }]);
      }
    } else {
      // OPTIMISTIC UPDATE: Add to UI immediately
      setHabitLogs([...habitLogs, { habit_id: habitId, log_date: logDate }]);
      
      // Sync with database in background
      try {
        await checkHabit(habitId, logDate);
      } catch (error) {
        console.error('Error checking habit:', error);
        // Revert UI on error
        setHabitLogs(habitLogs.filter(log => 
          !(log.habit_id === habitId && log.log_date === logDate)
        ));
      }
    }
  };

  const deleteHabit = async (id) => {
    try {
      await dbDeleteHabit(id);
      setHabits((habits || []).filter(h => h && h.id !== id));
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const addTask = async () => {
    if (!newTaskName.trim()) return;
    try {
      const newTask = await dbAddTodo(newTaskName);
      // Map database fields to UI fields
      const taskForUI = {
        ...newTask,
        name: newTask.title || newTask.name || newTaskName
      };
      setTasks([...(tasks || []), taskForUI]);
      setNewTaskName('');
    } catch (error) {
      console.error('Error adding task:', error);
      // Fallback: add locally if database fails
      const fallbackTask = {
        id: Date.now(),
        name: newTaskName,
        title: newTaskName,
        completed: false
      };
      setTasks([...(tasks || []), fallbackTask]);
      setNewTaskName('');
    }
  };

  const toggleTask = async (id) => {
    try {
      const task = (tasks || []).find(t => t && t.id === id);
      if (task) {
        await dbToggleTodo(id, task.completed);
        setTasks((tasks || []).map(t => t && t.id === id ? { ...t, completed: !t.completed } : t));
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const deleteTask = async (id) => {
    try {
      await dbDeleteTodo(id);
      setTasks((tasks || []).filter(t => t && t.id !== id));
    } catch (error) {
      console.error('Error deleting task:', error);
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
        
        {/* Header & Month Selector */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Habit & Task Master</h1>
            <p className="text-slate-500 text-sm">Logging progress for the full month grid.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700">{user.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-all shadow-sm active:scale-95"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Habits Section - Now takes more width for the grid */}
          <section className="xl:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  Monthly Habit Grid
                </h2>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="New habit..."
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addHabit()}
                    className="text-sm px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48 bg-slate-50"
                  />
                  <button 
                    onClick={addHabit}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {habits.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50">
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
                          Score
                        </th>
                        <th className="p-4 w-12 border-b border-slate-100"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(habits || []).map(habit => habit ? (
                        <tr key={habit.id} className="group hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-0">
                          <td className="sticky left-0 z-20 bg-white p-4 font-semibold text-slate-700 truncate shadow-[2px_0_5px_rgba(0,0,0,0.02)] group-hover:bg-blue-50/30 transition-colors">
                            {habit.name}
                          </td>
                          {daysArray.map(day => (
                            <td key={day} className="p-1 border-l border-slate-100">
                              <button
                                onClick={() => toggleHabit(habit.id, day)}
                                className={`w-full aspect-square flex items-center justify-center rounded-sm transition-all border-2
                                  ${isHabitCompleted(habit.id, day)
                                    ? 'bg-blue-600 text-white border-blue-700' 
                                    : 'bg-white hover:bg-slate-100 text-transparent border-slate-400'}`}
                              >
                                <Check className={`w-3 h-3 ${isHabitCompleted(habit.id, day) ? 'opacity-100' : 'opacity-0'}`} />
                              </button>
                            </td>
                          ))}
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-[11px] font-bold text-blue-600">{getHabitProgress(habit)}%</span>
                              <div className="w-12 h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500" 
                                  style={{ width: `${getHabitProgress(habit)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => deleteHabit(habit.id)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ) : null)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Habit Visual Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Performance Over Time</h3>
              </div>
              <div className="h-64">
                <Line data={habitChartData} options={chartOptions} />
              </div>
            </div>
          </section>

          {/* To-Do List Section */}
          <section className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
              <div className="mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-emerald-500" />
                  To-Do List
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
                />
                <button 
                  onClick={addTask}
                  className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto max-h-[400px] mb-6 pr-1 custom-scrollbar">
                {tasks.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm">List is empty.</p>
                  </div>
                                ) : (
                  (tasks || []).map(task => task ? (
                    <div 
                      key={task.id} 
                      className="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all"
                    >
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shadow-sm rounded-full" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-slate-500 rounded-full group-hover:border-emerald-500 transition-colors bg-white" />
                        )}
                        <span className={`text-sm font-semibold transition-all ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {task.name}
                        </span>
                      </button>
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null)
                )}
              </div>

              {/* Task Pie Chart & Stats */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  <span className="flex items-center gap-2"><PieIcon className="w-4 h-4" /> Completion</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">{completedTasks}/{tasks.length}</span>
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
                      <span className="text-2xl font-black text-slate-700">
                        {Math.round((completedTasks / tasks.length) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
      
      {/* Custom Global Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        /* Ensure table header sticks and columns don't collapse */
        table { border-spacing: 0; }
        th, td { white-space: nowrap; }
      `}} />
    </div>
  );
}

const App = () => {
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
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div>
      {!user ? <Auth /> : <Tracker user={user} />}
    </div>
  );
};

export default App;