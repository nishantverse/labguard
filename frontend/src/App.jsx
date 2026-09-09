import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Computers from './pages/Computers';
import ComputerDetails from './pages/ComputerDetails';
import Events from './pages/Events';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111827',
            color: '#e5e7eb',
            border: '1px solid rgba(75, 85, 99, 0.4)',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontFamily: 'Inter, sans-serif',
          },
          success: { 
            iconTheme: { primary: '#10b981', secondary: '#111827' },
            style: { borderLeft: '4px solid #10b981' }
          },
          error: { 
            iconTheme: { primary: '#ef4444', secondary: '#111827' },
            style: { borderLeft: '4px solid #ef4444' }
          },
        }}
      />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/computers" element={<Computers />} />
          <Route path="/computers/:id" element={<ComputerDetails />} />
          <Route path="/events" element={<Events />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}
