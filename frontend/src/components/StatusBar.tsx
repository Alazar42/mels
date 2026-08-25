import React from 'react';
import { Box, Typography } from '@mui/material';
import { Cpu, ShieldCheck, Activity, Globe, Wifi } from 'lucide-react';
import { Environment, ResponseData } from '../types';
import { formatBytes, formatDuration } from '../utils/formatters';

interface StatusBarProps {
  environment: Environment | null;
  response: ResponseData | null;
  isLoading: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ environment, response, isLoading }) => {
  return (
    <Box
      sx={{
        height: 24,
        bgcolor: '#0a0c10',
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.5,
        fontSize: 11,
        color: 'text.secondary',
        userSelect: 'none',
        zIndex: 50,
      }}
    >
      {/* Left side */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Globe size={11} style={{ color: environment ? '#10b981' : '#64748b' }} />
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
            {environment ? environment.name : 'No Environment'}
          </Typography>
        </Box>
      </Box>

      {/* Right side */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.light' }}>
            <Activity size={11} className="animate-spin" />
            <Typography variant="caption" sx={{ fontSize: 11, color: 'inherit' }}>
              Executing HTTP Request...
            </Typography>
          </Box>
        ) : response ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Wifi size={11} />
              <Typography variant="caption" sx={{ fontSize: 11 }}>
                {response.proto || 'HTTP/1.1'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                Status:
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: response.statusCode >= 200 && response.statusCode < 300 ? 'success.main' : 'error.main',
                }}
              >
                {response.statusCode} {response.statusText?.startsWith(`${response.statusCode}`) ? response.statusText.substring(`${response.statusCode}`.length).trim() : response.statusText || 'OK'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                Time:
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
                {formatDuration(response.timeMs)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                Size:
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
                {formatBytes(response.size)}
              </Typography>
            </Box>
          </>
        ) : (
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.disabled' }}>
            Ready
          </Typography>
        )}
      </Box>
    </Box>
  );
};
