import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '@/components/SplashScreen';
import OnboardingFlow from '@/components/OnboardingFlow';
import { useAuth } from '@/hooks/useAuth';

const ONBOARDING_COMPLETE_KEY = 'vigil_onboarding_complete';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [appState, setAppState] = useState<'splash' | 'onboarding' | 'done'>('splash');

  const handleSplashComplete = () => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (hasCompletedOnboarding === 'true') {
      setAppState('done');
    } else {
      setAppState('onboarding');
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setAppState('done');
  };

  // Redirect when done with splash/onboarding
  useEffect(() => {
    if (appState !== 'done') return;
    if (authLoading) return;

    if (user) {
      navigate('/', { replace: true });
    } else {
      navigate('/auth', { replace: true });
    }
  }, [appState, user, authLoading, navigate]);

  if (appState === 'splash') return <SplashScreen onComplete={handleSplashComplete} />;
  if (appState === 'onboarding') return <OnboardingFlow onComplete={handleOnboardingComplete} />;

  // Loading state while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center gap-2">
        <div className="w-6 h-2 bg-primary rounded-full" />
        <div className="w-6 h-6 bg-primary-foreground rounded-full border-2 border-primary flex items-center justify-center">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default Index;
