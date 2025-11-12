import { useState } from 'react';
import { Outlet } from 'react-router';
import { Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import Sidebar from '../components/Sidebar';
import { useThemeMode } from '../theme/ThemeProvider';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start collapsed
  const { mode, toggleTheme } = useThemeMode();

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
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Textile Analytics
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton onClick={toggleTheme} color="inherit">
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Toolbar>
        </AppBar>

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
            © Numentrix
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
