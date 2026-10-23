import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  CircularProgress,
  Grid,
  Alert,
  Divider,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  PictureAsPdf as PdfIcon,
  FileDownload as DownloadIcon,
  CalendarMonth as CalendarIcon,
  SwapHoriz as SwapHorizIcon,
  Room as RoomIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  FilterAltOff as FilterAltOffIcon,
  Timeline as TimelineIcon,
  TableRows as TableRowsIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import NextLink from 'next/link';
import { Layout } from '@/components/Layout/MainLayout';
import { useProtectedRoute } from '@/hooks/useRoute';
import { assetsAPI } from '@/services/assets';
import { AssetMovement } from '@/types';
import { formatDateTime } from '@/utils/formatting';

export default function AssetMovementHistoryPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();

  const [asset, setAsset] = useState<any>(null);
  const [movements, setMovements] = useState<AssetMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const [error, setError] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  const fetchHistory = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await assetsAPI.getMovementHistory(id as string, params);
      const data = (res.data as any).data || res.data;
      if (data) {
        setAsset(data.asset);
        setMovements(Array.isArray(data.movements) ? data.movements : []);
        setTotal(data.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to load asset movement history:', err);
      setError(err?.response?.data?.message || 'Failed to load asset movement history.');
    } finally {
      setLoading(false);
    }
  }, [id, startDate, endDate]);

  useEffect(() => {
    if (!isAuthenticated || authLoading || !id) return;
    fetchHistory();
  }, [isAuthenticated, authLoading, id, fetchHistory]);

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (!id) return;
    try {
      setExporting(format);
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await assetsAPI.exportMovementHistory(id as string, format, params);
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanTag = (asset?.assetTag || (id as string)).replace(/[^a-zA-Z0-9-_]/g, '_');
      link.setAttribute('download', `asset-movement-history-${cleanTag}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Failed to export movement history report.');
    } finally {
      setExporting(null);
    }
  };

  const setPresetDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const filteredMovements = movements.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.fromRoomName?.toLowerCase().includes(q) ||
      m.toRoomName?.toLowerCase().includes(q) ||
      m.movedByName?.toLowerCase().includes(q) ||
      m.reason?.toLowerCase().includes(q) ||
      m.source?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Navigation Breadcrumbs */}
        <Box sx={{ mb: 2 }}>
          <Breadcrumbs aria-label="breadcrumb">
            <NextLink href="/assets" passHref legacyBehavior>
              <MuiLink underline="hover" color="inherit">Assets</MuiLink>
            </NextLink>
            <NextLink href={`/assets/${id}`} passHref legacyBehavior>
              <MuiLink underline="hover" color="inherit">
                {asset?.name || (id as string)}
              </MuiLink>
            </NextLink>
            <Typography color="text.primary" sx={{ fontWeight: 600 }}>Movement History</Typography>
          </Breadcrumbs>
        </Box>

        {/* Page Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <IconButton
                onClick={() => router.push(`/assets/${id}`)}
                sx={{ border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
                size="small"
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Asset Movement History
              </Typography>
              {asset?.assetTag && (
                <Chip
                  label={asset.assetTag}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700, borderRadius: '8px' }}
                />
              )}
            </Box>
            <Typography variant="body2" color="textSecondary">
              Complete chronological audit trail of physical location reassignments, room transfers, and relocations for this asset.
            </Typography>
          </Box>

          {/* Export Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={exporting === 'pdf' ? <CircularProgress size={16} /> : <PdfIcon />}
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null || loading}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              Export PDF Report
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={exporting === 'csv' ? <CircularProgress size={16} /> : <DownloadIcon />}
              onClick={() => handleExport('csv')}
              disabled={exporting !== null || loading}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              Export CSV Data
            </Button>
          </Box>
        </Box>

        {/* Quick KPI Overview */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', bgcolor: '#ffffff' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Recorded Movements
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0066FF', mt: 0.5 }}>
                  {total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', bgcolor: '#ffffff' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Current Location
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <RoomIcon sx={{ color: '#2e7d32', fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }} noWrap>
                    {asset?.currentRoom?.name
                      ? `${asset.currentRoom.name} (${asset.currentRoom.code})`
                      : 'Unassigned'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', bgcolor: '#ffffff' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Initial Origin
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#475569', mt: 0.5 }} noWrap>
                  {movements.length > 0
                    ? movements[movements.length - 1].fromRoomName || 'Unassigned'
                    : 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', bgcolor: '#ffffff' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Filtered Matches
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                  {filteredMovements.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filter Controls Bar */}
        <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', mb: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="From Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="To Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search history..."
                  placeholder="Room, user, or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon fontSize="small" sx={{ color: '#94a3b8', mr: 1 }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    size="medium"
                    onClick={fetchHistory}
                    startIcon={<RefreshIcon />}
                    sx={{ textTransform: 'none', borderRadius: '8px', bgcolor: '#0066FF' }}
                  >
                    Apply Filter
                  </Button>
                  {(startDate || endDate || searchQuery) && (
                    <Tooltip title="Reset filters">
                      <IconButton onClick={resetFilters} sx={{ border: '1px solid #e2e8f0' }}>
                        <FilterAltOffIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Box sx={{ ml: 'auto', display: 'flex', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <Tooltip title="Timeline View">
                      <IconButton
                        size="small"
                        color={viewMode === 'timeline' ? 'primary' : 'default'}
                        onClick={() => setViewMode('timeline')}
                      >
                        <TimelineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Table View">
                      <IconButton
                        size="small"
                        color={viewMode === 'table' ? 'primary' : 'default'}
                        onClick={() => setViewMode('table')}
                      >
                        <TableRowsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Grid>

              {/* Quick Preset Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                    Quick Presets:
                  </Typography>
                  <Chip
                    label="All Time"
                    size="small"
                    variant={!startDate && !endDate ? 'filled' : 'outlined'}
                    color="primary"
                    onClick={resetFilters}
                    sx={{ cursor: 'pointer', borderRadius: '6px' }}
                  />
                  <Chip
                    label="Past 7 Days"
                    size="small"
                    variant="outlined"
                    onClick={() => setPresetDate(7)}
                    sx={{ cursor: 'pointer', borderRadius: '6px' }}
                  />
                  <Chip
                    label="Past 30 Days"
                    size="small"
                    variant="outlined"
                    onClick={() => setPresetDate(30)}
                    sx={{ cursor: 'pointer', borderRadius: '6px' }}
                  />
                  <Chip
                    label="Past 90 Days"
                    size="small"
                    variant="outlined"
                    onClick={() => setPresetDate(90)}
                    sx={{ cursor: 'pointer', borderRadius: '6px' }}
                  />
                  <Chip
                    label="Past 180 Days"
                    size="small"
                    variant="outlined"
                    onClick={() => setPresetDate(180)}
                    sx={{ cursor: 'pointer', borderRadius: '6px' }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
            {error}
          </Alert>
        )}

        {/* Movement History Records */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress size={40} />
          </Box>
        ) : filteredMovements.length === 0 ? (
          <Paper elevation={0} sx={{ border: '1px dashed #cbd5e1', borderRadius: '12px', p: 6, textAlign: 'center' }}>
            <CalendarIcon sx={{ fontSize: 50, color: '#94a3b8', mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
              No Movement Records Found
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 450, mx: 'auto', mb: 2 }}>
              {startDate || endDate || searchQuery
                ? 'No asset relocation records match the specified date range or search keyword. Try clearing or expanding your filter.'
                : 'This asset has not been relocated yet. All future location changes will be recorded here automatically.'}
            </Typography>
            {(startDate || endDate || searchQuery) && (
              <Button variant="outlined" onClick={resetFilters} sx={{ textTransform: 'none', borderRadius: '8px' }}>
                Reset Date Filter
              </Button>
            )}
          </Paper>
        ) : viewMode === 'timeline' ? (
          /* Timeline View */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredMovements.map((move, idx) => (
              <Card
                key={move._id || idx}
                elevation={0}
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  bgcolor: '#ffffff',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#93c5fd',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                    {/* Locations Transfer Block */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <Box sx={{ px: 1.5, py: 0.6, bgcolor: '#f1f5f9', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>
                          PREVIOUS LOCATION
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                          {move.fromRoomName || 'Unassigned'}
                        </Typography>
                      </Box>

                      <SwapHorizIcon sx={{ color: '#0066FF', fontSize: 24 }} />

                      <Box sx={{ px: 1.5, py: 0.6, bgcolor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                        <Typography variant="caption" color="primary" sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>
                          NEW LOCATION
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e40af' }}>
                          {move.toRoomName || 'Unassigned'}
                        </Typography>
                      </Box>

                      {move.toDepartment && move.fromDepartment !== move.toDepartment && (
                        <Chip
                          label={`Dept: ${move.toDepartment}`}
                          size="small"
                          sx={{ bgcolor: '#ede7f6', color: '#512da8', fontWeight: 600 }}
                        />
                      )}
                    </Box>

                    {/* Timestamp & Source */}
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block' }}>
                        {formatDateTime(move.movedAt)}
                      </Typography>
                      <Chip
                        label={move.source ? move.source.replace('_', ' ') : 'LOCATION UPDATE'}
                        size="small"
                        sx={{ fontSize: '0.68rem', fontWeight: 700, mt: 0.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  {/* Move Details & Actor */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <PersonIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                      <Typography variant="caption" sx={{ color: '#475569' }}>
                        Updated by: <strong>{move.movedByName || 'System Administrator'}</strong>
                        {move.movedByEmail ? ` (${move.movedByEmail})` : ''}
                      </Typography>
                    </Box>

                    {move.reason && (
                      <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                        Reason: {move.reason}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          /* Table View */
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Previous Location</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#334155' }}>New Location</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Movement Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Moved By</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Reason / Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMovements.map((move, idx) => (
                  <TableRow key={move._id || idx} hover>
                    <TableCell sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {formatDateTime(move.movedAt)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>
                      <Chip
                        label={move.fromRoomName || 'Unassigned'}
                        size="small"
                        sx={{ bgcolor: '#f1f5f9', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>
                      <Chip
                        label={move.toRoomName || 'Unassigned'}
                        size="small"
                        sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>
                      {move.source ? move.source.replace('_', ' ') : 'UPDATE'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        {move.movedByName || 'System'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem', color: '#475569' }}>
                      {move.reason || 'Location update'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Layout>
  );
}
