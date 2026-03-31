import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import { useAuthStore } from './stores/authStore';

import { useNakamaSocket } from './hooks/useNakamaSocket';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore(state => state.session);
  return session ? children : <Navigate to="/auth" />;
}

export default function App() {
  useNakamaSocket();
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-brand-dark to-slate-900">
        <Routes>
          <Route path="/auth" element={<AuthScreen />} />
          <Route path="/" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
          <Route path="/game" element={<ProtectedRoute><GameScreen /></ProtectedRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
