import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  CircularProgress,
  Grid,
  Alert,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Tooltip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Switch,
  Tabs,
  Tab,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LockReset as LockResetIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  VpnKey as KeyIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import { Layout } from '@/components/Layout/MainLayout';
import { DataTable } from '@/components/Common/DataTable';
import { useProtectedRoute } from '@/hooks/useRoute';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/services/users';
import { USER_ROLES, AVAILABLE_PERMISSIONS } from '@/utils/constants';
import { formatLabel } from '@/utils/formatting';

export default function Users() {
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addFormData, setAddFormData] = useState<any>({ role: 'USER', permissions: [] });

  // Reset password dialog state (FR10-05)
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<any>(null);
  const [resetTab, setResetTab] = useState(0); // 0 = email link, 1 = manual password
  const [manualPassword, setManualPassword] = useState('');

  // Status toggle dialog state (FR10-03)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<any>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await usersAPI.getAll({ search, role, status: status || undefined, limit: 100 });
      const responseData = response.data as any;
      
      // Handle the backend response format: { users: [...] }
      const userData = responseData.users || responseData.data?.data || responseData.data || [];
      setUsers(userData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, role, status]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadUsers();
  }, [isAuthenticated, authLoading, loadUsers]);

  const handleEditOpen = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'USER',
      isActive: user.isActive !== false,
      permissions: user.permissions || [],
    });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    setEditFormData({});
  };

  const handleEditSave = async () => {
    try {
      setActionLoading(true);
      setError('');
      await usersAPI.update(selectedUser.id || selectedUser._id, editFormData);
      setSuccessMessage('User updated successfully');
      handleEditClose();
      loadUsers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  // Status toggle handler (FR10-03)
  const handleStatusToggleOpen = (user: any) => {
    setUserToToggle(user);
    setStatusDialogOpen(true);
  };

  const handleStatusToggleClose = () => {
    setStatusDialogOpen(false);
    setUserToToggle(null);
  };

  const handleStatusToggleConfirm = async () => {
    try {
      setActionLoading(true);
      setError('');
      const newStatus = !(userToToggle.isActive !== false);
      await usersAPI.toggleStatus(userToToggle.id || userToToggle._id, newStatus);
      setSuccessMessage(`User account ${newStatus ? 'activated' : 'deactivated'} successfully`);
      handleStatusToggleClose();
      loadUsers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update account status');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset password handlers (FR10-05)
  const handleResetPasswordOpen = (user: any) => {
    setUserToReset(user);
    setResetTab(0);
    setManualPassword('');
    setResetDialogOpen(true);
  };

  const handleResetPasswordClose = () => {
    setResetDialogOpen(false);
    setUserToReset(null);
    setManualPassword('');
  };

  const handleSendResetLink = async () => {
    try {
      setActionLoading(true);
      setError('');
      const res = await usersAPI.sendResetLink(userToReset.id || userToReset._id);
      setSuccessMessage(res.data?.message || `Password reset link sent to ${userToReset.email}`);
      handleResetPasswordClose();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetManualPassword = async () => {
    if (!manualPassword || manualPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      const res = await usersAPI.resetPassword(userToReset.id || userToReset._id, manualPassword);
      setSuccessMessage(res.data?.message || `Password for ${userToReset.email} updated successfully`);
      handleResetPasswordClose();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddOpen = () => {
    setAddFormData({ role: 'USER', permissions: [] });
    setAddDialogOpen(true);
  };

  const handleAddClose = () => {
    setAddDialogOpen(false);
    setAddFormData({ role: 'USER' });
  };

  const handleAddSave = async () => {
    try {
      setActionLoading(true);
      setError('');
      await usersAPI.create(addFormData);
      setSuccessMessage('User created successfully');
      handleAddClose();
      loadUsers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOpen = (user: any) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      setActionLoading(true);
      setError('');
      await usersAPI.delete(userToDelete.id || userToDelete._id);
      setSuccessMessage('User deleted successfully');
      handleDeleteClose();
      loadUsers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      id: 'name',
      label: 'User',
      minWidth: 220,
      render: (row: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              bgcolor:
                row.role === 'SUPER_ADMIN'
                  ? 'error.main'
                  : row.role === 'ADMIN'
                  ? 'primary.main'
                  : 'grey.600',
              width: 36,
              height: 36,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {(row.name || row.email || 'U').charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {row.name || 'Unnamed User'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'role',
      label: 'Role',
      minWidth: 130,
      render: (row: any) => {
        const color =
          row.role === 'SUPER_ADMIN' ? 'error' : row.role === 'ADMIN' ? 'primary' : 'default';
        return (
          <Chip
            label={formatLabel(row.role || 'USER')}
            size="small"
            color={color as any}
            variant="outlined"
            sx={{ fontWeight: 500 }}
          />
        );
      },
    },
    {
      id: 'status',
      label: 'Account Status',
      minWidth: 140,
      render: (row: any) => {
        const active = row.isActive !== false;
        return (
          <Chip
            size="small"
            icon={active ? <CheckCircleIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
            label={active ? 'Active' : 'Deactivated'}
            color={active ? 'success' : 'error'}
            variant="outlined"
            sx={{ fontWeight: 500 }}
          />
        );
      },
    },
    {
      id: 'isEmailVerified',
      label: 'Email Verified',
      minWidth: 130,
      render: (row: any) => (
        <Chip
          size="small"
          label={row.isEmailVerified ? 'Verified' : 'Pending'}
          color={row.isEmailVerified ? 'success' : 'warning'}
          variant="filled"
          sx={{ fontSize: '0.75rem', fontWeight: 500 }}
        />
      ),
    },
    {
      id: 'createdAt',
      label: 'Created',
      minWidth: 120,
      format: (v: string) => (v ? new Date(v).toLocaleDateString() : '-'),
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 180,
      render: (row: any) => {
        const currentUserId = currentUser?.id || (currentUser as any)?._id;
        const rowId = row.id || row._id;
        const isSelf = Boolean(currentUserId && rowId && String(currentUserId) === String(rowId));
        const active = row.isActive !== false;

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Edit user details & permissions">
              <IconButton size="small" color="primary" onClick={() => handleEditOpen(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip
              title={
                isSelf
                  ? 'Cannot change your own account status'
                  : active
                  ? 'Deactivate user account'
                  : 'Activate user account'
              }
            >
              <span>
                <IconButton
                  size="small"
                  color={active ? 'warning' : 'success'}
                  onClick={() => handleStatusToggleOpen(row)}
                  disabled={isSelf}
                >
                  {active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Reset user password">
              <IconButton size="small" color="info" onClick={() => handleResetPasswordOpen(row)}>
                <LockResetIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={isSelf ? 'Cannot delete your own account' : 'Delete user'}>
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteOpen(row)}
                  disabled={isSelf}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
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
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                Users
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Manage system users and their roles
              </Typography>
            </Box>
            {currentUser?.role === 'SUPER_ADMIN' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddOpen}
                sx={{ textTransform: 'none' }}
              >
                Add New User
              </Button>
            )}
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={5}>
                <TextField
                  fullWidth
                  label="Search users"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3.5}>
                <TextField
                  select
                  fullWidth
                  label="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  size="small"
                >
                  <MenuItem value="">All Roles</MenuItem>
                  {USER_ROLES.map((r) => (
                    <MenuItem key={r} value={r}>
                      {formatLabel(r)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3.5}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  size="small"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="active">Active Only</MenuItem>
                  <MenuItem value="deactivated">Deactivated Only</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Users Table */}
        <DataTable
          columns={columns}
          rows={users}
          loading={loading}
          emptyMessage="No users found"
        />

        {/* Add User Dialog */}
        <Dialog open={addDialogOpen} onClose={handleAddClose} maxWidth="sm" fullWidth>
          <DialogTitle>Add New User</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={addFormData.name || ''}
              onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={addFormData.email || ''}
              onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={addFormData.password || ''}
              onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
              margin="normal"
            />
            <TextField
              select
              fullWidth
              label="Role"
              value={addFormData.role || 'USER'}
              onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value })}
              margin="normal"
            >
              {USER_ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {formatLabel(r)}
                </MenuItem>
              ))}
            </TextField>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShieldIcon fontSize="small" color="primary" /> User Permissions
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Select features permitted for this user.
            </Typography>
            <FormGroup>
              <Grid container spacing={1}>
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const isChecked = Boolean(addFormData.permissions?.includes(perm.id));
                  return (
                    <Grid item xs={12} sm={6} key={perm.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = addFormData.permissions || [];
                              const updated = e.target.checked
                                ? [...current, perm.id]
                                : current.filter((p: string) => p !== perm.id);
                              setAddFormData({ ...addFormData, permissions: updated });
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{perm.label}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>{perm.description}</Typography>
                          </Box>
                        }
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAddClose}>Cancel</Button>
            <Button onClick={handleAddSave} variant="contained" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Add User'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit User Dialog (FR10-02, FR10-03, FR10-04) */}
        <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
          <DialogTitle>Edit User Details & Permissions</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={editFormData.name || ''}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={editFormData.email || ''}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              margin="normal"
            />
            <TextField
              select
              fullWidth
              label="Role"
              value={editFormData.role || 'USER'}
              onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
              margin="normal"
            >
              {USER_ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {formatLabel(r)}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ mt: 2, mb: 1, p: 1.5, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editFormData.isActive !== false}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    disabled={
                      Boolean(
                        (currentUser?.id || (currentUser as any)?._id) &&
                        (selectedUser?.id || selectedUser?._id) &&
                        String(currentUser?.id || (currentUser as any)?._id) === String(selectedUser?.id || selectedUser?._id)
                      )
                    }
                    color="success"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Account Status: {editFormData.isActive !== false ? 'Active' : 'Deactivated'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {editFormData.isActive !== false
                        ? 'User can log in to web and mobile apps'
                        : 'User login is blocked across all platforms'}
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShieldIcon fontSize="small" color="primary" /> User Permissions
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Configure specific module permissions granted to this user.
            </Typography>
            <FormGroup>
              <Grid container spacing={1}>
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const isChecked = Boolean(editFormData.permissions?.includes(perm.id));
                  return (
                    <Grid item xs={12} sm={6} key={perm.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = editFormData.permissions || [];
                              const updated = e.target.checked
                                ? [...current, perm.id]
                                : current.filter((p: string) => p !== perm.id);
                              setEditFormData({ ...editFormData, permissions: updated });
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{perm.label}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>{perm.description}</Typography>
                          </Box>
                        }
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditClose}>Cancel</Button>
            <Button onClick={handleEditSave} variant="contained" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reset Password Dialog (FR10-05) */}
        <Dialog open={resetDialogOpen} onClose={handleResetPasswordClose} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockResetIcon color="primary" /> Reset User Password
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Reset password for <strong>{userToReset?.name || userToReset?.email}</strong> ({userToReset?.email})
            </Typography>

            <Tabs
              value={resetTab}
              onChange={(_, val) => setResetTab(val)}
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab icon={<EmailIcon fontSize="small" />} iconPosition="start" label="Send Email Link" />
              <Tab icon={<KeyIcon fontSize="small" />} iconPosition="start" label="Manual Password" />
            </Tabs>

            {resetTab === 0 ? (
              <Box sx={{ py: 1 }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  An automated email will be sent to <strong>{userToReset?.email}</strong> containing a secure link to reset their password.
                </Typography>
                <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
                  The user can click the link in their inbox to set a new password of their choice.
                </Alert>
              </Box>
            ) : (
              <Box sx={{ py: 1 }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Directly set a new temporary password for this user.
                </Typography>
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  size="small"
                  helperText="Minimum 6 characters. The user can log in immediately with this password."
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleResetPasswordClose}>Cancel</Button>
            {resetTab === 0 ? (
              <Button
                variant="contained"
                startIcon={<EmailIcon />}
                onClick={handleSendResetLink}
                disabled={actionLoading}
              >
                {actionLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<KeyIcon />}
                onClick={handleSetManualPassword}
                disabled={actionLoading || manualPassword.length < 6}
              >
                {actionLoading ? 'Updating...' : 'Set Password'}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Status Toggle Dialog (FR10-03) */}
        <Dialog open={statusDialogOpen} onClose={handleStatusToggleClose} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {userToToggle?.isActive !== false ? <BlockIcon color="warning" /> : <CheckCircleIcon color="success" />}
            {userToToggle?.isActive !== false ? 'Deactivate User Account' : 'Activate User Account'}
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Typography variant="body2">
              {userToToggle?.isActive !== false ? (
                <>
                  Are you sure you want to deactivate <strong>{userToToggle?.name || userToToggle?.email}</strong>?
                  <br /><br />
                  Deactivated users are <strong>immediately blocked from logging in</strong> to both the mobile and web applications. All their historical data and audit trails will remain preserved.
                </>
              ) : (
                <>
                  Are you sure you want to activate <strong>{userToToggle?.name || userToToggle?.email}</strong>?
                  <br /><br />
                  Their login access will be restored immediately across all platforms.
                </>
              )}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleStatusToggleClose}>Cancel</Button>
            <Button
              onClick={handleStatusToggleConfirm}
              variant="contained"
              color={userToToggle?.isActive !== false ? 'warning' : 'success'}
              disabled={actionLoading}
            >
              {actionLoading ? 'Updating...' : userToToggle?.isActive !== false ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={deleteDialogOpen} onClose={handleDeleteClose} maxWidth="sm" fullWidth>
          <DialogTitle>Delete User</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography>
              Are you sure you want to delete <strong>{userToDelete?.name || userToDelete?.email}</strong>? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteClose}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} variant="contained" color="error" disabled={actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}
