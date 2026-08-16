import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import FixItPage from '@/pages/fix-it';
import LearnPage from '@/pages/learn';
import ReviewPage from '@/pages/review';
import OpportunitiesPage from '@/pages/opportunities';
import InstructorPage from '@/pages/instructor';
import InstructorUploadPage from '@/pages/instructor-upload';
import { Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

const queryClient = new QueryClient();

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={Home} />
    <Route path="/fix/:submissionId" component={FixItPage} />
    <Route path="/learn" component={LearnPage} />
    <Route path="/opportunities" component={OpportunitiesPage} />
    <Route path="/review" component={ReviewPage} />
    <Route path="/instructor/upload" component={InstructorUploadPage} />
    <Route path="/instructor" component={InstructorPage} />
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1600);
    const hideTimer = setTimeout(() => setVisible(false), 2200);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '14px',
        transition: 'opacity 0.55s ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <span style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 'clamp(2.4rem, 6vw, 4rem)',
        fontWeight: 800,
        color: '#fff',
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}>
        EduRithm
      </span>
      <span style={{
        fontSize: 'clamp(0.8rem, 2vw, 1rem)',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 400,
        letterSpacing: '0.01em',
      }}>
        Transforming education &amp; human capital in Nigeria
      </span>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SplashScreen />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;