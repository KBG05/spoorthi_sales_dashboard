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
  Category as CategoryIcon,
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
  { path: '/abc-analysis', label: 'Trend Analysis', icon: <CategoryIcon /> },
  { path: '/customer-trend', label: 'Customer Trends', icon: <TrendingUpIcon /> },
  { path: '/customer-behaviour', label: 'Customer Behavior', icon: <PeopleIcon /> },
  { path: '/cba', label: 'CBA', icon: <AnalyticsIcon /> },
  { path: '/customer-class-comparison', label: 'Class Comparison', icon: <CompareIcon /> },
  { path: '/ticket-size', label: 'Ticket Size Analysis', icon: <ReceiptIcon /> },
  { path: '/product-behaviour', label: 'Product Behavior', icon: <InventoryIcon /> },
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
        transition: 'width 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms',
        '& .MuiDrawer-paper': {
          width: open ? DRAWER_WIDTH.EXPANDED : DRAWER_WIDTH.COLLAPSED,
          boxSizing: 'border-box',
          transition: 'width 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms',
          overflowX: 'hidden',
          willChange: 'width',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
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
          transition: 'justify-content 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms',
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
                      transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
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
                        transition: 'margin 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      sx={{
                        opacity: open ? 1 : 0,
                        whiteSpace: 'nowrap',
                        transition: 'opacity 120ms cubic-bezier(0.4, 0, 1, 1) 0ms',
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
