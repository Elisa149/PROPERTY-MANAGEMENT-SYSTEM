import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import { Box, Typography, Button } from '@mui/material';

import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import theme from './theme/theme';
import './index.css';

// Create a client for React Query with optimized settings for fresh data
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0, // Data is stale immediately - ensures fresh data on mount
      cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (for quick navigation)
      refetchOnMount: true, // Always refetch when component mounts
    },
    mutations: {
      retry: 1,
    },
  },
});

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ Error caught by boundary:', error);
    console.error('❌ Error info:', errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="h4" color="error" gutterBottom>
            ⚠️ Something went wrong
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, mb: 2, maxWidth: 600 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          {this.state.error?.stack && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, maxWidth: 800, textAlign: 'left', overflow: 'auto' }}>
              <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {this.state.error.stack}
              </Typography>
            </Box>
          )}
          <Button 
            variant="contained" 
            sx={{ mt: 3 }}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AuthProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#333',
                    color: '#fff',
                  },
                }}
              />
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
