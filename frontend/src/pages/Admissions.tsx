import { useState } from 'react';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const admissionsSchema = z.object({
  applicant_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  email: z.string().email("Invalid email address"),
  program_id: z.string().uuid("Invalid program ID"),
});

export default function Admissions() {
  const [formData, setFormData] = useState({
    applicant_name: '',
    phone: '',
    email: '',
    program_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Placeholder UUID
  });
  
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      const parsed = admissionsSchema.parse(formData);
      
      // We assume user is not logged in yet, so the Edge Function will handle anonymous submission, 
      // or we use Supabase anonymous auth if enabled. For now, calling edge function.
      const { error } = await supabase.functions.invoke('validate-write', {
        body: { action: 'submit_application', payload: parsed }
      });

      if (error) throw error;
      
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred during submission.');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">Application Submitted!</h2>
          <p className="text-slate-600 mb-6">We have received your application. To accept the offer and provision your student account, please proceed to pay the acceptance fee.</p>
          
          {/* Mock M-Pesa Payment flow */}
          <button className="bg-green-600 text-white w-full py-2 rounded font-semibold hover:bg-green-700">
            Pay with M-Pesa (IntaSend)
          </button>
          
          <div className="mt-6">
            <Link to="/" className="text-blue-600 hover:underline">Return Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-slate-900">
            Apply to UHU
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="sr-only">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Full Name"
                value={formData.applicant_name}
                onChange={e => setFormData({...formData, applicant_name: e.target.value})}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <label htmlFor="phone" className="sr-only">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Phone Number (e.g. 0712345678)"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          {status === 'error' && (
            <div className="text-red-500 text-sm mt-2">{errorMsg}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {status === 'submitting' ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
          <div className="text-center">
            <Link to="/" className="text-sm text-blue-600 hover:underline">Back to Home</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
