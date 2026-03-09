/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { BrandSetup } from './pages/BrandSetup';
import { ContentGenerator } from './pages/ContentGenerator';
import { Scheduler } from './pages/Scheduler';
import { Analytics } from './pages/Analytics';

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/brand-setup" element={<BrandSetup />} />
            <Route path="/generate" element={<ContentGenerator />} />
            <Route path="/schedule" element={<Scheduler />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
