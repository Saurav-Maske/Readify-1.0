import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import SignupPage from './pages/SignupPage';
import GoogleSignupCompletePage from './pages/GoogleSignupCompletePage';
import LoginPage from './pages/LoginPage';
import OtpVerificationPage from './pages/OtpVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Home from './pages/home';
import QuestionsPage from './pages/QuestionsPage';
import Feed from './pages/feed';
import BookPage from './pages/BookPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/searchPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import MyShelfPage from './pages/MyShelf';
import DiscoverPage from './pages/DiscoverPage';
import { GuestOnlyRoute } from './components/auth/GuestOnlyRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<GuestOnlyRoute><Home /></GuestOnlyRoute>} />
        <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/signup" element={<GuestOnlyRoute><SignupPage /></GuestOnlyRoute>} />
        <Route path="/verify-otp" element={<OtpVerificationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/signup/complete-profile" element={<GoogleSignupCompletePage />} />

        {/* Authenticated Dashboard Routes */}
        <Route path="/feed" element={<DashboardLayout><Feed /></DashboardLayout>} />
        <Route path="/books" element={<DashboardLayout><BookPage /></DashboardLayout>} />
        <Route path="/search" element={<DashboardLayout><SearchPage /></DashboardLayout>} />
        <Route path="/profile" element={<DashboardLayout><ProfilePage /></DashboardLayout>} />
        <Route path="/profile/:username" element={<DashboardLayout><ProfilePage /></DashboardLayout>} />
        <Route path="/shelf" element={<MyShelfPage />} />
        <Route path="/discover" element={<DashboardLayout><DiscoverPage /></DashboardLayout>} />
      </Routes>
    </BrowserRouter>
  );
}