import React, { useEffect, useState } from 'react';
import {
  Box, Button, Card, CardContent, Container, Typography,
  CircularProgress, Grid, Chip, Divider, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, MenuItem, TextField,
} from '@mui/material';
import {
  Download as DownloadIcon, TrendingUp as TrendingIcon,
  Inventory as AssetIcon, MeetingRoom as RoomIcon, QrCode as QrIcon,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { Layout } from '@/components/Layout/MainLayout';
import { useProtectedRoute } from '@/hooks/useRoute';
import { useAssets } from '@/hooks/useAssets';
import { useRooms } from '@/hooks/useRooms';
import { scanHistoryAPI } from '@/services/scanHistory';
import { formatDateTime, formatLabel } from '@/utils/formatting';

const COLORS = ['#0066FF','#00D9FF','#7C3AED','#059669','#F59E0B','#EF4444','#EC4899','#14B8A6'];

const getRelationName = (relation?: string | { name?: string } | null) => {
  if (!relation) return '';
  if (typeof relation === 'object') return relation.name || '';
  return typeof relation === 'string' ? relation : '';
};


export default function Reports() {
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const { assets, loading: assetsLoading, fetchAssets } = useAssets();
  const { rooms, loading: roomsLoading, fetchRooms } = useRooms();

  const [scanLogs, setScanLogs]     = useState<any[]>([]);
  const [scanStats, setScanStats]   = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [exportType, setExportType] = useState('assets');

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    Promise.all([
      fetchAssets({ limit: 500 }),
      fetchRooms({ limit: 200 }),
      scanHistoryAPI.getScanHistory(1, 100).then(r => {
        setScanLogs((r.data as any).scanLogs ?? []);
      }),
      scanHistoryAPI.getScanStats().then(r => {
        setScanStats(r.data);
      }),
    ]).finally(() => setLoading(false));
  }, [isAuthenticated, authLoading, fetchAssets, fetchRooms]);

  // ── Derived data ──────────────────────────────────────────
  const assetsByType = Object.entries(
    assets.reduce((acc: any, a) => { acc[a.assetType] = (acc[a.assetType] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.replace(/_/g,' '), value }));

  const assetsByStatus = Object.entries(
    assets.reduce((acc: any, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const roomUtilization = rooms
    .map((r: any) => ({
      name: r.name,
      code: r.code,
      assets: assets.filter((a: any) => (a.roomId?._id ?? a.roomId) === r._id).length,
      capacity: r.capacity || 0,
    }))
    .filter(r => r.assets > 0)
    .sort((a, b) => b.assets - a.assets)
    .slice(0, 10);

  // Scan activity last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const scansByDay = last7Days.map(day => ({
    day,
    scans: scanLogs.filter(l => new Date(l.scannedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === day).length,
  }));

  const topScannedAssets = assets
    .filter((a: any) => (a.scanCount ?? 0) > 0)
    .sort((a: any, b: any) => (b.scanCount ?? 0) - (a.scanCount ?? 0))
    .slice(0, 10);

  // ── CSV Export ───────────────────────────────────────────
  const handleExport = () => {
    let headers: string[], rows: any[][];
    if (exportType === 'assets') {
      headers = ['Asset Tag','Name','Type','Status','Owner','Room','Scan Count','Last Scanned','Created'];
      rows = assets.map(a => [
        a.assetTag, a.name, a.assetType, a.status,
        getRelationName(a.ownerId), getRelationName(a.roomId),
        a.scanCount ?? 0,
        a.lastScanned ? formatDateTime(a.lastScanned) : 'Never',
        a.createdAt ? formatDateTime(a.createdAt) : '',
      ]);
    } else {
      headers = ['Code','Name','Building','Floor','Asset Count'];
      rows = rooms.map((r: any) => [
        r.code, r.name, r.building || '', r.floor || '',
        assets.filter((a: any) => (a.roomId?._id ?? a.roomId) === r._id).length,
      ]);
    }
    const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sats-${exportType}-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated || authLoading) return <Box sx={{ display:'flex',justifyContent:'center',alignItems:'center',height:'100vh' }}><CircularProgress /></Box>;

  const totalScans = scanStats?.totalScans ?? 0;
  const assetScans = scanStats?.byType?.find((b: any) => b._id === 'ASSET')?.count ?? 0;
  const roomScans  = scanStats?.byType?.find((b: any) => b._id === 'ROOM')?.count  ?? 0;

  return (
    <Layout>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4, pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 1 }}>
              Reports & Analytics
            </Typography>
            <Typography variant="body2" color="textSecondary">Comprehensive system insights and data export</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField select size="small" value={exportType} onChange={e => setExportType(e.target.value)} sx={{ minWidth: 130 }}>
              <MenuItem value="assets">Assets CSV</MenuItem>
              <MenuItem value="rooms">Rooms CSV</MenuItem>
            </TextField>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport} sx={{ textTransform: 'none', borderRadius: '10px' }}>
              Export CSV
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: '#0066FF' }} /></Box>
        ) : (
          <>
            {/* ── KPI Row ──────────────────────────────────────── */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {[
                { label: 'Total Assets',   value: assets.length,       icon: '📦', color: '#0066FF' },
                { label: 'Active Assets',  value: assets.filter(a => a.status==='ACTIVE').length, icon: '✅', color: '#059669' },
                { label: 'Total Rooms',    value: rooms.length,        icon: '🏢', color: '#7C3AED' },
                { label: 'Total Scans',    value: totalScans,          icon: '📡', color: '#F59E0B' },
                { label: 'Asset Scans',   value: assetScans,          icon: '🔍', color: '#0066FF' },
                { label: 'Room Scans',    value: roomScans,           icon: '🚪', color: '#059669' },
              ].map(kpi => (
                <Grid item xs={6} md={2} key={kpi.label}>
                  <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '12px', textAlign: 'center', p: 2, transition: 'all 0.3s', '&:hover': { boxShadow: '0 4px 16px rgba(0,102,255,0.12)', transform: 'translateY(-2px)' } }}>
                    <Box sx={{ fontSize: '1.6rem', mb: 0.5 }}>{kpi.icon}</Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: kpi.color }}>{kpi.value}</Typography>
                    <Typography variant="caption" color="textSecondary">{kpi.label}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* ── Charts Row 1 ─────────────────────────────────── */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px', height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Assets by Type</Typography>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={assetsByType} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                          {assetsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px', height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Assets by Status</Typography>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={assetsByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                          {assetsByStatus.map((entry, i) => {
                            const c: Record<string,string> = { ACTIVE:'#059669', INACTIVE:'#9E9E9E', MAINTENANCE:'#F59E0B', RETIRED:'#EF4444' };
                            return <Cell key={i} fill={c[entry.name] || COLORS[i % COLORS.length]} />;
                          })}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px', height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Scan Activity (7 days)</Typography>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={scansByDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="scans" stroke="#0066FF" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* ── Room Utilization ─────────────────────────────── */}
            {roomUtilization.length > 0 && (
              <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px', mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Room Asset Distribution</Typography>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={roomUtilization} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="assets" name="Assets" fill="#0066FF" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* ── Top Scanned Assets ───────────────────────────── */}
            {topScannedAssets.length > 0 && (
              <Card elevation={0} sx={{ border: '1px solid rgba(0,102,255,0.1)', borderRadius: '16px', mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>🔥 Top Scanned Assets</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'rgba(0,102,255,0.04)' }}>
                          <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Asset</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Room</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Scans</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Last Scanned</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {topScannedAssets.map((a: any, i: number) => (
                          <TableRow key={a._id} hover>
                            <TableCell><Chip label={i + 1} size="small" sx={{ fontWeight: 700, backgroundColor: i < 3 ? 'rgba(0,102,255,0.1)' : 'rgba(0,0,0,0.05)', color: i < 3 ? '#0066FF' : '#666' }} /></TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.name}</Typography>
                              <Typography variant="caption" color="textSecondary">{a.assetTag}</Typography>
                            </TableCell>
                            <TableCell><Typography variant="body2">{a.assetType?.replace(/_/g,' ')}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{a.roomId?.name || '—'}</Typography></TableCell>
                            <TableCell><Chip label={a.scanCount} size="small" sx={{ fontWeight: 700, backgroundColor: 'rgba(124,58,237,0.1)', color: '#7C3AED' }} /></TableCell>
                            <TableCell><Typography variant="body2">{a.lastScanned ? formatDateTime(a.lastScanned) : 'Never'}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Container>
    </Layout>
  );
}
