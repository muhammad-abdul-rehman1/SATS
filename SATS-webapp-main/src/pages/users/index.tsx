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
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Layout } from '@/components/Layout/MainLayout';
import { DataTable } from '@/components/Common/DataTable';
import { useProtectedRoute } from '@/hooks/useRoute';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/services/users';
import { USER_ROLES } from '@/utils/constants';
import { formatLabel } from '@/utils/formatting';

export default function Users() {
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addFormData, setAddFormData] = useState<any>({ role: 'USER' });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await usersAPI.getAll({ search, role, limit: 100 });
      const responseData = response.data as any;
      
      // Handle the backend response format: { users: [...] }
      const userData = responseData.users || responseData.data?.data || responseData.data || [];
      setUsers(userData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, role]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadUsers();
  }, [isAuthenticated, authLoading, loadUsers]);

  const handleEditOpen = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
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

  const handleAddOpen = () => {
    setAddFormData({ role: 'USER' });
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
    { id: 'name', label: 'Name', minWidth: 150 },
    { id: 'email', label: 'Email', minWidth: 200 },
    { id: 'role', label: 'Role', minWidth: 120, format: (v: string) => formatLabel(v) },
    { id: 'createdAt', label: 'Created', minWidth: 150, format: (v: string) => new Date(v).toLocaleDateString() },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 120,
      render: (row: any) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleEditOpen(row)}
            title="Edit user"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteOpen(row)}
            title="Delete user"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
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
              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  fullWidth
                  label="Search users"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
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
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAddClose}>Cancel</Button>
            <Button onClick={handleAddSave} variant="contained" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Add User'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
          <DialogTitle>Edit User</DialogTitle>
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
              value={editFormData.role || ''}
              onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
              margin="normal"
            >
              {USER_ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {formatLabel(r)}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditClose}>Cancel</Button>
            <Button onClick={handleEditSave} variant="contained" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save'}
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
