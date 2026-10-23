import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
  Slider,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Snackbar,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  Download as DownloadIcon,
  Palette as PaletteIcon,
  Tune as TuneIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  MeetingRoom as RoomIcon,
  Category as AssetIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import MainLayout from '@/components/Layout/MainLayout';
import { assetsAPI } from '@/services/assets';
import { roomsAPI } from '@/services/rooms';
import { Asset, Room } from '@/types';

const COLOR_PRESETS = [
  { name: 'Classic Black', color: '#000000' },
  { name: 'System Blue', color: '#1976d2' },
  { name: 'Navy Blue', color: '#001A4D' },
  { name: 'Deep Purple', color: '#6a1b9a' },
  { name: 'Forest Green', color: '#2e7d32' },
  { name: 'Crimson', color: '#c62828' },
];

const BG_PRESETS = [
  { name: 'Pure White', color: '#FFFFFF' },
  { name: 'Soft Gray', color: '#F8FAFC' },
  { name: 'Light Blue', color: '#F0F7FF' },
  { name: 'Light Cream', color: '#FFFBEB' },
];

export default function QrManagementPage() {
  const [tabIndex, setTabIndex] = useState(0);

  // Asset Tab States
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [generatingAssetQr, setGeneratingAssetQr] = useState(false);
  const [assetQrCode, setAssetQrCode] = useState<string>('');

  // Asset QR Style State (TC-14 Steps 4 & 5)
  const [assetQrColor, setAssetQrColor] = useState<string>('#000000');
  const [assetQrBg, setAssetQrBg] = useState<string>('#FFFFFF');
  const [assetQrSize, setAssetQrSize] = useState<number>(200);

  // Custom Dynamic Data Fields State (TC-14 Steps 6 & 7)
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([]);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [savingCustomFields, setSavingCustomFields] = useState(false);

  // Room Tab States
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [generatingRoomQr, setGeneratingRoomQr] = useState(false);
  const [roomQrCode, setRoomQrCode] = useState<string>('');
  const [roomQrColor, setRoomQrColor] = useState<string>('#0066CC');
  const [roomQrBg, setRoomQrBg] = useState<string>('#FFFFFF');
  const [roomQrSize, setRoomQrSize] = useState<number>(200);

  // Notifications
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Load assets on mount
  useEffect(() => {
    fetchAssets();
    fetchRooms();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoadingAssets(true);
      const res = await assetsAPI.getAll();
      const list = (res.data as any)?.assets || (Array.isArray(res.data) ? res.data : []);
      setAssets(list);
      if (list.length > 0) {
        handleSelectAsset(list[0]);
      }
    } catch (err: any) {
      console.error('Failed to load assets', err);
      setSnackbar({ open: true, message: 'Failed to load assets', severity: 'error' });
    } finally {
      setLoadingAssets(false);
    }
  };

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const res = await roomsAPI.getAll();
      const list = (res.data as any)?.rooms || (Array.isArray(res.data) ? res.data : []);
      setRooms(list);
    } catch (err: any) {
      console.error('Failed to load rooms', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAssetId(asset._id);
    setSelectedAsset(asset);

    // Load styling
    if (asset.qrStyle) {
      setAssetQrColor(asset.qrStyle.color || '#000000');
      setAssetQrBg(asset.qrStyle.backgroundColor || '#FFFFFF');
      setAssetQrSize(asset.qrStyle.size || 200);
    } else {
      setAssetQrColor('#000000');
      setAssetQrBg('#FFFFFF');
      setAssetQrSize(200);
    }

    // Load custom dynamic data fields
    if (asset.customFields && typeof asset.customFields === 'object') {
      const parsed = Object.entries(asset.customFields).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      setCustomFields(parsed);
    } else {
      setCustomFields([]);
    }

    // Auto-generate QR preview
    generateAssetQrCode(asset._id, asset.qrStyle?.color, asset.qrStyle?.backgroundColor, asset.qrStyle?.size);
  };

  const generateAssetQrCode = async (id: string, color?: string, bg?: string, size?: number) => {
    if (!id) return;
    try {
      setGeneratingAssetQr(true);
      const c = color || assetQrColor;
      const b = bg || assetQrBg;
      const s = size || assetQrSize;
      const res = await assetsAPI.generateQRCode(id);
      const qr = (res.data as any)?.data?.qrCode ?? (res.data as any)?.qrCode ?? '';
      setAssetQrCode(qr);
    } catch (err: any) {
      console.error('Failed to generate QR code', err);
      setSnackbar({ open: true, message: 'Failed to generate QR code preview', severity: 'error' });
    } finally {
      setGeneratingAssetQr(false);
    }
  };

  const handleSaveAssetQrStyle = async () => {
    if (!selectedAsset) return;
    try {
      const qrStyle = {
        color: assetQrColor,
        backgroundColor: assetQrBg,
        size: assetQrSize,
      };

      await assetsAPI.update(selectedAsset._id, { qrStyle } as any);
      await generateAssetQrCode(selectedAsset._id, assetQrColor, assetQrBg, assetQrSize);
      setSnackbar({ open: true, message: 'QR Code styling saved and applied successfully!', severity: 'success' });
    } catch (err: any) {
      console.error('Failed to save QR style', err);
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to save QR styling', severity: 'error' });
    }
  };

  // Custom Fields Handlers (TC-14 Steps 6 & 7)
  const handleAddCustomField = () => {
    const k = newFieldKey.trim();
    const v = newFieldValue.trim();
    if (!k) {
      setSnackbar({ open: true, message: 'Field name cannot be empty', severity: 'error' });
      return;
    }
    if (customFields.some(f => f.key.toLowerCase() === k.toLowerCase())) {
      setSnackbar({ open: true, message: `Field "${k}" already exists`, severity: 'error' });
      return;
    }

    setCustomFields(prev => [...prev, { key: k, value: v }]);
    setNewFieldKey('');
    setNewFieldValue('');
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveCustomFields = async () => {
    if (!selectedAsset) return;
    try {
      setSavingCustomFields(true);
      const dict: Record<string, string> = {};
      customFields.forEach(f => {
        if (f.key.trim()) dict[f.key.trim()] = f.value;
      });

      await assetsAPI.update(selectedAsset._id, { customFields: dict } as any);
      setSnackbar({ open: true, message: 'Custom dynamic fields saved successfully!', severity: 'success' });

      // Refresh asset details
      const updatedRes = await assetsAPI.getById(selectedAsset._id);
      const updatedAsset = (updatedRes.data as any)?.data || updatedRes.data;
      if (updatedAsset) {
        setSelectedAsset(updatedAsset);
      }
    } catch (err: any) {
      console.error('Failed to save custom fields', err);
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to save custom fields', severity: 'error' });
    } finally {
      setSavingCustomFields(false);
    }
  };

  // Room Handlers
  const handleSelectRoom = async (roomId: string) => {
    setSelectedRoomId(roomId);
    const r = rooms.find(item => item._id === roomId) || null;
    setSelectedRoom(r);
    if (!roomId) return;

    try {
      setGeneratingRoomQr(true);
      const res = await roomsAPI.generateQRCode(roomId);
      const qr = (res.data as any)?.data?.qrCode ?? (res.data as any)?.qrCode ?? '';
      setRoomQrCode(qr);
    } catch (err: any) {
      console.error('Failed to generate room QR', err);
      setSnackbar({ open: true, message: 'Failed to generate Room QR', severity: 'error' });
    } finally {
      setGeneratingRoomQr(false);
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>QR Code & Custom Fields Management - SATS</title>
      </Head>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#001A4D', mb: 0.5 }}>
          QR Code & Custom Fields Management
        </Typography>
        <Typography variant="body1" sx={{ color: '#556987' }}>
          Generate system-recognized QR codes, configure visual color/size styling, and attach custom dynamic data fields to assets.
        </Typography>
      </Box>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<AssetIcon />}
            iconPosition="start"
            label="Asset QR & Custom Fields"
            sx={{ fontWeight: 700, textTransform: 'none' }}
          />
          <Tab
            icon={<RoomIcon />}
            iconPosition="start"
            label="Room QR Code Generator"
            sx={{ fontWeight: 700, textTransform: 'none' }}
          />
        </Tabs>
      </Paper>

      {/* TAB 0: ASSET QR & CUSTOM FIELDS (TC-14) */}
      {tabIndex === 0 && (
        <Grid container spacing={3}>
          {/* Asset Selection & Generation Control */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: 2, mb: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#001A4D', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <QrCodeIcon color="primary" /> Asset Selection & QR Generation
              </Typography>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={8}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="asset-select-label">Select Asset</InputLabel>
                    <Select
                      labelId="asset-select-label"
                      label="Select Asset"
                      value={selectedAssetId}
                      onChange={(e) => {
                        const target = assets.find(a => a._id === e.target.value);
                        if (target) handleSelectAsset(target);
                      }}
                      disabled={loadingAssets}
                    >
                      {assets.map((a) => (
                        <MenuItem key={a._id} value={a._id}>
                          <strong>{a.assetTag}</strong> - {a.name} ({a.department || 'General'})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={generatingAssetQr ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                    onClick={() => selectedAsset && generateAssetQrCode(selectedAsset._id)}
                    disabled={!selectedAsset || generatingAssetQr}
                    sx={{ textTransform: 'none', py: 1, fontWeight: 700 }}
                  >
                    Generate QR Code
                  </Button>
                </Grid>
              </Grid>

              {selectedAsset && (
                <Box sx={{ mt: 2.5, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    Active Asset: {selectedAsset.name}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    <Chip size="small" label={`Tag: ${selectedAsset.assetTag}`} color="primary" variant="outlined" />
                    <Chip size="small" label={`Status: ${selectedAsset.status}`} color={selectedAsset.status === 'ACTIVE' ? 'success' : 'warning'} />
                    <Chip size="small" label={`Type: ${selectedAsset.assetType}`} />
                    <Chip size="small" label={`Dept: ${selectedAsset.department || 'N/A'}`} />
                  </Box>
                </Box>
              )}
            </Paper>

            {/* QR Styling Controls (TC-14 Steps 4 & 5) */}
            <Paper sx={{ p: 3, borderRadius: 2, mb: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#001A4D', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaletteIcon color="primary" /> QR Code Visual Styling
              </Typography>

              {/* Foreground Color */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155', mb: 1 }}>
                  Foreground / Pattern Color: <span style={{ fontFamily: 'monospace' }}>{assetQrColor}</span>
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  {COLOR_PRESETS.map((p) => (
                    <Button
                      key={p.color}
                      size="small"
                      variant={assetQrColor.toLowerCase() === p.color.toLowerCase() ? 'contained' : 'outlined'}
                      onClick={() => setAssetQrColor(p.color)}
                      sx={{
                        textTransform: 'none',
                        minWidth: 80,
                        backgroundColor: assetQrColor.toLowerCase() === p.color.toLowerCase() ? p.color : 'transparent',
                        borderColor: p.color,
                        color: assetQrColor.toLowerCase() === p.color.toLowerCase() ? '#fff' : p.color,
                        '&:hover': { backgroundColor: p.color, color: '#fff' }
                      }}
                    >
                      {p.name}
                    </Button>
                  ))}
                  <input
                    type="color"
                    value={assetQrColor}
                    onChange={(e) => setAssetQrColor(e.target.value)}
                    style={{ width: 40, height: 32, borderRadius: 4, cursor: 'pointer', border: '1px solid #cbd5e1' }}
                  />
                </Box>
              </Box>

              {/* Background Color */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155', mb: 1 }}>
                  Background Color: <span style={{ fontFamily: 'monospace' }}>{assetQrBg}</span>
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  {BG_PRESETS.map((p) => (
                    <Button
                      key={p.color}
                      size="small"
                      variant={assetQrBg.toLowerCase() === p.color.toLowerCase() ? 'contained' : 'outlined'}
                      onClick={() => setAssetQrBg(p.color)}
                      sx={{
                        textTransform: 'none',
                        minWidth: 80,
                        borderColor: '#94a3b8',
                        color: '#334155'
                      }}
                    >
                      {p.name}
                    </Button>
                  ))}
                  <input
                    type="color"
                    value={assetQrBg}
                    onChange={(e) => setAssetQrBg(e.target.value)}
                    style={{ width: 40, height: 32, borderRadius: 4, cursor: 'pointer', border: '1px solid #cbd5e1' }}
                  />
                </Box>
              </Box>

              {/* QR Size Slider */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155', mb: 1 }}>
                  QR Code Resolution / Size: <strong>{assetQrSize} x {assetQrSize} px</strong>
                </Typography>
                <Slider
                  value={assetQrSize}
                  min={150}
                  max={350}
                  step={10}
                  valueLabelDisplay="auto"
                  onChange={(_, val) => setAssetQrSize(val as number)}
                  marks={[
                    { value: 150, label: '150px' },
                    { value: 200, label: '200px' },
                    { value: 250, label: '250px' },
                    { value: 300, label: '300px' },
                    { value: 350, label: '350px' },
                  ]}
                  sx={{ width: '95%', ml: 1 }}
                />
              </Box>

              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveAssetQrStyle}
                disabled={!selectedAsset}
                sx={{ textTransform: 'none', fontWeight: 700, mt: 1 }}
              >
                Save QR Styling
              </Button>
            </Paper>

            {/* Custom Dynamic Data Fields Builder (TC-14 Steps 6 & 7) */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#001A4D', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TuneIcon color="primary" /> Dynamic Custom Data Fields
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  startIcon={savingCustomFields ? <CircularProgress size={14} /> : <SaveIcon />}
                  onClick={handleSaveCustomFields}
                  disabled={!selectedAsset || savingCustomFields}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Save Fields
                </Button>
              </Box>

              <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                Attach custom attributes to this asset (e.g. Serial No, Warranty Expiration, Hardware Version, MAC Address).
              </Typography>

              {/* Add Field Inputs */}
              <Grid container spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Field Name (e.g. Serial No)"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Field Value (e.g. SN-2025-001)"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomField();
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="secondary"
                    startIcon={<AddIcon />}
                    onClick={handleAddCustomField}
                    sx={{ textTransform: 'none', height: 40 }}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>

              {/* Existing Fields Table */}
              {customFields.length > 0 ? (
                <TableContainer component={Box} sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Field Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Field Value</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, width: 80 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {customFields.map((f, index) => (
                        <TableRow key={index} hover>
                          <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{f.key}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', color: '#0f766e' }}>{f.value}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" color="error" onClick={() => handleRemoveCustomField(index)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info" sx={{ mt: 1 }}>
                  No custom fields attached to this asset yet. Use the inputs above to add attributes like <code>Serial No = SN-2025-001</code>.
                </Alert>
              )}
            </Paper>
          </Grid>

          {/* Live Preview Card */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 2, position: 'sticky', top: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#001A4D', mb: 2 }}>
                Live QR Code Preview
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 3,
                  bgcolor: assetQrBg,
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  minHeight: 280,
                  transition: 'all 0.3s ease'
                }}
              >
                {generatingAssetQr ? (
                  <CircularProgress />
                ) : assetQrCode ? (
                  <Box sx={{ textAlign: 'center' }}>
                    <Image
                      src={assetQrCode}
                      alt="Asset QR Code"
                      width={assetQrSize}
                      height={assetQrSize}
                      style={{ borderRadius: 8, display: 'inline-block' }}
                      unoptimized
                    />
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#64748b', fontWeight: 600 }}>
                      Payload: ASSET | {selectedAsset?.assetTag}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Select an asset to render QR preview
                  </Typography>
                )}
              </Box>

              {/* Action Buttons */}
              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {assetQrCode && (
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={<DownloadIcon />}
                    href={assetQrCode}
                    download={`${selectedAsset?.assetTag || 'asset'}-QR.png`}
                    sx={{ textTransform: 'none', py: 1.2, fontWeight: 700, borderRadius: 2 }}
                  >
                    Download QR Code Image
                  </Button>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleSaveAssetQrStyle}
                  disabled={!selectedAsset}
                  sx={{ textTransform: 'none', py: 1.2, fontWeight: 700, borderRadius: 2 }}
                >
                  Apply & Save Style to Asset
                </Button>
              </Box>

              {/* Active Specifications Badge */}
              <Divider sx={{ my: 2.5 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
                Configuration Summary:
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: 13, mb: 0.5 }}>
                • <strong>Foreground Color:</strong> <span style={{ color: assetQrColor }}>{assetQrColor}</span>
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: 13, mb: 0.5 }}>
                • <strong>Background:</strong> {assetQrBg}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: 13, mb: 0.5 }}>
                • <strong>Resolution:</strong> {assetQrSize} x {assetQrSize} px
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: 13 }}>
                • <strong>Attached Fields:</strong> {customFields.length} dynamic attributes
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: ROOM QR GENERATOR */}
      {tabIndex === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#001A4D', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <RoomIcon color="primary" /> Room & Location QR Code Generator
              </Typography>

              <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                Generate official room QR checkpoints for physical spaces. Scanning a room QR logs checkpoint arrival and tracks asset locations.
              </Typography>

              <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                <InputLabel id="room-select-label">Select Room</InputLabel>
                <Select
                  labelId="room-select-label"
                  label="Select Room"
                  value={selectedRoomId}
                  onChange={(e) => handleSelectRoom(e.target.value)}
                  disabled={loadingRooms}
                >
                  {rooms.map((r) => (
                    <MenuItem key={r._id} value={r._id}>
                      <strong>{r.code}</strong> - {r.name} ({r.building || 'Building'} {r.floor ? `, Floor ${r.floor}` : ''})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedRoom && (
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {selectedRoom.name} ({selectedRoom.code})
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                    Building: {selectedRoom.building || 'N/A'} | Floor: {selectedRoom.floor ?? 'N/A'} | Type: {selectedRoom.roomType || 'Office'}
                  </Typography>
                  {selectedRoom.latitude && selectedRoom.longitude && (
                    <Typography variant="caption" sx={{ color: '#0066FF', display: 'block', mt: 0.5 }}>
                      Map Coordinates: {selectedRoom.latitude.toFixed(5)}, {selectedRoom.longitude.toFixed(5)}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Room QR Styling */}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
                Styling:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                {COLOR_PRESETS.map((p) => (
                  <Button
                    key={p.color}
                    size="small"
                    variant={roomQrColor === p.color ? 'contained' : 'outlined'}
                    onClick={() => {
                      setRoomQrColor(p.color);
                      if (selectedRoomId) handleSelectRoom(selectedRoomId);
                    }}
                    sx={{ textTransform: 'none', borderColor: p.color, color: roomQrColor === p.color ? '#fff' : p.color, bgcolor: roomQrColor === p.color ? p.color : 'transparent' }}
                  >
                    {p.name}
                  </Button>
                ))}
              </Box>

              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => selectedRoomId && handleSelectRoom(selectedRoomId)}
                disabled={!selectedRoomId || generatingRoomQr}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Regenerate Room QR
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#001A4D', mb: 2 }}>
                Room Checkpoint QR Preview
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 3,
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  minHeight: 280
                }}
              >
                {generatingRoomQr ? (
                  <CircularProgress />
                ) : roomQrCode ? (
                  <Box sx={{ textAlign: 'center' }}>
                    <Image
                      src={roomQrCode}
                      alt="Room QR Code"
                      width={220}
                      height={220}
                      style={{ borderRadius: 8, display: 'inline-block' }}
                      unoptimized
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', mt: 1 }}>
                      {selectedRoom?.code} - {selectedRoom?.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Payload: ROOM | {selectedRoom?._id}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Select a room to render QR code
                  </Typography>
                )}
              </Box>

              {roomQrCode && (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  href={roomQrCode}
                  download={`Room-${selectedRoom?.code || 'checkpoint'}-QR.png`}
                  sx={{ textTransform: 'none', py: 1.2, fontWeight: 700, borderRadius: 2, mt: 3 }}
                >
                  Download Room Checkpoint QR
                </Button>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Snackbar notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}
