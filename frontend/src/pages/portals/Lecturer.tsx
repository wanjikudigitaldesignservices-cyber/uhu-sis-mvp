import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function LecturerPortal() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      
      const { data } = await supabase
        .from('course_offerings')
        .select('*, semesters(name)')
        .eq('lecturer_id', user.id);
        
      setCourses(data || []);
    };
    fetchCourses();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold tracking-tight">Lecturer Portal</div>
        <nav className="flex-1 px-4 space-y-2">
          <a href="#" className="block py-2 px-4 bg-slate-800 rounded">My Courses</a>
          <a href="#" className="block py-2 px-4 hover:bg-slate-800 rounded">Grade Entry</a>
        </nav>
        <button 
          className="m-4 p-2 bg-red-600 rounded hover:bg-red-700" 
          onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
        >
          Sign Out
        </button>
      </aside>
      
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Course Roster</h1>
        
        <div className="grid grid-cols-1 gap-6">
          {courses.length === 0 ? (
            <p className="text-slate-600">No courses assigned currently.</p>
          ) : (
            courses.map(c => (
              <div key={c.id} className="bg-white p-6 rounded-lg shadow border border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{c.course_id}</h3>
                  <p className="text-slate-500">Capacity: {c.capacity}</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Manage Grades
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
