import React, { useState } from 'react';
import { GraduationCap, ArrowRight, Lock, Mail, Loader2, User } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock login/signup delay to simulate network request
    setTimeout(() => {
      // In a real app, this would handle account creation vs authentication
      if (isSignUp) {
        localStorage.setItem('omnitutor_user_name', name);
      }
      onLogin();
      setLoading(false);
    }, 1500);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    // Reset form fields slightly for cleaner UX, or keep them if desired. Keeping for now.
  };

  return (
    <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4 relative overflow-hidden text-[#e2e2e6]">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-[#1a1c20] rounded-[32px] border border-white/5 shadow-2xl p-8 md:p-12 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/30 mb-6">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-medium text-slate-100 tracking-tight text-center">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500 mt-2 text-center">
            {isSignUp ? 'Join OmniTutor AI today' : 'Sign in to continue your learning'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  required={isSignUp}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-[#0f1115] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Mail className="w-5 h-5" />
              </div>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full bg-[#0f1115] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0f1115] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full py-4 font-medium transition-all shadow-lg shadow-indigo-900/25 hover:shadow-indigo-900/40 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isSignUp ? 'Sign Up' : 'Sign In'} <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              onClick={toggleMode}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors outline-none focus:underline"
            >
              {isSignUp ? 'Sign In' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;