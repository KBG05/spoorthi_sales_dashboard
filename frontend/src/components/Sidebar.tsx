import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Box,
  Divider,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  Star as StarIcon,
  Receipt as ReceiptIcon,
  ShowChart as ShowChartIcon,
  SwapHoriz as SwapHorizIcon,
  CompareArrows as CompareArrowsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ListAlt as ListAltIcon,
  Compare as CompareIcon,
} from '@mui/icons-material';
import { DRAWER_WIDTH } from '../constants/constants';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactElement;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/trend-analysis', label: 'Trend Analysis', icon: <TrendingUpIcon /> },
  { path: '/customer-behaviour', label: 'Customer Behavior', icon: <PeopleIcon /> },
  { path: '/customer-comparison', label: 'Customer Comparison', icon: <CompareIcon /> },
  { path: '/product-behaviour', label: 'Article Behavior', icon: <InventoryIcon /> },
  // { path: '/customer-class-comparison', label: 'Class Comparison', icon: <CompareIcon /> }, // Hidden for now
  { path: '/ticket-size', label: 'Ticket Size Analysis', icon: <ReceiptIcon /> },
  { path: '/transition-analysis', label: 'Transition Analysis', icon: <SwapHorizIcon /> },
  { path: '/forecast', label: 'Demand Forecast', icon: <ShowChartIcon /> },
  { path: '/top-performance', label: 'Top Performers', icon: <StarIcon /> },
  { path: '/cross-sell', label: 'Cross-Sell Analysis', icon: <ShoppingCartIcon /> },
  { path: '/customer-product', label: 'Customer Product List', icon: <ListAltIcon /> },
  { path: '/export-data', label: 'Export Data', icon: <CompareArrowsIcon /> },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const theme = useTheme();
  const activeAccent = theme.palette.mode === 'light' ? '#a437b0' : '#d16be0';
  const activeText = theme.palette.mode === 'light' ? '#6d1f7a' : '#f2ccf8';

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? DRAWER_WIDTH.EXPANDED : DRAWER_WIDTH.COLLAPSED,
        flexShrink: 0,
        transition: 'width 250ms ease-in-out',
        '& .MuiDrawer-paper': {
          width: open ? DRAWER_WIDTH.EXPANDED : DRAWER_WIDTH.COLLAPSED,
          boxSizing: 'border-box',
          transition: 'width 250ms ease-in-out',
          overflowX: 'hidden',
        },
      }}
    >
      {/* Toggle Button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-end' : 'center',
          p: 1,
          minHeight: 64,
          transition: 'justify-content 250ms ease-in-out',
        }}
      >
        <IconButton
          onClick={onToggle}
          size="small"
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          sx={{ color: theme.palette.mode === 'light' ? theme.palette.text.secondary : 'inherit' }}
        >
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>
      
      <Divider />

      {/* Navigation List */}
      <List sx={{ pt: 0.5, pb: 1.5 }}>
        {navItems.map((item) => (
          <Tooltip
            key={item.path}
            title={open ? '' : item.label}
            placement="right"
            arrow
          >
            <ListItem disablePadding sx={{ display: 'block' }}>
              <NavLink
                to={item.path}
                end={item.path === '/dashboard'}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {({ isActive }: { isActive: boolean }) => (
                  <ListItemButton
                    sx={{
                      minHeight: 46,
                      justifyContent: open ? 'initial' : 'center',
                      px: 1.5,
                      mx: 0.9,
                      my: 0.5,
                      borderRadius: 2,
                      borderLeft: `3px solid ${isActive ? activeAccent : alpha(activeAccent, 0)}`,
                      backgroundColor: isActive
                        ? alpha(activeAccent, theme.palette.mode === 'light' ? 0.18 : 0.24)
                        : 'transparent',
                      color: isActive
                        ? activeText
                        : theme.palette.mode === 'light'
                          ? theme.palette.text.secondary
                          : 'inherit',
                      transition: 'all 220ms ease',
                      '&:hover, &:active, &:focus': {
                        backgroundColor: isActive
                          ? alpha(activeAccent, theme.palette.mode === 'light' ? 0.24 : 0.32)
                          : alpha(activeAccent, theme.palette.mode === 'light' ? 0.1 : 0.16),
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 1.5 : 'auto',
                        justifyContent: 'center',
                        color: isActive
                          ? activeText
                          : theme.palette.mode === 'light'
                            ? theme.palette.text.secondary
                            : 'inherit',
                        transition: 'margin 220ms ease-in-out',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      sx={{
                        opacity: open ? 1 : 0,
                        whiteSpace: 'nowrap',
                        transition: open ? 'opacity 220ms ease 40ms' : 'opacity 120ms ease',
                        '& .MuiTypography-root': {
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.88rem',
                        },
                      }}
                    />
                  </ListItemButton>
                )}
              </NavLink>
            </ListItem>
          </Tooltip>
        ))}
      </List>
    </Drawer>
  );
}
