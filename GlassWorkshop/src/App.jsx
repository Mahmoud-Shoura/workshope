import { useState, useEffect } from 'react';
import { Layout } from './components/Layout/Layout';
import { Calculator } from './components/Calculator/Calculator';
import { GlassTypeManager } from './components/GlassTypeManager/GlassTypeManager';
import { History } from './components/History/History';
import { ThemeProvider } from './components/ThemeProvider/ThemeProvider';

function App() {
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    return ['calculator', 'inventory', 'history'].includes(hash) ? hash : 'calculator';
  };

  const [currentView, setCurrentView] = useState(getInitialView);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['calculator', 'inventory', 'history'].includes(hash)) {
        setCurrentView(hash);
      } else if (!hash) {
        setCurrentView('calculator');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    // Ensure hash is set initially
    if (!window.location.hash) {
      window.location.hash = 'calculator';
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleViewChange = (view) => {
    window.location.hash = view;
    setCurrentView(view);
  };

  return (
    <ThemeProvider>
      <Layout currentView={currentView} onViewChange={handleViewChange}>
        {currentView === 'calculator' && <Calculator />}
        {currentView === 'inventory' && <GlassTypeManager />}
        {currentView === 'history' && <History />}
      </Layout>
    </ThemeProvider>
  );
}

export default App;
