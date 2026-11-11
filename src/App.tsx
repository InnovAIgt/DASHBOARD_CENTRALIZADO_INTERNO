import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReportProvider } from './context/ReportContext';
import { PortalLayout } from './components/layout/PortalLayout';
import { LoginView } from './components/views/LoginView';

const AppRoot: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return <PortalLayout />;
};

export default function App() {
  return (
    <AuthProvider>
      <ReportProvider>
        <AppRoot />
      </ReportProvider>
    </AuthProvider>
  );
}
