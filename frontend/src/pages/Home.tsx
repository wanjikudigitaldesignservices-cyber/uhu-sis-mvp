import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Upper Hill University</h1>
          <nav className="space-x-6">
            <Link to="/admissions" className="text-slate-600 hover:text-slate-900">Admissions</Link>
            <Link to="/login" className="text-slate-600 hover:text-slate-900">Portal Login</Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-5xl font-extrabold text-slate-900 mb-6">Excellence in Education.</h2>
        <p className="text-xl text-slate-600 max-w-2xl mb-8">
          Join Upper Hill University and become part of a community dedicated to innovation, research, and leadership in Kenya.
        </p>
        <Link 
          to="/admissions" 
          className="bg-blue-600 text-white px-8 py-3 rounded-md font-semibold hover:bg-blue-700 transition"
        >
          Apply Now
        </Link>
      </main>
    </div>
  );
}
