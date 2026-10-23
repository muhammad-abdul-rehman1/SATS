import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box, Button, Card, CardContent, Container, Typography,
  CircularProgress, Grid, Alert, Divider, Avatar, TextField,
  Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Snackbar, LinearProgress, Switch, FormControlLabel,
} from '@mui/material';
import {
  Person as PersonIcon, Lock as LockIcon, Inventory as AssetIcon,
  History as HistoryIcon, QrCode as QrIcon, MeetingRoom as RoomIcon,
  Shield as ShieldIcon, Security as SecurityIcon, Public as PublicIcon,
} from '@mui/icons-material';
import { Layout } from '@/components/Layout/MainLayout';
import { useProtectedRoute } from '@/hooks/useRoute';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/services/users';
import { authAPI } from '@/services/auth';
import { assetsAPI } from '@/services/assets';
import { scanHistoryAPI } from '@/services/scanHistory';
import { formatDateTime, formatLabel } from '@/utils/formatting';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE:      { bg: '#e8f5e9', color: '#2e7d32' },
  INACTIVE:    { bg: '#f5f5f5', color: '#616161' },
  MAINTENANCE: { bg: '#fff3e0', color: '#e65100' },
  RETIRED:     { bg: '#ffebee', color: '#c62828' },
};

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const { user, refreshUser } = useAuth();

  const [myAssets, setMyAssets]         = useState<any[]>([]);
  const [scanLogs, setScanLogs]         = useState<any[]>([]);
  const [scanStats, setScanStats]       = useState<any>(null);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [toggling2FA, setToggling2FA]   = useState(false);
  const [loading, setLoading]           = useState(true);

  // Edit profile form
  const [editName, setEditName]       = useState('');
  const [editEmail, setEditEmail]     = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg]   = useState('');
  const [profileErr, setProfileErr]   = useState('');

  // Change password form
  const [newPassword, setNewPassword]   = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [savingPw, setSavingPw]         = useState(false);
  const [pwMsg, setPwMsg]               = useState('');
  const [pwErr, setPwErr]               = useState('');

  const [snackbar, setSnackbar] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [assetsRes, scanRes, statsRes, historyRes] = await Promise.all([
        assetsAPI.getAll({ limit: 100 }),
        scanHistoryAPI.getScanHistory(1, 10),
        scanHistoryAPI.getScanStats(),
        authAPI.getMyLoginHistory().catch(() => ({ data: { logs: [] } })),
      ]);
      const all = (assetsRes.data as any).data ?? (assetsRes.data as any) ?? [];
      const uid = (user as any)?._id || (user as any)?.id;
      setMyAssets(Array.isArray(all) ? all.filter((a: any) => {
        const oid = a.ownerId?._id ?? a.ownerId;
        return String(oid) === String(uid);
      }) : []);
      setScanLogs((scanRes.data as any).scanLogs ?? []);
      setScanStats((statsRes.data as any));
      setLoginHistory((historyRes.data as any)?.logs ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || authLoading || !user) return;
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setTwoFactorEnabled(Boolean(user.twoFactorEnabled));
    loadData();
  }, [isAuthenticated, authLoading, user, loadData]);

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      setProfileErr('');
      const uid = (user as any)?._id || (user as any)?.id;
      await usersAPI.update(uid, { name: editName, email: editEmail });
      setProfileMsg('Profile updated successfully!');
      setSnackbar('Profile updated!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err: any) {
      setProfileErr(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPw) { setPwErr('Passwords do not match'); return; }
    if (newPassword.length < 6)   { setPwErr('Password must be at least 6 characters'); return; }
    try {
      setSavingPw(true);
      setPwErr('');
      const uid = (user as any)?._id || (user as any)?.id;
      await usersAPI.update(uid, { password: newPassword } as any);
      setPwMsg('Password changed successfully!');
      setNewPassword('');
      setConfirmPw('');
      setSnackbar('Password changed!');
      setTimeout(() => setPwMsg(''), 3000);
    } catch (err: any) {
      setPwErr(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  const handleToggle2FA = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextState = e.target.checked;
    try {
      setToggling2FA(true);
      const res = await authAPI.toggle2FA(nextState);
      setTwoFactorEnabled(res.data.twoFactorEnabled);
      if (refreshUser) await refreshUser();
      setSnackbar(res.data.message || `2FA ${nextState ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      setSnackbar(err.response?.data?.message || 'Failed to update 2FA setting');
    } finally {
      setToggling2FA(false);
    }
  };

  if (!isAuthenticated || authLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  const totalScans = scanStats?.totalScans ?? 0;
  const assetScans = scanStats?.byType?.find((b: any) => b._id === 'ASSET')?.count ?? 0;
  const roomScans  = scanStats?.byType?.find((b: any) => b._id === 'ROOM')?.count  ?? 0;

  return (
    <Layout>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4, pt: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 1 }}>
            My Profile
          </Typography>
          <Typography variant="body2" color="textSecondary">Manage your account, view your assets and activity</Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: '#0066FF' }} /></Box>
        ) : (
          <Grid container spacing={3}>

            {/* ── Left column ─────────────────────────────────────── */}
            <Grid item xs={12} md={4}>
              {/* Avatar card */}
              <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px', mb: 3, textAlign: 'center', p: 3 }}>
                <Avatar sx={{ width: 90, height: 90, mx: 'auto', mb: 2, background: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)', fontSize: '2.5rem', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(0,217,255,0.3)' }}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#001A4D' }}>{user?.name}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{user?.email}</Typography>
                <Chip label={user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'User'} size="small" sx={{ backgroundColor: 'rgba(0,102,255,0.1)', color: '#0066FF', fontWeight: 700 }} />
              </Card>

              {/* Scan Stats card */}
              <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px', mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <QrIcon sx={{ color: '#0066FF' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>My Scan Stats</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {[
                    { label: 'Total Scans', value: totalScans, color: '#7C3AED' },
                    { label: 'Asset Scans', value: assetScans, color: '#0066FF' },
                    { label: 'Room Scans',  value: roomScans,  color: '#059669' },
                    { label: 'My Assets',   value: myAssets.length, color: '#e65100' },
                  ].map(stat => (
                    <Box key={stat.label} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="textSecondary">{stat.label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: stat.color }}>{stat.value}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={totalScans ? Math.min(100, (stat.value / Math.max(totalScans, myAssets.length, 1)) * 100) : 0}
                        sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { backgroundColor: stat.color, borderRadius: 3 } }} />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* ── Right column ─────────────────────────────────────── */}
            <Grid item xs={12} md={8}>

              {/* Edit Profile */}
              <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px', mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PersonIcon sx={{ color: '#0066FF' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Edit Profile</Typography>
                  </Box>
                  <Divider sx={{ mb: 3 }} />
                  {profileMsg && <Alert severity="success" sx={{ mb: 2 }}>{profileMsg}</Alert>}
                  {profileErr && <Alert severity="error"   sx={{ mb: 2 }}>{profileErr}</Alert>}
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Full Name" value={editName} onChange={e => setEditName(e.target.value)} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Email" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} size="small" />
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" onClick={handleSaveProfile} disabled={savingProfile} sx={{ textTransform: 'none', borderRadius: '8px' }}>
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px', mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LockIcon sx={{ color: '#0066FF' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Change Password</Typography>
                  </Box>
                  <Divider sx={{ mb: 3 }} />
                  {pwMsg && <Alert severity="success" sx={{ mb: 2 }}>{pwMsg}</Alert>}
                  {pwErr && <Alert severity="error"   sx={{ mb: 2 }}>{pwErr}</Alert>}
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Confirm Password" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} size="small" />
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="outlined" onClick={handleChangePassword} disabled={savingPw} color="warning" sx={{ textTransform: 'none', borderRadius: '8px' }}>
                      {savingPw ? 'Updating...' : 'Update Password'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Security & 2FA Card (FR02-06) */}
              <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px', mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ShieldIcon sx={{ color: '#0066FF' }} />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>Two-Factor Authentication (2FA)</Typography>
                    </Box>
                    <Chip
                      label={twoFactorEnabled ? '2FA Enabled' : '2FA Disabled'}
                      color={twoFactorEnabled ? 'success' : 'default'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Protect your administrator account with two-factor authentication. When enabled, a 6-digit one-time code will be dispatched to your registered email address every time you log in.
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: 'rgba(0,102,255,0.04)', borderRadius: '12px', border: '1px solid rgba(0,102,255,0.1)' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#001A4D' }}>
                        Require 2FA Code on Login
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Delivered via Gmail SMTP to {user?.email}
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={twoFactorEnabled}
                          onChange={handleToggle2FA}
                          disabled={toggling2FA}
                          color="primary"
                        />
                      }
                      label={toggling2FA ? 'Updating...' : twoFactorEnabled ? 'Active' : 'Off'}
                      sx={{ m: 0 }}
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* My Assigned Assets */}
              <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px', mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AssetIcon sx={{ color: '#0066FF' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>My Assigned Assets</Typography>
                    <Chip label={myAssets.length} size="small" sx={{ ml: 'auto', backgroundColor: 'rgba(0,102,255,0.1)', color: '#0066FF', fontWeight: 700 }} />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {myAssets.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <AssetIcon sx={{ fontSize: 48, color: '#ddd', mb: 1 }} />
                      <Typography color="textSecondary">No assets assigned to you yet.</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'rgba(0,102,255,0.04)' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Tag</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Room</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {myAssets.map(a => {
                            const sc = STATUS_COLORS[a.status] ?? STATUS_COLORS.INACTIVE;
                            return (
                              <TableRow key={a._id} hover onClick={() => router.push(`/assets/${a._id}`)} sx={{ cursor: 'pointer' }}>
                                <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#3949ab' }}>{a.assetTag}</Typography></TableCell>
                                <TableCell>{a.name}</TableCell>
                                <TableCell><Box sx={{ display: 'inline-block', px: 1, py: 0.3, borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, ...sc }}>{a.status}</Box></TableCell>
                                <TableCell>{a.roomId?.name || '—'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>

              {/* My Recent Scan Activity */}
              <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <HistoryIcon sx={{ color: '#0066FF' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>My Recent Activity</Typography>
                    <Button size="small" onClick={() => router.push('/scan-history')} sx={{ ml: 'auto', textTransform: 'none', fontSize: '0.8rem' }}>View All</Button>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {scanLogs.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <HistoryIcon sx={{ fontSize: 48, color: '#ddd', mb: 1 }} />
                      <Typography color="textSecondary">No scan activity yet.</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {scanLogs.map((log: any, i: number) => (
                        <Box key={log._id || i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: '10px', backgroundColor: 'rgba(0,102,255,0.03)', border: '1px solid rgba(0,102,255,0.06)' }}>
                          <Box sx={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: log.qrType === 'ASSET' ? 'rgba(0,102,255,0.12)' : 'rgba(5,150,105,0.12)', fontSize: '1rem', flexShrink: 0 }}>
                            {log.qrType === 'ASSET' ? '📦' : '🏢'}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.qrType} scan</Typography>
                            <Typography variant="caption" color="textSecondary">{formatDateTime(log.scannedAt)}</Typography>
                          </Box>
                          <Box sx={{ fontSize: '0.7rem', fontWeight: 700, px: 1, py: 0.3, borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.05)', color: '#555' }}>
                            {log.action || 'VIEW'}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Security & Login Activity (FR02-05) */}
              <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px', mt: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <SecurityIcon sx={{ color: '#0066FF' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Security & Login Activity</Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                    Monitored login timestamps, IP addresses, and events recorded for security auditing.
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {loginHistory.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <SecurityIcon sx={{ fontSize: 40, color: '#ddd', mb: 1 }} />
                      <Typography color="textSecondary" variant="body2">No security audit logs recorded yet.</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'rgba(0,102,255,0.04)' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {loginHistory.map((log: any, i: number) => {
                            const isSuccess = log.status === 'SUCCESS' || log.action === 'LOGIN_SUCCESS' || log.action === '2FA_SUCCESS';
                            return (
                              <TableRow key={log._id || i} hover>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                    {formatLabel(log.action || 'LOGIN')}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PublicIcon sx={{ fontSize: '0.9rem', color: '#64748b' }} />
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                      {log.ipAddress || '127.0.0.1'}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={log.status || (isSuccess ? 'SUCCESS' : 'FAILED')}
                                    size="small"
                                    color={isSuccess ? 'success' : 'error'}
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem', height: 20, fontWeight: 700 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="textSecondary">
                                    {formatDateTime(log.createdAt)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>

            </Grid>
          </Grid>
        )}
      </Container>
      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')} message={snackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Layout>
  );
}
