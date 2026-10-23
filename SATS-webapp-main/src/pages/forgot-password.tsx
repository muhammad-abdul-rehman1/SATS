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
import { Email as EmailIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { authAPI } from '@/services/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessInfo(null);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setIsLoading(true);
      const res = await authAPI.forgotPassword(email);
      setSuccessInfo({
        message: res.data.message || 'Password reset instructions sent to your email.',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send password reset request. Please try again.');
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
                Reset Password
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', fontSize: '0.95rem' }}>
                Enter your registered email address and we will send you a link to reset your password.
              </Typography>
            </Box>

            {/* Error Message */}
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                {error}
              </Alert>
            )}

            {/* Success Feedback */}
            {successInfo ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Alert
                  severity="success"
                  sx={{
                    mb: 3,
                    borderRadius: '12px',
                    textAlign: 'left',
                  }}
                >
                  {successInfo.message}
                </Alert>

                <Typography variant="body2" sx={{ color: '#475569', mb: 3 }}>
                  Please check your inbox (including Spam folder) for the verification link or 6-digit code.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Link href={`/reset-password?email=${encodeURIComponent(email)}`} style={{ textDecoration: 'none' }}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      sx={{
                        py: 1.5,
                        fontWeight: 700,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #0066FF 0%, #0099FF 100%)',
                        borderRadius: '10px',
                      }}
                    >
                      Enter Code & Set New Password
                    </Button>
                  </Link>

                  <Link href="/login" style={{ textDecoration: 'none' }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      size="large"
                      sx={{
                        py: 1.3,
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '10px',
                      }}
                    >
                      Return to Login
                    </Button>
                  </Link>
                </Box>
              </Box>
            ) : (
              /* Request Form */
              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
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
                      '&:hover fieldset': { borderColor: '#0066FF', borderWidth: '2px' },
                      '&.Mui-focused fieldset': {
                        borderColor: '#0066FF',
                        borderWidth: '2px',
                        boxShadow: '0 0 0 3px rgba(0, 102, 255, 0.1)',
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
                    borderRadius: '10px',
                    boxShadow: '0 8px 20px rgba(0, 102, 255, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0052CC 0%, #0088FF 100%)',
                      boxShadow: '0 12px 25px rgba(0, 102, 255, 0.4)',
                    },
                  }}
                >
                  {isLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} color="inherit" />
                      <span>Sending Instructions...</span>
                    </Box>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Link href="/login" style={{ textDecoration: 'none' }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#0066FF', '&:hover': { textDecoration: 'underline' } }}>
                      <ArrowBackIcon sx={{ fontSize: '1rem' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Back to Login
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
