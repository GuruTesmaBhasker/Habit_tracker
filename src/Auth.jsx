import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Github, 
  Chrome, 
  CheckCircle2, 
  Target, 
  Sparkles, 
  Eye, 
  EyeOff,
  Loader2,
  AlertCircle
} from 'lucide-react';

/**
 * Premium Authentication Component for Habit & Task Master
 * Features a high-end dual-pane layout, glassmorphism, 
 * and smooth state transitions between Login and Sign Up.
 */
const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle Login and Sign Up logic
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation for sign up
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Clean error handling for login
          if (error.message?.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please check your credentials and try again.');
          } else if (error.message?.includes('Email not confirmed')) {
            setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
          } else if (error.message?.includes('Email rate limit exceeded')) {
            setError('Too many attempts. Please wait a few minutes before trying again.');
          } else if (error.message?.includes('signup disabled')) {
            setError('New registrations are temporarily disabled. Please try again later.');
          } else {
            setError('Unable to sign in. Please check your credentials and try again.');
          }
          setLoading(false);
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        
        if (error) {
          // Clean error handling for signup
          if (error.message?.includes('User already registered')) {
            setError("This email is already registered. Please sign in instead.");
          } else if (error.message?.includes('signup disabled')) {
            setError('New registrations are temporarily disabled. Please try again later.');
          } else if (error.message?.includes('Email rate limit exceeded')) {
            setError('Too many email attempts. Please wait a few minutes before trying again.');
          } else if (error.message?.includes('Invalid email')) {
            setError('Please enter a valid email address.');
          } else {
            setError('Unable to create account. Please try again.');
          }
          setLoading(false);
          return;
        }

        // Simple check: if user has email_confirmed_at, they already exist
        if (data.user?.email_confirmed_at) {
          setError("This email is already registered. Please sign in instead.");
        } else if (data.user && !data.session) {
          // New user created, no session yet (needs email confirmation)
          setSuccess("Account created! Check your inbox to confirm your account.");
        } else {
          // Fallback
          setSuccess("Account created! Check your inbox to confirm your account.");
        }
      }
    } catch (err) {
      // Final fallback for any unexpected errors
      console.error('Auth error:', err);
      if (isLogin) {
        setError('Unable to sign in. Please check your credentials and try again.');
      } else {
        setError('Unable to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 font-sans selection:bg-blue-100">
      {/* Main Auth Container */}
      <div className="max-w-5xl w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col md:flex-row min-h-[650px] border border-white">
        
        {/* Left Side: Branding & Motivational Pane */}
        <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Abstract Background Decorations */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500 rounded-full -mr-24 -mt-24 blur-3xl opacity-60 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-700 rounded-full -ml-24 -mb-24 blur-3xl opacity-40"></div>
          
          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12 group cursor-default">
              <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-xl border border-white/20 shadow-xl transition-transform group-hover:scale-110">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter text-white">Habit & Task Master</h1>
            </div>
            
            {/* Value Proposition */}
            <h2 className="text-4xl md:text-5xl font-extrabold leading-[1.1] mb-8 tracking-tight">
              Master your <span className="text-blue-200">habits</span>, <br />
              control your <span className="text-purple-200">future</span>.
            </h2>
            <p className="text-blue-100 text-lg max-w-md leading-relaxed opacity-90">
              Join thousands using our app to visualize progress, build streaks, and stay accountable to their goals.
            </p>
          </div>

          {/* Social Proof / Features */}
          <div className="relative z-10 mt-12 space-y-4">
            <div className="flex items-center gap-4 bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10 transition-all hover:bg-white/15">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 flex items-center justify-center border border-emerald-400/20">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-base">Smart Analytics</p>
                <p className="text-xs text-blue-200 font-medium">Weekly & monthly insights.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10 transition-all hover:bg-white/15">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 flex items-center justify-center border border-amber-400/20">
                <Sparkles className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-base">Realtime Sync</p>
                <p className="text-xs text-blue-200 font-medium">Multi-device synchronization.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="md:w-1/2 p-8 md:p-14 flex flex-col justify-center bg-white relative">
          <div className="max-w-sm mx-auto w-full">
            <div className="mb-10">
              <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">
                {isLogin ? 'Welcome back' : 'Start your journey'}
              </h3>
              <p className="text-slate-500 font-medium">
                {isLogin 
                  ? 'Sign in to your account to continue tracking.' 
                  : 'Create a free account and start building habits today.'}
              </p>
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            {/* Success Message Display */}
            {success && (
              <div className="mb-8 p-4 bg-green-50 border border-green-100 text-green-700 text-sm font-semibold rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{success}</p>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              {/* Email Input */}
              <div className="space-y-2.5">
                <label className="text-[13px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200"
                    placeholder="name@email.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => navigate('/reset-password')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200"
                    placeholder="••••••••"
                    minLength="6"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input (Sign Up Only) */}
              {!isLogin && (
                <div className="space-y-2.5">
                  <label className="text-[13px] font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200"
                      placeholder="••••••••"
                      minLength="6"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white font-bold py-4.5 rounded-[1.25rem] hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 transition-all flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-slate-200 active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span className="text-lg">{isLogin ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Social Authentication Divider */}
            <div className="mt-10 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-5 bg-white text-slate-400 font-bold uppercase tracking-widest text-[10px]">Or continue with</span>
              </div>
            </div>

            {/* Social Buttons */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <button 
                type="button"
                disabled
                className="flex items-center justify-center gap-3 py-3.5 px-4 border border-slate-200 rounded-2xl bg-slate-50 transition-all font-bold text-slate-400 text-sm shadow-sm cursor-not-allowed"
              >
                <Chrome className="w-5 h-5" /> Google
              </button>
              <button 
                type="button"
                disabled
                className="flex items-center justify-center gap-3 py-3.5 px-4 border border-slate-200 rounded-2xl bg-slate-50 transition-all font-bold text-slate-400 text-sm shadow-sm cursor-not-allowed"
              >
                <Github className="w-5 h-5" /> GitHub
              </button>
            </div>

            {/* Switch between Login and Signup */}
            <p className="mt-12 text-center text-sm font-medium text-slate-500">
              {isLogin ? "New to Habit & Task Master?" : "Have an account?"}{' '}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-blue-600 font-extrabold hover:text-blue-700 transition-colors underline decoration-2 underline-offset-8"
              >
                {isLogin ? 'Create free account' : 'Sign in here'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
