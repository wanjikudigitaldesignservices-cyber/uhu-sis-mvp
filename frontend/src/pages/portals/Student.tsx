import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function StudentPortal() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      
      const { data: studentData } = await supabase
        .from('students')
        .select('*, programs(name)')
        .eq('user_id', user.id)
        .single();
        
      setProfile(studentData);
    };
    checkUser();
  }, [navigate]);

  if (!profile) return <div className="p-8">Loading Student Profile...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold tracking-tight">UHU Portal</div>
        <nav className="flex-1 px-4 space-y-2">
          <a href="#" className="block py-2 px-4 bg-slate-800 rounded">Dashboard</a>
          <a href="#" className="block py-2 px-4 hover:bg-slate-800 rounded">Grades</a>
          <a href="#" className="block py-2 px-4 hover:bg-slate-800 rounded">Fee Statement</a>
        </nav>
        <button 
          className="m-4 p-2 bg-red-600 rounded hover:bg-red-700" 
          onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
        >
          Sign Out
        </button>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Student Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border border-slate-100">
            <h3 className="text-sm font-medium text-slate-500 uppercase">Admission No</h3>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{profile.admission_no}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-slate-100">
            <h3 className="text-sm font-medium text-slate-500 uppercase">Program</h3>
            <p className="text-lg font-semibold text-slate-900 mt-1">{profile.programs?.name}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-slate-100">
            <h3 className="text-sm font-medium text-slate-500 uppercase">Status</h3>
            <p className="text-2xl font-semibold text-green-600 mt-1 capitalize">{profile.status}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Academic Progress Overview</h2>
          <p className="text-slate-600">Your grades and GPA will appear here once the semester grading window is closed.</p>
        </div>
      </main>
    </div>
  );
}
