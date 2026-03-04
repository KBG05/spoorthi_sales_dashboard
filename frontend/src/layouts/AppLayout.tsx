import { useState } from 'react';
import { Outlet } from 'react-router';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Divider,
  ListItemIcon,
} from '@mui/material';
import { Brightness4, Brightness7, AccountCircle, Logout, Lock } from '@mui/icons-material';
import Logo1 from '../../public/Spoorthi-Logo.png';
import Logo2 from '../../public/logo1.png';
import Sidebar from '../components/Sidebar';
import { useThemeMode } from '../theme/ThemeProvider';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../constants/constants';

//const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { mode, toggleTheme } = useThemeMode();
  const { user, logout } = useAuth();
  
  // Profile menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const profileMenuOpen = Boolean(anchorEl);
  
  // Password change dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePasswordDialogOpen = () => {
    setPasswordDialogOpen(true);
    handleProfileMenuClose();
    setPasswordError(null);
    setPasswordSuccess(false);
    setCurrentPassword('');
    setNewPassword('');
  };

  const handlePasswordDialogClose = () => {
    setPasswordDialogOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setPasswordError(null);
    setPasswordSuccess(false);
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }

      setPasswordSuccess(true);
      setTimeout(() => {
        handlePasswordDialogClose();
      }, 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          transition: 'margin-left 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms',
        }}
      >
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ minHeight: 64, px: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <img src={Logo1} alt="Spoorthi Logo" style={{ height: 40, marginRight: 12 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Spoorthi Analytics
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <img src={Logo2} alt="Spoorthi Logo" style={{ height: 40, marginRight: 12 }} />
            <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 1 }}>
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
            <IconButton
              onClick={handleProfileMenuOpen}
              color="inherit"
              aria-controls={profileMenuOpen ? 'profile-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={profileMenuOpen ? 'true' : undefined}
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="profile-menu"
              anchorEl={anchorEl}
              open={profileMenuOpen}
              onClose={handleProfileMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Logged in as
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {user?.username}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handlePasswordDialogOpen}>
                <ListItemIcon>
                  <Lock fontSize="small" />
                </ListItemIcon>
                Change Password
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Dialog open={passwordDialogOpen} onClose={handlePasswordDialogClose} maxWidth="xs" fullWidth>
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            {passwordError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {passwordError}
              </Alert>
            )}
            {passwordSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Password changed successfully!
              </Alert>
            )}
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              margin="normal"
              autoFocus
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handlePasswordDialogClose}>Cancel</Button>
            <Button
              onClick={handlePasswordChange}
              variant="contained"
              disabled={!currentPassword || !newPassword || passwordSuccess}
            >
              Change Password
            </Button>
          </DialogActions>
        </Dialog>

        <Box 
          sx={{ 
            flexGrow: 1, 
            p: 2.5,
            maxWidth: '100%',
            width: '100%',
            boxSizing: 'border-box',
            overflowX: 'hidden',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <Outlet />
        </Box>

        <Box
          component="footer"
          sx={{
            py: 2,
            px: 3,
            mt: 'auto',
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © Copyright Lumin AI Systems
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
