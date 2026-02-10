import React from 'react';
import { NavLink } from 'react-router';
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
  Analytics as AnalyticsIcon,
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
  { path: '/product-behaviour', label: 'Product Behavior', icon: <InventoryIcon /> },
  { path: '/cba', label: 'Customer Behaviour Analysis', icon: <AnalyticsIcon /> },
  // { path: '/customer-class-comparison', label: 'Class Comparison', icon: <CompareIcon /> }, // Hidden for now
  { path: '/ticket-size', label: 'Ticket Size Analysis', icon: <ReceiptIcon /> },
  { path: '/transition-analysis', label: 'Transition Analysis', icon: <SwapHorizIcon /> },
  { path: '/forecast', label: 'Demand Forecast', icon: <ShowChartIcon /> },
  { path: '/top-performance', label: 'Top Performers', icon: <StarIcon /> },
  { path: '/cross-sell', label: 'Cross-Sell Analysis', icon: <ShoppingCartIcon /> },
  { path: '/export-data', label: 'Export Data', icon: <CompareArrowsIcon /> },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export default function Sidebar({ open, onToggle }: SidebarProps) {
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
        <IconButton onClick={onToggle} size="small">
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>
      
      <Divider />

      {/* Navigation List */}
      <List>
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
                      minHeight: 48,
                      justifyContent: open ? 'initial' : 'center',
                      px: 2,
                      mx: open ? 0.5 : 0.5,
                      my: 0.5,
                      borderRadius: 1,
                      backgroundColor: isActive ? '#8B5CF6' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'inherit',
                      border: isActive ? '1.5px solid #8B5CF6' : '1px solid transparent',
                      transition: 'all 250ms ease-in-out',
                      '&:hover, &:active, &:focus': {
                        backgroundColor: isActive ? '#8B5CF6' : 'rgba(255, 255, 255, 0.05)',
                        borderColor: isActive ? '#8B5CF6' : 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 2 : 'auto',
                        justifyContent: 'center',
                        color: isActive ? '#FFFFFF' : 'inherit',
                        transition: 'margin 250ms ease-in-out',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      sx={{
                        opacity: open ? 1 : 0,
                        whiteSpace: 'nowrap',
                        transition: open 
                          ? 'opacity 250ms ease-in-out 50ms' 
                          : 'opacity 150ms ease-in-out 0ms',
                        '& .MuiTypography-root': {
                          fontWeight: isActive ? 600 : 400,
                          fontSize: '0.9rem',
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
