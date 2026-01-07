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
      </Layout>
    </ThemeProvider>
  );
}

export default App;
