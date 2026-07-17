import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { LoginButton } from './features/auth/LoginButton';
import { RoadmapPage } from './features/roadmap/RoadmapPage';
import { MilestoneDetailPage } from './features/roadmap/MilestoneDetailPage';
import { DashboardPage } from './features/dashboard/DashboardPage';

function NavTab({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/roadmap' && location.pathname.startsWith('/roadmap'));

  return (
    <Link
      to={to}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        isActive ? 'bg-slate-900/20 text-white' : 'text-indigo-100 hover:bg-slate-900/10 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b-2 border-cyan-400 bg-gradient-to-r from-indigo-600 to-violet-700 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold tracking-tight text-white">
              Learning Platform
            </Link>
            <nav className="flex gap-1">
              <NavTab to="/dashboard" label="Dashboard" />
              <NavTab to="/roadmap" label="Roadmap" />
            </nav>
          </div>
          <LoginButton />
        </div>
      </header>
      <main className="p-6">
        <ProtectedRoute>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/roadmap/milestones/:milestoneId" element={<MilestoneDetailPage />} />
          </Routes>
        </ProtectedRoute>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
