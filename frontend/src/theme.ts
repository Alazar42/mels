import { createTheme } from '@mui/material/styles';

export const melsTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0c0f17',
      paper: '#11141c',
    },
    primary: {
      main: '#20c997',
      light: '#3dd68c',
      dark: '#0fa573',
      contrastText: '#000000',
    },
    secondary: {
      main: '#38bdf8',
      light: '#7dd3fc',
      dark: '#0284c7',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
      disabled: '#475569',
    },
    divider: '#1c2230',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 13,
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0c0f17',
          color: '#f1f5f9',
          userSelect: 'none',
          scrollbarColor: '#232938 transparent',
          '&::-webkit-scrollbar': {
            width: 6,
            height: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#232938',
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#333b50',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '6px 14px',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: 6,
          color: '#94a3b8',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            color: '#f8fafc',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 36,
        },
        indicator: {
          backgroundColor: '#20c997',
          height: 2,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 36,
          padding: '6px 14px',
          textTransform: 'none',
          fontWeight: 500,
          fontSize: 12,
          color: '#94a3b8',
          '&.Mui-selected': {
            color: '#f1f5f9',
            fontWeight: 600,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #1c2230',
          padding: '6px 8px',
          fontSize: 12,
        },
        head: {
          color: '#64748b',
          fontWeight: 600,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#0f121a',
          borderRadius: 6,
          fontSize: 12,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1c2230',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2e384d',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#20c997',
          },
        },
        input: {
          padding: '6px 10px',
        },
      },
    },
  },
});
