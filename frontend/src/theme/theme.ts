import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

// "Datta Able" Light Theme - Clean, professional, light & airy
const lightPalette = {
  primary: {
    main: '#5E72E4', // Vibrant blue/purple for buttons and active states
    light: '#EEEEEE',
    dark: '#4C5FD5',
    contrastText: '#fff',
  },
  secondary: {
    main: '#2DCE89', // Bright cyan/green for positive indicators
    light: '#5FE3A1',
    dark: '#24A46D',
    contrastText: '#fff',
  },
  success: {
    main: '#2DCE89', // Green for positive changes
    light: '#5FE3A1',
    dark: '#24A46D',
    contrastText: '#fff',
  },
  error: {
    main: '#F44336', // Warm red/orange for negative trends
    light: '#E57373',
    dark: '#D32F2F',
    contrastText: '#fff',
  },
  warning: {
    main: '#FCAB00',
    light: '#FFB74D',
    dark: '#F57C00',
    contrastText: '#fff',
  },
  info: {
    main: '#5E72E4',
    light: '#90CAF9',
    dark: '#1976D2',
    contrastText: '#fff',
  },
  background: {
    default: '#F4F7FA', // Very light grey for main content area
    paper: '#FFFFFF', // Pure white for cards
  },
  text: {
    primary: '#333333', // Dark charcoal, not pure black
    secondary: '#888888', // Medium grey
    disabled: 'rgba(0, 0, 0, 0.38)',
  },
  divider: 'rgba(0, 0, 0, 0.08)',
};

// "Corona" Dark Theme - Sleek, modern, high-contrast dark mode
const darkPalette = {
  primary: {
    main: '#00D25B', // Bright vibrant green for buttons and positive stats
    light: '#33DB78',
    dark: '#00A849',
    contrastText: '#000000',
  },
  secondary: {
    main: '#FCAB00', // Bright orange/yellow
    light: '#FFB74D',
    dark: '#F57C00',
    contrastText: '#000000',
  },
  success: {
    main: '#00D25B',
    light: '#33DB78',
    dark: '#00A849',
    contrastText: '#000000',
  },
  error: {
    main: '#FF4747', // Clear red for negative stats
    light: '#FF7373',
    dark: '#E63946',
    contrastText: '#fff',
  },
  warning: {
    main: '#FCAB00',
    light: '#FFB74D',
    dark: '#F57C00',
    contrastText: '#000000',
  },
  info: {
    main: '#00D25B',
    light: '#33DB78',
    dark: '#00A849',
    contrastText: '#000000',
  },
  background: {
    default: '#0F1117', // True dark, near-black background
    paper: '#1C1E26', // Clearly lighter cards with better contrast
  },
  text: {
    primary: '#FFFFFF', // Pure white
    secondary: '#8C8C8C', // Light-to-medium grey
    disabled: 'rgba(255, 255, 255, 0.5)',
  },
  divider: 'rgba(255, 255, 255, 0.08)',
};

// Common theme options
const getCommonThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === 'light' ? lightPalette : darkPalette),
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.6,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.75,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
    },
  },
  shape: {
    borderRadius: 2, // Even sharper (was 4)
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: mode === 'light' 
            ? 'rgba(0, 0, 0, 0.05) 0px 4px 12px'
            : 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: mode === 'light' ? '#34495E' : '#1C1E26',
          color: '#FFFFFF',
          borderRight: mode === 'light' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: mode === 'light' ? 8 : 4,
          '&.Mui-selected': {
            backgroundColor: mode === 'light' ? '#5E72E4' : 'rgba(255, 255, 255, 0.05)',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: mode === 'light' ? '#4C5FD5' : 'rgba(255, 255, 255, 0.08)',
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'light' ? '#FFFFFF' : '#1C1E26',
          border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.12)', // Stronger border
          borderRadius: mode === 'light' ? 8 : 4, // Sharper in dark mode
          boxShadow: mode === 'light'
            ? 'rgba(0, 0, 0, 0.05) 0px 4px 12px'
            : '0 1px 3px rgba(0, 0, 0, 0.5)', // Subtle but visible shadow
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: mode === 'light' ? '#FFFFFF' : '#1C1E26',
          border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)', // Stronger borders
          borderRadius: 4,
        },
        elevation1: {
          boxShadow: mode === 'light'
            ? 'rgba(0, 0, 0, 0.05) 0px 4px 12px'
            : '0 1px 3px rgba(0, 0, 0, 0.5)',
        },
        elevation2: {
          boxShadow: mode === 'light'
            ? 'rgba(0, 0, 0, 0.08) 0px 6px 16px'
            : '0 2px 6px rgba(0, 0, 0, 0.6)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Sentence case, not uppercase
          borderRadius: mode === 'light' ? 999 : 4, // Pill-shaped in light, standard in dark
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: mode === 'light' 
              ? 'rgba(0, 0, 0, 0.1) 0px 4px 12px'
              : 'none',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: mode === 'light'
            ? '1px solid rgba(0, 0, 0, 0.08)'
            : '1px solid rgba(255, 255, 255, 0.08)',
        },
        head: {
          fontWeight: 600,
          backgroundColor: mode === 'light' 
            ? 'rgba(0, 0, 0, 0.02)' 
            : 'rgba(255, 255, 255, 0.02)',
        },
      },
    },
  },
});

// Create themes
export const lightTheme = createTheme(getCommonThemeOptions('light'));
export const darkTheme = createTheme(getCommonThemeOptions('dark'));

// Export a function to get theme by mode
export const getTheme = (mode: 'light' | 'dark') => {
  return mode === 'light' ? lightTheme : darkTheme;
};
