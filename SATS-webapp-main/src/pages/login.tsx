import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import { Email as EmailIcon, Lock as LockIcon, AccountCircle as AccountCircleIcon } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { usePublicRoute } from '@/hooks/useRoute';

export default function Login() {
  const router = useRouter();
  const { login, register, isLoading, error } = useAuth();
  const { isAuthenticated, isLoading: authLoading } = usePublicRoute();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password || (isSignUp && !name)) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      if (isSignUp) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      router.push('/');
    } catch (err: any) {
      setFormError(err.response?.data?.message || (isSignUp ? 'Registration failed' : 'Login failed'));
    }
  };

  if (!authLoading && isAuthenticated) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #001A4D 0%, #000D26 50%, #001A4D 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(0, 217, 255, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          top: '-100px',
          right: '-100px',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(0, 102, 255, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          bottom: '-50px',
          left: '-50px',
        },
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            position: 'relative',
            zIndex: 1,
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '28px',
            boxShadow: '0 8px 32px rgba(0, 102, 255, 0.15), 0 0 1px rgba(0, 217, 255, 0.5)',
            overflow: 'hidden',
          }}
        >
          {/* Gradient top accent */}
          <Box
            sx={{
              height: '4px',
              background: 'linear-gradient(90deg, #0066FF 0%, #00D9FF 50%, #0066FF 100%)',
            }}
          />

          <CardContent sx={{ p: 4 }}>
            {/* Logo/Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 2,
                  position: 'relative',
                  width: '100%',
                  height: '120px',
                  alignItems: 'center',
                }}
              >
                <Image
                  src="/images/sats.png"
                  alt="SATS Logo"
                  width={100}
                  height={100}
                  priority
                  style={{
                    objectFit: 'contain',
                    borderRadius: '20%',
                  }}
                />
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                  letterSpacing: '1px',
                }}
              >
                SATS
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#666',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                }}
              >
                Smart Asset Tracker System
              </Typography>
            </Box>

            {/* Error Alert */}
            {formError && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  backgroundColor: 'rgba(255, 77, 125, 0.1)',
                  color: '#FF4D7D',
                  border: '1px solid rgba(255, 77, 125, 0.3)',
                  borderRadius: '8px',
                  '& .MuiAlert-icon': {
                    color: '#FF4D7D',
                  },
                }}
              >
                {formError}
              </Alert>
            )}
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  backgroundColor: 'rgba(255, 77, 125, 0.1)',
                  color: '#FF4D7D',
                  border: '1px solid rgba(255, 77, 125, 0.3)',
                  borderRadius: '8px',
                  '& .MuiAlert-icon': {
                    color: '#FF4D7D',
                  },
                }}
              >
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {isSignUp && (
                <TextField
                  fullWidth
                  label="Full Name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircleIcon sx={{ color: '#0066FF', mr: 1, fontSize: '1.2rem' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      fontSize: '0.95rem',
                      transition: 'all 0.3s ease',
                      '&:hover fieldset': {
                        borderColor: '#0066FF',
                        borderWidth: '2px',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#0066FF',
                        borderWidth: '2px',
                        boxShadow: '0 0 0 3px rgba(0, 102, 255, 0.1)',
                      },
                    },
                    '& .MuiOutlinedInput-input': {
                      color: '#333',
                      '&::placeholder': {
                        color: '#999',
                        opacity: 1,
                      },
                    },
                  }}
                />
              )}

              <TextField
                fullWidth
                label="Email Address"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: '#0066FF', mr: 1, fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                    '&:hover fieldset': {
                      borderColor: '#0066FF',
                      borderWidth: '2px',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#0066FF',
                      borderWidth: '2px',
                      boxShadow: '0 0 0 3px rgba(0, 102, 255, 0.1)',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    color: '#333',
                    '&::placeholder': {
                      color: '#999',
                      opacity: 1,
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#0066FF', mr: 1, fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                    '&:hover fieldset': {
                      borderColor: '#0066FF',
                      borderWidth: '2px',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#0066FF',
                      borderWidth: '2px',
                      boxShadow: '0 0 0 3px rgba(0, 102, 255, 0.1)',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    color: '#333',
                    '&::placeholder': {
                      color: '#999',
                      opacity: 1,
                    },
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{
                  mt: 1,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #0066FF 0%, #0099FF 100%)',
                  boxShadow: '0 4px 15px rgba(0, 102, 255, 0.3)',
                  borderRadius: '10px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0052CC 0%, #0080FF 100%)',
                    boxShadow: '0 6px 25px rgba(0, 102, 255, 0.4)',
                    transform: 'translateY(-2px)',
                  },
                  '&:disabled': {
                    opacity: 0.7,
                  },
                }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
              </Button>
              
              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  {isSignUp ? "Already have an account? " : "Don't have an account? "}
                  <Button 
                    variant="text" 
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setFormError('');
                    }}
                    sx={{ 
                      textTransform: 'none', 
                      fontWeight: 700, 
                      color: '#0066FF',
                      p: 0,
                      minWidth: 'auto',
                      '&:hover': { background: 'transparent', textDecoration: 'underline' }
                    }}
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Button>
                </Typography>
              </Box>
            </Box>

            {/* Slogan */}
            <Box
              sx={{
                backgroundColor: 'rgba(0, 102, 255, 0.05)',
                border: '1px solid rgba(0, 102, 255, 0.1)',
                borderRadius: '8px',
                marginTop: 4,
                p: 2.5,
                textAlign: 'center',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: '#0066FF',
                  fontWeight: 600,
                  fontSize: '1rem',
                  letterSpacing: '0.3px',
                  lineHeight: '1.6',
                }}
              >
                Track, Monitor & Manage Your Assets Effortlessly
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: '#999',
                  fontWeight: 500,
                  mt: 1,
                  fontSize: '0.85rem',
                }}
              >
                Powered by Smart Asset Tracker System
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
