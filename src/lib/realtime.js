import { supabase } from './supabase';

// Real-time subscription management
class RealtimeManager {
  constructor() {
    this.subscriptions = new Map();
    this.callbacks = new Map();
  }

  // Subscribe to table changes
  subscribe(table, callback, filter = null) {
    const subscriptionKey = `${table}-${filter || 'all'}`;
    
    // Store callback
    if (!this.callbacks.has(subscriptionKey)) {
      this.callbacks.set(subscriptionKey, new Set());
    }
    this.callbacks.get(subscriptionKey).add(callback);

    // Create subscription if it doesn't exist
    if (!this.subscriptions.has(subscriptionKey)) {
      let query = supabase
        .channel(`realtime:${subscriptionKey}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            ...(filter && { filter })
          },
          (payload) => {
            // Notify all callbacks for this subscription
            this.callbacks.get(subscriptionKey)?.forEach(cb => {
              try {
                cb(payload);
              } catch (error) {
                console.error('Realtime callback error:', error);
              }
            });
          }
        )
        .subscribe();

      this.subscriptions.set(subscriptionKey, query);
    }

    // Return unsubscribe function
    return () => {
      this.callbacks.get(subscriptionKey)?.delete(callback);
      
      // If no more callbacks, remove subscription
      if (this.callbacks.get(subscriptionKey)?.size === 0) {
        this.subscriptions.get(subscriptionKey)?.unsubscribe();
        this.subscriptions.delete(subscriptionKey);
        this.callbacks.delete(subscriptionKey);
      }
    };
  }

  // Subscribe to habit changes
  subscribeToHabits(callback, userId) {
    return this.subscribe('habits', callback, `user_id=eq.${userId}`);
  }

  // Subscribe to habit log changes
  subscribeToHabitLogs(callback, userId) {
    return this.subscribe('habit_logs', callback, `user_id=eq.${userId}`);
  }

  // Subscribe to todo changes
  subscribeToTodos(callback, userId) {
    return this.subscribe('todos', callback, `user_id=eq.${userId}`);
  }

  // Cleanup all subscriptions
  cleanup() {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
    this.callbacks.clear();
  }
}

export const realtimeManager = new RealtimeManager();

// Optimistic update utilities
export class OptimisticUpdates {
  constructor() {
    this.pendingUpdates = new Map();
  }

  // Add a pending update
  addPendingUpdate(key, update) {
    this.pendingUpdates.set(key, {
      ...update,
      timestamp: Date.now()
    });
  }

  // Remove a pending update (success or failure)
  removePendingUpdate(key) {
    this.pendingUpdates.delete(key);
  }

  // Get pending update
  getPendingUpdate(key) {
    return this.pendingUpdates.get(key);
  }

  // Clean old pending updates (older than 30 seconds)
  cleanOldUpdates() {
    const now = Date.now();
    for (const [key, update] of this.pendingUpdates.entries()) {
      if (now - update.timestamp > 30000) {
        this.pendingUpdates.delete(key);
      }
    }
  }

  // Cleanup all pending updates
  cleanup() {
    this.pendingUpdates.clear();
  }

  // Apply optimistic updates to data
  applyToHabits(habits) {
    const result = [...habits];
    
    for (const [key, update] of this.pendingUpdates.entries()) {
      if (update.type === 'habit') {
        if (update.operation === 'add') {
          result.push(update.data);
        } else if (update.operation === 'delete') {
          const index = result.findIndex(h => h.id === update.id);
          if (index !== -1) result.splice(index, 1);
        } else if (update.operation === 'update') {
          const index = result.findIndex(h => h.id === update.id);
          if (index !== -1) {
            result[index] = { ...result[index], ...update.data };
          }
        }
      }
    }
    
    return result;
  }

  applyToHabitLogs(habitLogs) {
    const result = [...habitLogs];
    
    for (const [key, update] of this.pendingUpdates.entries()) {
      if (update.type === 'habitLog') {
        if (update.operation === 'add') {
          result.push(update.data);
        } else if (update.operation === 'delete') {
          const index = result.findIndex(log => 
            log.habit_id === update.habitId && log.log_date === update.logDate
          );
          if (index !== -1) result.splice(index, 1);
        }
      }
    }
    
    return result;
  }

  applyToTodos(todos) {
    const result = [...todos];
    
    for (const [key, update] of this.pendingUpdates.entries()) {
      if (update.type === 'todo') {
        if (update.operation === 'add') {
          result.push(update.data);
        } else if (update.operation === 'delete') {
          const index = result.findIndex(t => t.id === update.id);
          if (index !== -1) result.splice(index, 1);
        } else if (update.operation === 'update') {
          const index = result.findIndex(t => t.id === update.id);
          if (index !== -1) {
            result[index] = { ...result[index], ...update.data };
          }
        }
      }
    }
    
    return result;
  }
}

export const optimisticUpdates = new OptimisticUpdates();

// Performance utilities
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Cache management
export class DataCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const dataCache = new DataCache();

// Connection status monitoring
export class ConnectionMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.callbacks = new Set();
    
    window.addEventListener('online', () => this.setOnlineStatus(true));
    window.addEventListener('offline', () => this.setOnlineStatus(false));
  }

  setOnlineStatus(status) {
    this.isOnline = status;
    this.callbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Connection status callback error:', error);
      }
    });
  }

  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  getStatus() {
    return this.isOnline;
  }
}

export const connectionMonitor = new ConnectionMonitor();