import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  CircularProgress,
  Grid,
  Alert,
  Chip,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  MeetingRoom as RoomIcon,
  Inventory as AssetIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { Layout } from '@/components/Layout/MainLayout';
import { useProtectedRoute } from '@/hooks/useRoute';
import { scanHistoryAPI } from '@/services/scanHistory';
import { formatDateTime } from '@/utils/formatting';

export default function ScanHistoryPage() {
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const [scanLogs, setScanLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [histRes, statsRes] = await Promise.all([
        scanHistoryAPI.getScanHistory(1, 20, typeFilter || undefined),
        scanHistoryAPI.getScanStats(),
      ]);
      const histData = histRes.data as any;
      setScanLogs(histData.scanLogs || histData.data?.scanLogs || []);
      setTotalPages(histData.pagination?.pages || histData.data?.pagination?.pages || 1);
      const statsData = statsRes.data as any;
      setStats(statsData.data || statsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load scan history');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const histRes = await scanHistoryAPI.getScanHistory(page, 20, typeFilter || undefined);
      const histData = histRes.data as any;
      setScanLogs(histData.scanLogs || histData.data?.scanLogs || []);
      setTotalPages(histData.pagination?.pages || histData.data?.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load scan history');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadData();
  }, [isAuthenticated, authLoading, loadData]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadHistory();
  }, [isAuthenticated, authLoading, loadHistory]);

  const getTypeColor = (type: string) => {
    if (type === 'ASSET') return 'primary';
    if (type === 'ROOM') return 'success';
    return 'default';
  };

  const getTypeIcon = (type: string) => {
    if (type === 'ASSET') return <AssetIcon sx={{ fontSize: 16 }} />;
    if (type === 'ROOM') return <RoomIcon sx={{ fontSize: 16 }} />;
    return <QrCodeIcon sx={{ fontSize: 16 }} />;
  };

  const statCards = [
    {
      label: 'Total Scans',
      value: stats?.totalScans ?? 0,
      color: '#0066FF',
      bg: 'rgba(0, 102, 255, 0.08)',
    },
    {
      label: 'Asset Scans',
      value: stats?.byType?.find((t: any) => t._id === 'ASSET')?.count ?? 0,
      color: '#7C3AED',
      bg: 'rgba(124, 58, 237, 0.08)',
    },
    {
      label: 'Room Scans',
      value: stats?.byType?.find((t: any) => t._id === 'ROOM')?.count ?? 0,
      color: '#059669',
      bg: 'rgba(5, 150, 105, 0.08)',
    },
    {
      label: 'Last Scan',
      value: stats?.lastScan?.scannedAt ? formatDateTime(stats.lastScan.scannedAt) : '—',
      color: '#D97706',
      bg: 'rgba(217, 119, 6, 0.08)',
      small: true,
    },
  ];

  if (!isAuthenticated || authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <HistoryIcon sx={{ fontSize: 32, color: '#0066FF' }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#001A4D' }}>
              Scan History
            </Typography>
          </Box>
          <Typography variant="body2" color="textSecondary">
            A complete log of all QR code scans performed by your account
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* Stat Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statCards.map((s) => (
            <Grid item xs={12} sm={6} md={3} key={s.label}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: '16px',
                  background: s.bg,
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {s.label}
                  </Typography>
                  <Typography
                    variant={s.small ? 'body1' : 'h3'}
                    sx={{ fontWeight: 800, color: s.color, mt: 1, lineHeight: 1.2 }}
                  >
                    {s.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filter + Table */}
        <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Scan Log</Typography>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Filter by Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Filter by Type"
                  onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="ASSET">Assets</MenuItem>
                  <MenuItem value="ROOM">Rooms</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : scanLogs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <QrCodeIcon sx={{ fontSize: 64, color: '#ddd', mb: 2 }} />
                <Typography color="textSecondary">No scan records found.</Typography>
                <Typography variant="caption" color="textSecondary">
                  Scan a QR code from the mobile app to see history here.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fb' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Scanned By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scanLogs.map((log) => (
                      <TableRow key={log._id} sx={{ '&:hover': { backgroundColor: '#f5f7ff' } }}>
                        <TableCell>
                          <Chip
                            icon={getTypeIcon(log.qrType)}
                            label={log.qrType}
                            color={getTypeColor(log.qrType) as any}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.action || 'VIEW'}
                            size="small"
                            sx={{ backgroundColor: 'rgba(0,0,0,0.05)', fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {log.scannedBy?.name || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {log.scannedBy?.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(log.scannedAt)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, val) => setPage(val)}
                  color="primary"
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
}
