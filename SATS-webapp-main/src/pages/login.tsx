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
import {
  Email as EmailIcon,
  Lock as LockIcon,
  AccountCircle as AccountCircleIcon,
  Shield as ShieldIcon,
  VpnKey as KeyIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { usePublicRoute } from '@/hooks/useRoute';
import { authAPI } from '@/services/auth';

export default function Login() {
  const router = useRouter();
  const { login, verify2FA, register, isLoading, error } = useAuth();
  const { isAuthenticated, isLoading: authLoading } = usePublicRoute();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  // FR02-06: Two-Factor Authentication State
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [twoFactorSuccessMsg, setTwoFactorSuccessMsg] = useState('');

  // FR02-04: Account Lockout State
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsLocked(false);

    if (!email || !password || (isSignUp && !name)) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      if (isSignUp) {
        const res = await register(name, email, password);
        if (res?.requireVerification) {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
      } else {
        const res = await login(email, password);
        if (res?.require2FA) {
          setTwoFactorRequired(true);
          setTempToken(res.tempToken || '');
          setTwoFactorEmail(res.email || email);
          return;
        }
      }
      router.push('/');
    } catch (err: any) {
      if (err.response?.data?.requireVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(err.response.data.email || email)}`);
        return;
      }
      if (err.response?.status === 423 || err.response?.data?.isLocked) {
        setIsLocked(true);
        setLockoutRemaining(err.response.data?.remainingMinutes || 15);
      }
      setFormError(err.response?.data?.message || (isSignUp ? 'Registration failed' : 'Login failed'));
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setTwoFactorSuccessMsg('');

    if (!twoFactorCode || twoFactorCode.trim().length !== 6) {
      setFormError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    try {
      setVerifying2FA(true);
      await verify2FA(tempToken, twoFactorCode.trim());
      router.push('/');
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || '2FA verification failed.');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleResend2FA = async () => {
    if (resendCooldown > 0) return;
    try {
      setFormError('');
      const res = await authAPI.resend2FA(tempToken);
      setTwoFactorSuccessMsg(res.data.message || 'A new 2FA code has been sent to your email.');
      setResendCooldown(30);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to resend 2FA code');
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

            {/* Logout & Session Inactivity Alerts */}
            {router.query.reason === 'inactivity' ? (
              <Alert
                severity="warning"
                sx={{
                  mb: 2,
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  color: '#e65100',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  borderRadius: '8px',
                  '& .MuiAlert-icon': { color: '#e65100' }
                }}
              >
                Your session expired due to 15 minutes of inactivity. Please log in again to continue.
              </Alert>
            ) : router.query.loggedOut === 'true' ? (
              <Alert
                severity="success"
                sx={{
                  mb: 2,
                  backgroundColor: 'rgba(0, 200, 83, 0.1)',
                  color: '#00701a',
                  border: '1px solid rgba(0, 200, 83, 0.3)',
                  borderRadius: '8px',
                  '& .MuiAlert-icon': { color: '#00701a' }
                }}
              >
                You have been logged out successfully.
              </Alert>
            ) : null}

            {/* Account Lockout Alert (FR02-04) */}
            {isLocked && (
              <Alert
                severity="warning"
                sx={{
                  mb: 2,
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  color: '#e65100',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  borderRadius: '8px',
                  '& .MuiAlert-icon': { color: '#e65100' }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Account Temporarily Locked
                </Typography>
                Too many consecutive failed login attempts. For security, your account is locked for {lockoutRemaining ?? 15} minute(s).
                <Box sx={{ mt: 1 }}>
                  <Link href="/forgot-password" style={{ color: '#0066FF', fontWeight: 600, textDecoration: 'underline' }}>
                    Reset your password to unlock immediately
                  </Link>
                </Box>
              </Alert>
            )}

            {/* Consolidated Error Alert */}
            {(formError || (!isLocked && error)) && (
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
                {formError || error}
              </Alert>
            )}

            {/* FR02-06: Two-Factor Authentication Form */}
            {twoFactorRequired ? (
              <Box component="form" onSubmit={handleVerify2FA} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ textAlign: 'center', mb: 1 }}>
                  <ShieldIcon sx={{ fontSize: 50, color: '#0066FF', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#001A4D' }}>
                    Two-Factor Authentication
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                    Enter the 6-digit verification code sent to <strong>{twoFactorEmail}</strong>
                  </Typography>
                </Box>

                {twoFactorSuccessMsg && (
                  <Alert severity="success" sx={{ mb: 1, borderRadius: '8px' }}>
                    {twoFactorSuccessMsg}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  autoFocus
                  label="6-Digit 2FA Code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  variant="outlined"
                  inputProps={{
                    inputMode: 'numeric',
                    maxLength: 6,
                    style: { textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem', fontWeight: 700 },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <KeyIcon sx={{ color: '#0066FF', fontSize: '1.2rem' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      '&.Mui-focused fieldset': {
                        borderColor: '#0066FF',
                        borderWidth: '2px',
                      },
                    },
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={verifying2FA || twoFactorCode.length !== 6}
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #0066FF 0%, #0099FF 100%)',
                    boxShadow: '0 4px 15px rgba(0, 102, 255, 0.3)',
                    borderRadius: '10px',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0052CC 0%, #0080FF 100%)',
                    },
                  }}
                >
                  {verifying2FA ? <CircularProgress size={24} color="inherit" /> : 'Verify & Sign In'}
                </Button>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Button
                    variant="text"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => {
                      setTwoFactorRequired(false);
                      setTwoFactorCode('');
                      setFormError('');
                      setTwoFactorSuccessMsg('');
                    }}
                    sx={{ textTransform: 'none', color: '#64748b' }}
                  >
                    Back to Login
                  </Button>

                  <Button
                    variant="text"
                    onClick={handleResend2FA}
                    disabled={resendCooldown > 0}
                    sx={{ textTransform: 'none', fontWeight: 600, color: '#0066FF' }}
                  >
                    {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                  </Button>
                </Box>
              </Box>
            ) : (
              /* Regular Login/Sign-Up Form */
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

                {!isSignUp && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1, mb: 1 }}>
                    <Link href="/forgot-password" style={{ textDecoration: 'none' }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#0066FF',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        Forgot Password?
                      </Typography>
                    </Link>
                  </Box>
                )}

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
            )}

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
