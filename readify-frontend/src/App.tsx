import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import SignupPage from './pages/SignupPage';
import GoogleSignupCompletePage from './pages/GoogleSignupCompletePage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup/complete-profile" element={<GoogleSignupCompletePage />} />
        <Route path="/" element={<Navigate to="/signup" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
