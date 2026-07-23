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
import UserPage from './pages/UserPage';


export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-otp" element={<OtpVerificationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/signup/complete-profile" element={<GoogleSignupCompletePage />} />
        <Route path="/feed" element={<Feed/>}/>
        <Route path="/books" element={<BookPage />} />
<Route path="/users" element={<UserPage />} />
      </Routes>
    </BrowserRouter>
  );
}
