import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestOnlyRoute } from './protectedRoutes';
import { routes } from './routes';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import TermsPage from './pages/TermsPage';
import DocsPage from './pages/DocsPage';

const App: React.FC = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Marketing */}
        <Route path={routes.home} element={<LandingPage />} />
        <Route path={routes.pricing} element={<PricingPage />} />
        <Route path={routes.about} element={<AboutPage />} />
        <Route path={routes.contact} element={<ContactPage />} />
        <Route path={routes.terms} element={<TermsPage />} />

        {/* Docs — wildcard so nested routes work */}
        <Route path={`${routes.docs}/*`} element={<DocsPage />} />

        {/* Auth — redirect to dashboard if already logged in */}
        <Route path={routes.login} element={<GuestOnlyRoute element={<LoginPage />} />} />
        <Route path={routes.signup} element={<GuestOnlyRoute element={<SignupPage />} />} />
        <Route
          path={routes.forgotPassword}
          element={<GuestOnlyRoute element={<ForgotPasswordPage />} />}
        />
        <Route
          path={routes.resetPassword}
          element={<GuestOnlyRoute element={<ResetPasswordPage />} />}
        />

        {/* App — protected routes: auth logic lives inside ProtectedRoute */}
        <Route
          path={`${routes.dashboard}/*`}
          element={<ProtectedRoute element={<DashboardPage />} />}
        />

        <Route path="*" element={<Navigate to={routes.home} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
