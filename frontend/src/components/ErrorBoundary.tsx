import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            bgcolor: 'background.default',
            color: 'error.main',
            textAlign: 'center',
            gap: 1.5,
          }}
        >
          <AlertTriangle size={36} color="#ef4444" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {this.props.fallbackTitle || 'An error occurred while rendering this section.'}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              bgcolor: '#1a141a',
              p: 1,
              borderRadius: 1,
              border: 1,
              borderColor: 'error.dark',
              maxWidth: 500,
              wordBreak: 'break-word',
            }}
          >
            {this.state.error?.message || 'Unknown render error'}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<RotateCcw size={13} />}
            onClick={this.handleReset}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
