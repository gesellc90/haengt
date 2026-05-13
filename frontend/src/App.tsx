import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.js';
import { ToastProvider } from './contexts/ToastContext.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import Layout from './components/Layout.js';
import LoginPage from './pages/LoginPage.js';
import BookingPage from './pages/BookingPage.js';
import ProfilePage from './pages/ProfilePage.js';
import AdminLayout from './pages/admin/AdminLayout.js';
import MembersPage from './pages/admin/MembersPage.js';
import DrinksPage from './pages/admin/DrinksPage.js';
import AdminBookingsPage from './pages/admin/BookingsPage.js';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          {/* Öffentliche Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Geschützte Routen — für alle eingeloggten User */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/buchen" replace />} />
              <Route path="/buchen" element={<BookingPage />} />
              <Route path="/profil" element={<ProfilePage />} />

              {/* Admin-Bereich — nur für Admins */}
              <Route element={<ProtectedRoute role="admin" />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/mitglieder" replace />} />
                  <Route path="mitglieder" element={<MembersPage />} />
                  <Route path="getraenke" element={<DrinksPage />} />
                  <Route path="buchungen" element={<AdminBookingsPage />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/buchen" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
