import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminPortal() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ applications: 0, students: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Check role
      const { data: userRecord } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (userRecord?.role !== 'registrar_admin') {
        navigate('/');
        return;
      }

      const { count: appsCount } = await supabase.from('admissions_apps').select('*', { count: 'exact', head: true });
      const { count: studentsCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
      
      setStats({ 
        applications: appsCount || 0, 
        students: studentsCount || 0 
      });
    };
    fetchStats();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold tracking-tight">Registrar Portal</div>
        <nav className="flex-1 px-4 space-y-2">
          <a href="#" className="block py-2 px-4 bg-slate-800 rounded">Dashboard</a>
          <a href="#" className="block py-2 px-4 hover:bg-slate-800 rounded">Admissions</a>
          <a href="#" className="block py-2 px-4 hover:bg-slate-800 rounded">Semesters</a>
        </nav>
        <button 
          className="m-4 p-2 bg-red-600 rounded hover:bg-red-700" 
          onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
        >
          Sign Out
        </button>
      </aside>
      
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">System Overview</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border border-slate-100">
            <h3 className="text-sm font-medium text-slate-500 uppercase">Total Applications</h3>
            <p className="text-3xl font-semibold text-blue-600 mt-2">{stats.applications}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-slate-100">
            <h3 className="text-sm font-medium text-slate-500 uppercase">Total Students</h3>
            <p className="text-3xl font-semibold text-green-600 mt-2">{stats.students}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
