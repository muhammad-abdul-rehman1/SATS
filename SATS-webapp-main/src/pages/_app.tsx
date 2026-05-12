import React from 'react';
import type { AppProps } from 'next/app';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from '@/contexts/AuthContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0066FF',
      light: '#3399FF',
      dark: '#0052CC',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#00D9FF',
      light: '#00E5FF',
      dark: '#00A8CC',
      contrastText: '#001A4D',
    },
    background: {
      default: '#F5F7FB',
      paper: '#FFFFFF',
    },
    success: {
      main: '#00D97D',
    },
    warning: {
      main: '#FFB84D',
    },
    error: {
      main: '#FF4D7D',
    },
    info: {
      main: '#00D9FF',
    },
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '-0.015625em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px',
          fontSize: '1rem',
          padding: '10px 24px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #0066FF 0%, #0099FF 100%)',
          boxShadow: '0 4px 15px rgba(0, 102, 255, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #0052CC 0%, #0080FF 100%)',
            boxShadow: '0 6px 20px rgba(0, 102, 255, 0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          border: '1px solid rgba(0, 102, 255, 0.1)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(245, 247, 251, 0.5) 100%)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '&:hover fieldset': {
              borderColor: '#0066FF',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#0066FF',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #001A4D 0%, #000D26 100%)',
          boxShadow: '0 2px 8px rgba(0, 102, 255, 0.15)',
        },
      },
    },
  },
});

function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
