import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Lock, Mail, ArrowRight, AlertCircle, User, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'EMPLOYEE' | 'MANAGER'>('EMPLOYEE');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isRegister) {
        await register({ email, password, role, name: name.trim() || undefined, phone: phone.trim() || undefined });
      } else {
        await login({ email, password });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || `${isRegister ? 'Registration' : 'Login'} failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-950">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-neon">
            <CheckSquare className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 transition-all duration-300">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-400 transition-all duration-300">
            {isRegister ? 'Register for a new TaskPulse account' : 'Sign in to TaskPulse to continue'}
          </p>
        </div>

        <div className="glass-panel p-8 backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full glass-input pl-12"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">WhatsApp Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full glass-input pl-12"
                    placeholder="9625587090"
                  />
                </div>
                <p className="text-xs text-gray-500 ml-1">
                  Used for WhatsApp task alerts. Include country code, or a 10-digit number defaults to +91.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input pl-12"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-medium text-gray-300">Password</label>
                {!isRegister && (
                  <a href="#" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Forgot password?</a>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input pl-12"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Select Role</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('EMPLOYEE')}
                    className={`p-4 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center ${
                      role === 'EMPLOYEE'
                        ? 'bg-primary-500/10 border-primary-500 text-primary-400 shadow-neon scale-102'
                        : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className="text-sm font-semibold">Employee</div>
                    <div className="text-[10px] text-gray-500 mt-1">Track tasks & logs</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('MANAGER')}
                    className={`p-4 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center ${
                      role === 'MANAGER'
                        ? 'bg-accent-500/10 border-accent-500 text-accent-400 shadow-neon scale-102'
                        : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className="text-sm font-semibold">Manager</div>
                    <div className="text-[10px] text-gray-500 mt-1">Assign tasks & view team</div>
                  </button>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center gap-2 group mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? (isRegister ? 'Creating Account...' : 'Signing In...') : (isRegister ? 'Register' : 'Sign In')}</span>
              {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                }}
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              New to TaskPulse?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError('');
                }}
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Register Now
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;
