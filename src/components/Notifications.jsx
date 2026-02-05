import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Clock, Settings, X, Check } from 'lucide-react';

const Notifications = ({ habits }) => {
  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState(Notification.permission);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reminderSettings, setReminderSettings] = useState({
    enabled: localStorage.getItem('reminders-enabled') === 'true',
    time: localStorage.getItem('reminder-time') || '20:00',
    frequency: localStorage.getItem('reminder-frequency') || 'daily'
  });

  // Request notification permission
  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        showNotification('Notifications enabled!', 'You\'ll now receive habit reminders', 'success');
      }
    }
  };

  // Show notification
  const showNotification = (title, body, type = 'info', actions = []) => {
    const id = Date.now();
    const notification = {
      id,
      title,
      body,
      type,
      timestamp: new Date(),
      actions,
      read: false
    };

    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep max 10 notifications

    // Browser notification if permission granted
    if (permission === 'granted' && reminderSettings.enabled) {
      const browserNotification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `habit-reminder-${id}`,
        requireInteraction: type === 'reminder'
      });

      browserNotification.onclick = () => {
        window.focus();
        markAsRead(id);
        browserNotification.close();
      };

      // Auto close after 5 seconds for non-reminders
      if (type !== 'reminder') {
        setTimeout(() => browserNotification.close(), 5000);
      }
    }

    return id;
  };

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );
  };

  // Clear all notifications
  const clearAll = () => {
    setNotifications([]);
  };

  // Update reminder settings
  const updateSettings = (newSettings) => {
    setReminderSettings(newSettings);
    localStorage.setItem('reminders-enabled', newSettings.enabled.toString());
    localStorage.setItem('reminder-time', newSettings.time);
    localStorage.setItem('reminder-frequency', newSettings.frequency);

    if (newSettings.enabled) {
      scheduleReminders();
      showNotification('Settings updated', 'Your reminder preferences have been saved', 'success');
    }
  };

  // Schedule habit reminders
  const scheduleReminders = () => {
    if (!reminderSettings.enabled || permission !== 'granted') return;

    // Clear existing timers
    clearTimeout(window.habitReminderTimer);

    const now = new Date();
    const [hours, minutes] = reminderSettings.time.split(':').map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);

    // If reminder time has passed today, set for tomorrow
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const timeUntilReminder = reminderTime - now;

    window.habitReminderTimer = setTimeout(() => {
      checkAndSendReminders();
      // Schedule for next day
      scheduleReminders();
    }, timeUntilReminder);
  };

  // Check habits and send reminders
  const checkAndSendReminders = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = new Set(); // Would get from habitLogs in real app
    
    const incompleteHabits = habits.filter(habit => !todayLogs.has(habit.id));

    if (incompleteHabits.length > 0) {
      const habitNames = incompleteHabits.map(h => h.name).join(', ');
      showNotification(
        '🔔 Habit Reminder',
        `Don't forget: ${habitNames}`,
        'reminder',
        [
          {
            label: 'Mark all done',
            action: () => {
              // In real app, would mark habits as complete
              showNotification('Great job!', 'All habits marked as complete', 'success');
            }
          }
        ]
      );
    } else {
      showNotification(
        '🎉 All Done!',
        'You\'ve completed all your habits for today. Keep up the great work!',
        'success'
      );
    }
  };

  // Setup reminders on component mount and settings change
  useEffect(() => {
    if (reminderSettings.enabled && permission === 'granted') {
      scheduleReminders();
    }
    return () => clearTimeout(window.habitReminderTimer);
  }, [reminderSettings, permission]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
        >
          {unreadCount > 0 ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications Panel */}
      {isSettingsOpen && (
        <div className="fixed top-0 right-0 w-80 h-full bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Notifications</h3>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notification Permission */}
          {permission !== 'granted' && (
            <div className="p-4 bg-yellow-50 border-b border-yellow-200">
              <p className="text-sm text-yellow-800 mb-2">
                Enable notifications to get habit reminders
              </p>
              <button
                onClick={requestPermission}
                className="w-full px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
              >
                Enable Notifications
              </button>
            </div>
          )}

          {/* Settings */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Reminder Settings</span>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reminderSettings.enabled}
                  onChange={(e) => updateSettings({ ...reminderSettings, enabled: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Enable reminders</span>
              </label>

              {reminderSettings.enabled && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Reminder time</label>
                    <input
                      type="time"
                      value={reminderSettings.time}
                      onChange={(e) => updateSettings({ ...reminderSettings, time: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Frequency</label>
                    <select
                      value={reminderSettings.frequency}
                      onChange={(e) => updateSettings({ ...reminderSettings, frequency: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays only</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-medium text-slate-500">
                    {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                  </span>
                  {notifications.some(n => !n.read) && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      notification.read
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        notification.type === 'success' ? 'bg-green-500' :
                        notification.type === 'reminder' ? 'bg-blue-500' :
                        'bg-slate-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!notification.read && (
                        <Check className="w-4 h-4 text-blue-600 opacity-50" />
                      )}
                    </div>

                    {notification.actions && notification.actions.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {notification.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.action();
                            }}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Notifications;