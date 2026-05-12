import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Container,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { Layout } from '@/components/Layout/MainLayout';
import { StatCard } from '@/components/Dashboard/StatCard';
import { SimplePieChart } from '@/components/Charts/PieChart';
import { useProtectedRoute } from '@/hooks/useRoute';
import { useAssets } from '@/hooks/useAssets';
import { useRooms } from '@/hooks/useRooms';
import { scanHistoryAPI } from '@/services/scanHistory';
import { formatDateTime } from '@/utils/formatting';

interface DashboardStats {
  totalAssets: number;
  activeAssets: number;
  totalRooms: number;
  totalScans: number;
  assetsByType: { name: string; value: number }[];
  assetsByStatus: { name: string; value: number }[];
}

export default function Dashboard() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const { assets, loading: assetsLoading, fetchAssets } = useAssets();
  const { rooms, loading: roomsLoading, fetchRooms } = useRooms();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [totalScans, setTotalScans] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    if (hasLoaded) return; // Prevent re-fetching

    const loadData = async () => {
      try {
        setLoading(true);
        
        const [, , scanStatsRes, activityRes] = await Promise.all([
          fetchAssets({ limit: 100 }),
          fetchRooms({ limit: 100 }),
          scanHistoryAPI.getScanStats(),
          scanHistoryAPI.getScanHistory(1, 5),
        ]);

        const statsData = (scanStatsRes.data as any).data ?? (scanStatsRes.data as any);
        setTotalScans(statsData?.totalScans ?? 0);

        const actData = (activityRes.data as any).scanLogs ?? (activityRes.data as any).data?.scanLogs ?? [];
        setRecentActivity(actData);
        
        setHasLoaded(true);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, authLoading, fetchAssets, fetchRooms, hasLoaded]); // Include stable callbacks

  // Calculate stats whenever assets or rooms change
  useEffect(() => {
    if (assets.length === 0 && rooms.length === 0) return;

    const activeCount = assets.filter((a) => a.status === 'ACTIVE').length;
    
    // Group assets by type
    const typeMap: Record<string, number> = {};
    assets.forEach((asset) => {
      typeMap[asset.assetType] = (typeMap[asset.assetType] || 0) + 1;
    });
    const assetsByType = Object.entries(typeMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Group assets by status
    const statusMap: Record<string, number> = {};
    assets.forEach((asset) => {
      statusMap[asset.status] = (statusMap[asset.status] || 0) + 1;
    });
    const assetsByStatus = Object.entries(statusMap).map(([name, value]) => ({
      name,
      value,
    }));

    setStats({
      totalAssets: assets.length,
      activeAssets: activeCount,
      totalRooms: rooms.length,
      totalScans,
      assetsByType,
      assetsByStatus,
    });
  }, [assets, rooms, totalScans]); // This effect depends on the data

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
        <Box sx={{ mb: 4, pt: 2 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 800,
              background: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1 
            }}
          >
            Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Smart Asset Tracking Overview
          </Typography>
        </Box>

        {/* Stats Cards */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress sx={{ color: '#0066FF' }} />
          </Box>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  onClick={() => router.push('/assets')}
                  sx={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(245,247,251,0.5) 100%)',
                    border: '1px solid rgba(0, 102, 255, 0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0, 102, 255, 0.12)',
                      transform: 'translateY(-4px)',
                      border: '1px solid rgba(0, 102, 255, 0.3)',
                    }
                  }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ color: '#0066FF', fontSize: '2.5rem', mb: 1 }}>📦</Box>
                    <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>Total Assets</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#0066FF' }}>
                      {stats?.totalAssets || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  onClick={() => router.push('/assets?status=ACTIVE')}
                  sx={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(245,247,251,0.5) 100%)',
                    border: '1px solid rgba(0, 217, 255, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0, 217, 255, 0.12)',
                      transform: 'translateY(-4px)',
                      border: '1px solid rgba(0, 217, 255, 0.4)',
                    }
                  }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ color: '#00D9FF', fontSize: '2.5rem', mb: 1 }}>✅</Box>
                    <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>Active Assets</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#00D9FF' }}>
                      {stats?.activeAssets || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  onClick={() => router.push('/map/rooms')}
                  sx={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(245,247,251,0.5) 100%)',
                    border: '1px solid rgba(0, 102, 255, 0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0, 102, 255, 0.12)',
                      transform: 'translateY(-4px)',
                      border: '1px solid rgba(0, 102, 255, 0.3)',
                    }
                  }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ color: '#0066FF', fontSize: '2.5rem', mb: 1 }}>🏢</Box>
                    <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>Total Rooms</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#0066FF' }}>
                      {stats?.totalRooms || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  onClick={() => router.push('/scan-history')}
                  sx={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(245,247,251,0.5) 100%)',
                    border: '1px solid rgba(124, 58, 237, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(124, 58, 237, 0.15)',
                      transform: 'translateY(-4px)',
                      border: '1px solid rgba(124, 58, 237, 0.4)',
                    }
                  }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ color: '#7C3AED', fontSize: '2.5rem', mb: 1 }}>📡</Box>
                    <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>Total Scans</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#7C3AED' }}>
                      {stats?.totalScans ?? 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <SimplePieChart
                  title="Assets by Type"
                  data={stats?.assetsByType || []}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <SimplePieChart
                  title="Assets by Status"
                  data={stats?.assetsByStatus || []}
                />
              </Grid>
            </Grid>

            {/* Recent Activity Feed */}
            <Card sx={{ 
              mt: 4,
              background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(245,247,251,0.5) 100%)',
              border: '1px solid rgba(0, 102, 255, 0.1)',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0066FF' }}>
                    📡 Recent Activity
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => router.push('/scan-history')}
                    sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                  >
                    View All
                  </Button>
                </Box>
                {recentActivity.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography color="textSecondary" variant="body2">No scan activity yet.</Typography>
                    <Typography color="textSecondary" variant="caption">Scan a QR code from the mobile app to see activity here.</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {recentActivity.map((log: any, idx: number) => (
                      <Box
                        key={log._id || idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 1.5,
                          borderRadius: '10px',
                          backgroundColor: 'rgba(0,102,255,0.03)',
                          border: '1px solid rgba(0,102,255,0.06)',
                          transition: 'background 0.2s',
                          '&:hover': { backgroundColor: 'rgba(0,102,255,0.07)' },
                        }}
                      >
                        <Box
                          sx={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: log.qrType === 'ASSET' ? 'rgba(0,102,255,0.12)' : 'rgba(5,150,105,0.12)',
                            fontSize: '1rem',
                          }}
                        >
                          {log.qrType === 'ASSET' ? '📦' : '🏢'}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                            {log.qrType} scan
                            <Box component="span" sx={{ fontWeight: 400, color: '#888', ml: 0.5 }}>by {log.scannedBy?.name || 'Unknown'}</Box>
                          </Typography>
                          <Typography variant="caption" color="textSecondary">{formatDateTime(log.scannedAt)}</Typography>
                        </Box>
                        <Box
                          sx={{
                            fontSize: '0.7rem', fontWeight: 700, px: 1, py: 0.3, borderRadius: '6px',
                            backgroundColor: 'rgba(0,0,0,0.05)', color: '#555', flexShrink: 0,
                          }}
                        >
                          {log.action || 'VIEW'}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Container>
    </Layout>
  );
}
