import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import FixItPage from '@/pages/fix-it';
import LearnPage from '@/pages/learn';
import ReviewPage from '@/pages/review';
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
    <Route path="/review" component={ReviewPage} />
    <Route path="/instructor/upload" component={InstructorUploadPage} />
    <Route path="/instructor" component={InstructorPage} />
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></TooltipProvider></QueryClientProvider>;
}

export default App;