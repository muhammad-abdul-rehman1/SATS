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
} from '@mui/material';
import { Email as EmailIcon, Key as KeyIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/services/auth';

export default function VerifyEmail() {
  const router = useRouter();
  const { verifyEmail } = useAuth();
  const { email: queryEmail, code: queryCode } = router.query;

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    if (queryEmail && typeof queryEmail === 'string') {
      setEmail(queryEmail);
    }
    if (queryCode && typeof queryCode === 'string') {
      setCode(queryCode);
    }
  }, [router.isReady, queryEmail, queryCode]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    if (!email.trim() || !code.trim()) {
      setError('Please enter your email and the 6-digit verification code.');
      return;
    }

    try {
      setIsLoading(true);
      await verifyEmail(email.trim(), code.trim());
      setIsVerified(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Please enter your email address to resend code.');
      return;
    }

    try {
      setIsResending(true);
      setError('');
      const res = await authAPI.resendVerification(email.trim());
      setInfoMsg(res.data.message || 'A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
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
                Verify Your Email
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', fontSize: '0.95rem' }}>
                Enter the 6-digit confirmation code sent to your email to activate your account.
              </Typography>
            </Box>

            {/* Notifications */}
            {error && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
                {error}
              </Alert>
            )}
            {infoMsg && (
              <Alert severity="info" sx={{ mb: 2.5, borderRadius: '12px' }}>
                {infoMsg}
              </Alert>
            )}

            {isVerified ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CheckCircleIcon sx={{ fontSize: '4.5rem', color: '#10b981', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                  Account Activated!
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                  Your email has been confirmed. Redirecting to your dashboard...
                </Typography>
                <CircularProgress size={24} color="primary" />
              </Box>
            ) : (
              <Box component="form" onSubmit={handleVerify} sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
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
                  placeholder="e.g. 123456"
                  inputProps={{ maxLength: 6, style: { letterSpacing: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' } }}
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
                  {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Verify Email & Log In'}
                </Button>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Button
                    onClick={handleResend}
                    disabled={isResending}
                    size="small"
                    sx={{ textTransform: 'none', color: '#0066FF', fontWeight: 600 }}
                  >
                    {isResending ? 'Sending...' : "Didn't receive code? Resend"}
                  </Button>

                  <Link href="/login" style={{ textDecoration: 'none' }}>
                    <Typography variant="body2" sx={{ color: '#64748b', '&:hover': { textDecoration: 'underline' } }}>
                      Back to Login
                    </Typography>
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
