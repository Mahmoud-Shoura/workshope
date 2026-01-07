import { useState } from 'react';
import { Layout } from './components/Layout/Layout';
import { Calculator } from './components/Calculator/Calculator';

import { GlassTypeManager } from './components/GlassTypeManager/GlassTypeManager';
import { History } from './components/History/History';
import { ThemeProvider } from './components/ThemeProvider/ThemeProvider';

function App() {
  const [currentView, setCurrentView] = useState('calculator');

  return (
    <ThemeProvider>
      <Layout currentView={currentView} onViewChange={setCurrentView}>
        {currentView === 'calculator' && <Calculator />}
        {currentView === 'inventory' && <GlassTypeManager />}
        {currentView === 'history' && <History />}
        {currentView === 'settings' && (
          <div className="text-center py-20 text-muted-foreground">
            <h2 className="text-xl">Settings</h2>
            <p>Theme configuration coming soon.</p>
          </div>
        )}
      </Layout>
    </ThemeProvider>
  );
}

export default App;
