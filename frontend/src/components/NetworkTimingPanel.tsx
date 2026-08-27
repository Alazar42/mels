import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { TimingBreakdown } from '../types';

interface NetworkTimingPanelProps {
  timing?: TimingBreakdown | null;
  totalTimeMs?: number;
  isLoading?: boolean;
}

export const NetworkTimingPanel: React.FC<NetworkTimingPanelProps> = ({
  timing,
  totalTimeMs,
  isLoading = false,
}) => {
  const dns = timing?.dnsLookupMs ?? 0;
  const tcp = timing?.tcpConnMs ?? 0;
  const tls = timing?.tlsHandshakeMs ?? 0;
  const ttfb = timing?.serverTimeMs ?? 0;
  const download = timing?.downloadTimeMs ?? 0;
  const total = totalTimeMs || timing?.totalDurationMs || (dns + tcp + tls + ttfb + download) || 0;
  const isReused = timing?.connReused ?? true;

  const maxSegment = Math.max(dns, tcp, tls, ttfb, download, total, 1);

  const getPercent = (val: number) => {
    if (total === 0 || val === 0) return 0;
    // Normalized to total or max segment for clear visualization
    return Math.min(100, Math.max(6, Math.round((val / total) * 100)));
  };

  const rows = [
    { label: 'DNS Lookup', value: dns, percent: getPercent(dns) },
    { label: 'TCP Connect', value: tcp, percent: getPercent(tcp) },
    { label: 'TLS Handshake', value: tls, percent: getPercent(tls) },
    { label: 'Server TTFB', value: ttfb, percent: getPercent(ttfb) },
    { label: 'Content Download', value: download, percent: getPercent(download) },
  ];

  return (
    <Box
      sx={{
        width: 250,
        minWidth: 230,
        maxWidth: 290,
        bgcolor: '#0c0f17',
        borderLeft: 1,
        borderColor: '#1c2230',
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 2.25,
        userSelect: 'none',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: '#64748b',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        NETWORK TIMING
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
        {rows.map((row) => (
          <Box key={row.label} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                {row.label}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#f1f5f9', fontWeight: 600, fontFamily: 'monospace' }}>
                {isLoading ? '...' : `${row.value} ms`}
              </Typography>
            </Box>

            <Box
              sx={{
                width: '100%',
                height: 4,
                bgcolor: '#161c28',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: isLoading ? '30%' : `${row.percent}%`,
                  height: '100%',
                  bgcolor: '#20c997',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                  ...(isLoading && {
                    animation: 'pulse 1.5s infinite',
                  }),
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 1, pt: 2, borderTop: 1, borderColor: '#1c2230', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
            Total
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#f1f5f9', fontWeight: 700, fontFamily: 'monospace' }}>
            {isLoading ? '...' : `${total} ms`}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
            Connection
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              color: isReused ? '#20c997' : '#94a3b8',
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          >
            {isLoading ? '...' : (isReused ? 'reused' : 'new')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
