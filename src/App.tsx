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
      aria-current={isActive ? 'page' : undefined}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600 ${
        isActive ? 'bg-white/20 text-white' : 'text-indigo-100 hover:bg-white/10 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-indigo-700"
      >
        Skip to main content
      </a>
      <header className="border-b-2 border-cyan-400 bg-gradient-to-r from-indigo-600 to-violet-700 px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            to="/"
            className="order-1 rounded text-lg font-semibold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600"
          >
            Learning Platform
          </Link>
          <div className="order-2 ml-auto sm:order-3">
            <LoginButton />
          </div>
          <nav aria-label="Main" className="order-3 flex w-full justify-center gap-1 sm:order-2 sm:w-auto sm:justify-start">
            <NavTab to="/dashboard" label="Dashboard" />
            <NavTab to="/roadmap" label="Roadmap" />
          </nav>
        </div>
      </header>
      <main id="main-content" className="p-6">
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
