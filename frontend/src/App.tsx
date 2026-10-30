import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from '@/router';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { socketService } from '@/services/socketService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  const { isDark } = useThemeStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Connect WebSocket when user is logged in
  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    if (isAuthenticated && token && !socketService.isConnected()) {
      socketService.connect(token).catch(console.error);
    }
    if (!isAuthenticated) {
      socketService.disconnect();
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1F2937', // gray-800
            color: '#fff',
            border: '1px solid #374151', // gray-700
          },
          success: {
            iconTheme: {
              primary: '#F97316', // orange-500
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
};

export default App;
