import { useState, useEffect } from 'react';
import { Layout } from './components/Layout/Layout';
import { Calculator } from './components/Calculator/Calculator';
import { GlassTypeManager } from './components/GlassTypeManager/GlassTypeManager';
import { History } from './components/History/History';
import { Settings } from './components/Settings/Settings';
import { ThemeProvider } from './components/ThemeProvider/ThemeProvider';
import { LoginPage } from './components/LoginPage/LoginPage';
import { LandingPage } from './components/LandingPage/LandingPage';
import { SubscriptionBlock } from './components/Subscription/SubscriptionBlock';
import { useGlassStore, GlassStoreProvider } from './hooks/useGlassStore';

// Inner app that has access to the store
function AppContent() {
  const { currentUser, subscription, loading } = useGlassStore();
  const [showAuth, setShowAuth] = useState(false);

  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    return ['calculator', 'inventory', 'history', 'settings'].includes(hash) ? hash : 'calculator';
  };

  const [currentView, setCurrentView] = useState(getInitialView);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['calculator', 'inventory', 'history', 'settings'].includes(hash)) {
        setCurrentView(hash);
      } else if (!hash) {
        setCurrentView('calculator');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    if (!window.location.hash) {
      window.location.hash = 'calculator';
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleViewChange = (view) => {
    window.location.hash = view;
    setCurrentView(view);
  };

  if (loading) {
    return (
      <div style={{
        background: '#0f172a',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff',
        fontFamily: 'sans-serif'
      }}>
        <h2>جاري تحميل البيانات...</h2>
      </div>
    );
  }

  // Show landing page if not logged in and hasn't clicked "Get Started"
  if (!currentUser) {
    if (!showAuth) {
      return <LandingPage onGetStarted={() => setShowAuth(true)} />;
    }
    return <LoginPage />;
  }

  // If subscription has expired, prompt to pay
  if (subscription?.status === 'expired') {
    return <SubscriptionBlock />;
  }

  return (
    <Layout currentView={currentView} onViewChange={handleViewChange}>
      {currentView === 'calculator' && <Calculator />}
      {currentView === 'inventory' && <GlassTypeManager />}
      {currentView === 'history' && <History />}
      {currentView === 'settings' && <Settings />}
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <GlassStoreProvider>
        <AppContent />
      </GlassStoreProvider>
    </ThemeProvider>
  );
}


export default App;
