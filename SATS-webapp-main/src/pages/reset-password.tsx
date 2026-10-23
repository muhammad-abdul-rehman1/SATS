import React, { useState, useEffect } from 'react';
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
  LinearProgress,
} from '@mui/material';
import { Lock as LockIcon, CheckCircle as CheckCircleIcon, Email as EmailIcon, Key as KeyIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { authAPI } from '@/services/auth';

export default function ResetPassword() {
  const router = useRouter();
  const { token, email: queryEmail } = router.query;

  const [mode, setMode] = useState<'token' | 'code'>('code');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    if (queryEmail && typeof queryEmail === 'string') {
      setEmail(queryEmail);
    }

    if (token && typeof token === 'string') {
      setMode('token');
      setIsVerifyingToken(true);
      authAPI.verifyResetToken(token)
        .then((res) => {
          setTokenValid(true);
          setEmail(res.data.email);
        })
        .catch((err) => {
          setTokenValid(false);
          setError(err.response?.data?.message || 'Password reset link is invalid or has expired.');
        })
        .finally(() => {
          setIsVerifyingToken(false);
        });
    } else {
      setMode('code');
    }
  }, [router.isReady, token, queryEmail]);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 30;
    if (pass.length >= 8) score += 20;
    if (/[A-Z]/.test(pass)) score += 20;
    if (/[0-9]/.test(pass)) score += 15;
    if (/[^A-Za-z0-9]/.test(pass)) score += 15;
    return Math.min(100, score);
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'code') {
      if (!email.trim() || !code.trim()) {
        setError('Please enter your email and 6-digit verification code.');
        return;
      }
    }

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      if (mode === 'token') {
        await authAPI.resetPassword({
          token: token as string,
          password,
        });
      } else {
        await authAPI.resetPassword({
          email: email.trim(),
          code: code.trim(),
          password,
        });
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

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
            boxShadow: '0 20px 60px rgba(0, 102, 255, 0.15)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            {/* Logo and Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 2,
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.1) 0%, rgba(0, 217, 255, 0.1) 100%)',
                  mb: 2,
                  border: '1px solid rgba(0, 102, 255, 0.2)',
                }}
              >
                <Image
                  src="/images/sats.png"
                  alt="SATS Logo"
                  width={64}
                  height={64}
                  priority
                />
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #001A4D 0%, #0066FF 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                Set New Password
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', fontSize: '0.95rem' }}>
                {mode === 'token' && email
                  ? `Resetting password for ${email}`
                  : 'Enter your verification code and set a strong new password.'}
              </Typography>
            </Box>

            {/* Verifying Token State */}
            {isVerifyingToken ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
                <CircularProgress color="primary" />
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Verifying reset link...
                </Typography>
              </Box>
            ) : mode === 'token' && !tokenValid && !success ? (
              /* Invalid Token */
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
                  {error || 'This password reset link is invalid or has expired.'}
                </Alert>
                <Link href="/forgot-password" style={{ textDecoration: 'none' }}>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{
                      py: 1.5,
                      fontWeight: 700,
                      borderRadius: '10px',
                      textTransform: 'none',
                      background: 'linear-gradient(135deg, #0066FF 0%, #0099FF 100%)',
                    }}
                  >
                    Request New Reset Link
                  </Button>
                </Link>
              </Box>
            ) : success ? (
              /* Success Screen */
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ display: 'inline-flex', color: '#10b981', mb: 2 }}>
                  <CheckCircleIcon sx={{ fontSize: '4rem' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                  Password Reset Successful!
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                  Your password has been changed securely. You can now sign in with your new password.
                </Typography>
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    sx={{
                      py: 1.5,
                      fontWeight: 700,
                      borderRadius: '10px',
                      textTransform: 'none',
                      background: 'linear-gradient(135deg, #0066FF 0%, #0099FF 100%)',
                    }}
                  >
                    Proceed to Login
                  </Button>
                </Link>
              </Box>
            ) : (
              /* Password Reset Form */
              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
                {error && (
                  <Alert severity="error" sx={{ borderRadius: '12px' }}>
                    {error}
                  </Alert>
                )}

                {/* Email (only if not using valid token link) */}
                {mode === 'code' && (
                  <>
                    <TextField
                      fullWidth
                      label="Registered Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon sx={{ color: '#0066FF', mr: 1, fontSize: '1.2rem' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />

                    <TextField
                      fullWidth
                      label="6-Digit Verification Code"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. 481920"
                      inputProps={{ maxLength: 6, style: { letterSpacing: '4px', fontWeight: 'bold' } }}
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <KeyIcon sx={{ color: '#0066FF', mr: 1, fontSize: '1.2rem' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                  </>
                )}

                <Box>
                  <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
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
                        '&:hover fieldset': { borderColor: '#0066FF', borderWidth: '2px' },
                        '&.Mui-focused fieldset': { borderColor: '#0066FF', borderWidth: '2px' },
                      },
                    }}
                  />
                  {password ? (
                    <Box sx={{ mt: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={strength}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#e2e8f0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: strength > 70 ? '#10b981' : strength > 40 ? '#f59e0b' : '#ef4444',
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                        Strength: {strength > 70 ? 'Strong' : strength > 40 ? 'Moderate' : 'Weak'}
                      </Typography>
                    </Box>
                  ) : null}
                </Box>

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
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
                      '&:hover fieldset': { borderColor: '#0066FF', borderWidth: '2px' },
                      '&.Mui-focused fieldset': { borderColor: '#0066FF', borderWidth: '2px' },
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
                    borderRadius: '10px',
                    boxShadow: '0 8px 20px rgba(0, 102, 255, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0052CC 0%, #0088FF 100%)',
                    },
                  }}
                >
                  {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm & Update Password'}
                </Button>

                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Link href="/login" style={{ textDecoration: 'none' }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#0066FF', '&:hover': { textDecoration: 'underline' } }}>
                      <ArrowBackIcon sx={{ fontSize: '1rem' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Return to Login
                      </Typography>
                    </Box>
                  </Link>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
