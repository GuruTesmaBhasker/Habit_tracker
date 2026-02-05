import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  Target,
  Award,
  Flame,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

const Analytics = ({ habits, habitLogs, perfectDaysSet, currentStreak }) => {
  const [viewMode, setViewMode] = useState('monthly'); // 'weekly', 'monthly'
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week

  // Calculate weekly data
  const weeklyData = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() - (selectedWeek * 7));
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    const weeklyStats = weekDays.map(date => ({
      date,
      day: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
      completed: habitLogs.filter(log => log.log_date === date).length,
      total: habits.length,
      isPerfect: perfectDaysSet.has(date)
    }));

    return { weekDays, weeklyStats };
  }, [habits, habitLogs, perfectDaysSet, selectedWeek]);

  // Calculate monthly statistics
  const monthlyStats = useMemo(() => {
    const totalPossibleChecks = habits.length * new Date().getDate();
    const totalCompleted = habitLogs.length;
    const perfectDaysCount = perfectDaysSet.size;
    const completionRate = totalPossibleChecks > 0 ? (totalCompleted / totalPossibleChecks) * 100 : 0;

    // Habit performance ranking
    const habitPerformance = habits.map(habit => {
      const habitLogs_filtered = habitLogs.filter(log => log.habit_id === habit.id);
      const completionRate = (habitLogs_filtered.length / new Date().getDate()) * 100;
      return {
        ...habit,
        completionRate: Math.round(completionRate),
        completedDays: habitLogs_filtered.length
      };
    }).sort((a, b) => b.completionRate - a.completionRate);

    return {
      totalCompleted,
      totalPossibleChecks,
      completionRate: Math.round(completionRate),
      perfectDaysCount,
      habitPerformance
    };
  }, [habits, habitLogs, perfectDaysSet]);

  // Chart configurations
  const weeklyChartData = {
    labels: weeklyData.weeklyStats.map(day => day.day),
    datasets: [
      {
        label: 'Habits Completed',
        data: weeklyData.weeklyStats.map(day => day.completed),
        backgroundColor: weeklyData.weeklyStats.map(day => 
          day.isPerfect ? 'rgba(34, 197, 94, 0.8)' : 'rgba(59, 130, 246, 0.6)'
        ),
        borderColor: weeklyData.weeklyStats.map(day => 
          day.isPerfect ? '#22c55e' : '#3b82f6'
        ),
        borderWidth: 2,
        borderRadius: 6,
      }
    ]
  };

  const habitPerformanceData = {
    labels: monthlyStats.habitPerformance.map(h => h.name),
    datasets: [
      {
        label: 'Completion %',
        data: monthlyStats.habitPerformance.map(h => h.completionRate),
        backgroundColor: monthlyStats.habitPerformance.map((_, i) => 
          `hsla(${200 + (i * 30)}, 70%, 50%, 0.7)`
        ),
        borderColor: monthlyStats.habitPerformance.map((_, i) => 
          `hsla(${200 + (i * 30)}, 70%, 40%, 1)`
        ),
        borderWidth: 2,
        borderRadius: 6,
      }
    ]
  };

  const perfectDaysData = {
    labels: ['Perfect Days', 'Incomplete Days'],
    datasets: [
      {
        data: [monthlyStats.perfectDaysCount, new Date().getDate() - monthlyStats.perfectDaysCount],
        backgroundColor: ['#22c55e', '#e5e7eb'],
        borderColor: ['#16a34a', '#d1d5db'],
        borderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw} ${context.dataset.label?.toLowerCase() || 'habits'}`
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Analytics Dashboard
        </h2>
        <p className="text-blue-100">Deep insights into your habit journey</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-xs font-bold text-slate-500 uppercase">Current Streak</span>
          </div>
          <p className="text-2xl font-black text-orange-500">{currentStreak} days</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-green-500" />
            <span className="text-xs font-bold text-slate-500 uppercase">Perfect Days</span>
          </div>
          <p className="text-2xl font-black text-green-500">{monthlyStats.perfectDaysCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-bold text-slate-500 uppercase">Completion</span>
          </div>
          <p className="text-2xl font-black text-blue-500">{monthlyStats.completionRate}%</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span className="text-xs font-bold text-slate-500 uppercase">Total Checks</span>
          </div>
          <p className="text-2xl font-black text-purple-500">{monthlyStats.totalCompleted}</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <div className="bg-slate-100 p-1 rounded-lg flex">
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'weekly' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly View
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'monthly' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly View
          </button>
        </div>
      </div>

      {/* Weekly Analytics */}
      {viewMode === 'weekly' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Weekly Performance
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedWeek(selectedWeek + 1)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-600 px-3">
                {selectedWeek === 0 ? 'This Week' : `${selectedWeek} week${selectedWeek > 1 ? 's' : ''} ago`}
              </span>
              <button
                onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
                disabled={selectedWeek === 0}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-64">
            <Bar data={weeklyChartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Monthly Analytics */}
      {viewMode === 'monthly' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Habit Performance Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Habit Performance Ranking
            </h3>
            <div className="h-64">
              <Bar data={habitPerformanceData} options={chartOptions} />
            </div>
          </div>

          {/* Perfect Days Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-green-500" />
              Perfect Days This Month
            </h3>
            <div className="h-64 flex items-center justify-center">
              <Doughnut 
                data={perfectDaysData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { position: 'bottom' },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.label}: ${context.raw} days`
                      }
                    }
                  },
                  cutout: '70%'
                }} 
              />
            </div>
          </div>

          {/* Detailed Habit Performance List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Detailed Habit Analysis
            </h3>
            <div className="space-y-3">
              {monthlyStats.habitPerformance.map((habit, index) => (
                <div key={habit.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                      ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-slate-500'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{habit.name}</p>
                      <p className="text-sm text-slate-500">
                        {habit.completedDays} days completed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-800">{habit.completionRate}%</p>
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300" 
                        style={{ width: `${habit.completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;