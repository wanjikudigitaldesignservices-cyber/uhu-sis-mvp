import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Route-based code splitting
const Home = React.lazy(() => import('./pages/Home'));
const Admissions = React.lazy(() => import('./pages/Admissions'));
const Login = React.lazy(() => import('./pages/Login'));
const StudentPortal = React.lazy(() => import('./pages/portals/Student'));
const LecturerPortal = React.lazy(() => import('./pages/portals/Lecturer'));
const AdminPortal = React.lazy(() => import('./pages/portals/Admin'));

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-primary">Loading...</div>}>
          <Routes>
            {/* Public Marketing Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/admissions" element={<Admissions />} />
            <Route path="/login" element={<Login />} />
            
            {/* Portals */}
            <Route path="/student/*" element={<StudentPortal />} />
            <Route path="/lecturer/*" element={<LecturerPortal />} />
            <Route path="/admin/*" element={<AdminPortal />} />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
