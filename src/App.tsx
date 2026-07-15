import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { LoginButton } from './features/auth/LoginButton';
import { RoadmapPage } from './features/roadmap/RoadmapPage';
import { MilestoneDetailPage } from './features/roadmap/MilestoneDetailPage';
import { DashboardPage } from './features/dashboard/DashboardPage';

function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold text-slate-900">
            Learning Platform
          </Link>
          <nav className="flex gap-4 text-sm text-slate-600">
            <Link to="/dashboard" className="hover:text-slate-900">Dashboard</Link>
            <Link to="/roadmap" className="hover:text-slate-900">Roadmap</Link>
          </nav>
        </div>
        <LoginButton />
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
