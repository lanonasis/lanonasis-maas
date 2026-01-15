import React from 'react';
import { IDEPanel } from '../components/IDEPanel';
import { ErrorBoundary } from '../components/ErrorBoundary';

/**
 * Main App Component
 *
 * Wrapped in ErrorBoundary to catch React errors and display
 * a fallback UI instead of crashing to a blank screen.
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary fallbackMessage="The Memory panel encountered an error.">
      <IDEPanel />
    </ErrorBoundary>
  );
};

export default App;
