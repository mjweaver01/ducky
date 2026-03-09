import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, GuestOnlyRoute } from './protectedRoutes';
import { routes } from './routes';
import ErrorBoundary from './components/ErrorBoundary';
import SuspenseFallback from './components/SuspenseFallback';

// Lazy load all page components
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const LoadingFallback = () => <SuspenseFallback size={100} />;

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Suspense fallback={<LoadingFallback />}>
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

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
