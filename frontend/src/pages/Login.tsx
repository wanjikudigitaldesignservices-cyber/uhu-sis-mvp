import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle'|'loading'|'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrMsg('');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setStatus('error');
      setErrMsg(error.message);
      return;
    }

    // Role-based routing
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (userRecord?.role === 'student') navigate('/student');
    else if (userRecord?.role === 'lecturer') navigate('/lecturer');
    else if (userRecord?.role === 'registrar_admin') navigate('/admin');
    else navigate('/');
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <form onSubmit={handleLogin} className="bg-white p-8 shadow-lg rounded-xl w-96 space-y-6">
        <h2 className="text-3xl font-extrabold text-center text-slate-900">Portal Login</h2>
        
        {status === 'error' && <p className="text-red-500 text-sm text-center">{errMsg}</p>}

        <div className="space-y-4">
          <input 
            className="border border-slate-300 p-3 w-full rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
          <input 
            className="border border-slate-300 p-3 w-full rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button 
          type="submit" 
          disabled={status === 'loading'}
          className="bg-blue-600 text-white w-full py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {status === 'loading' ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
