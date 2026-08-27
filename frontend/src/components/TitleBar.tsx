import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Settings,
  Upload,
  Download,
  Trash2,
  Info,
} from 'lucide-react';
import logoImg from '../assets/logo.png';

interface TitleBarProps {
  onExport: () => void;
  onImport: () => void;
  onClearAllStorage?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  onExport,
  onImport,
  onClearAllStorage,
}) => {
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const isSettingsOpen = Boolean(settingsAnchorEl);

  const handleOpenSettings = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleCloseSettings = () => {
    setSettingsAnchorEl(null);
  };

  return (
    <Box
      sx={{
        height: 38,
        bgcolor: '#0c0f17',
        borderBottom: 1,
        borderColor: '#1c2230',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.5,
        userSelect: 'none',
        zIndex: 100,
      }}
    >
      {/* Left: Brand & Quick Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <img src={logoImg} alt="Mels Logo" style={{ width: 18, height: 18, borderRadius: 4 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: -0.2, fontSize: 13, color: '#f8fafc' }}>
            Mels
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button
            size="small"
            startIcon={<Upload size={12} />}
            onClick={onImport}
            sx={{
              fontSize: 11,
              color: '#94a3b8',
              py: 0.2,
              px: 1,
              height: 24,
              textTransform: 'none',
              borderRadius: '6px',
              '&:hover': { color: '#f1f5f9', bgcolor: '#161924' },
            }}
          >
            Import
          </Button>

          <Button
            size="small"
            startIcon={<Download size={12} />}
            onClick={onExport}
            sx={{
              fontSize: 11,
              color: '#94a3b8',
              py: 0.2,
              px: 1,
              height: 24,
              textTransform: 'none',
              borderRadius: '6px',
              '&:hover': { color: '#f1f5f9', bgcolor: '#161924' },
            }}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Right: Settings gear menu */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="Settings & Management">
          <IconButton
            size="small"
            onClick={handleOpenSettings}
            sx={{
              width: 28,
              height: 28,
              color: '#64748b',
              '&:hover': { color: '#f1f5f9', bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            <Settings size={15} />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={settingsAnchorEl}
          open={isSettingsOpen}
          onClose={handleCloseSettings}
          slotProps={{
            paper: {
              sx: {
                bgcolor: '#11141c',
                border: 1,
                borderColor: '#1c2230',
                minWidth: 200,
                borderRadius: 1.5,
                mt: 0.5,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem
            onClick={() => {
              handleCloseSettings();
              onImport();
            }}
            sx={{ fontSize: 12, py: 1 }}
          >
            <ListItemIcon sx={{ color: '#94a3b8' }}>
              <Upload size={14} />
            </ListItemIcon>
            <Typography variant="body2" sx={{ fontSize: 12 }}>Import Collection</Typography>
          </MenuItem>

          <MenuItem
            onClick={() => {
              handleCloseSettings();
              onExport();
            }}
            sx={{ fontSize: 12, py: 1 }}
          >
            <ListItemIcon sx={{ color: '#94a3b8' }}>
              <Download size={14} />
            </ListItemIcon>
            <Typography variant="body2" sx={{ fontSize: 12 }}>Export Collection</Typography>
          </MenuItem>

          <Divider sx={{ my: 0.5, borderColor: '#1c2230' }} />

          {onClearAllStorage && (
            <MenuItem
              onClick={() => {
                handleCloseSettings();
                onClearAllStorage();
              }}
              sx={{ fontSize: 12, py: 1, color: '#ef4444' }}
            >
              <ListItemIcon sx={{ color: '#ef4444' }}>
                <Trash2 size={14} />
              </ListItemIcon>
              <Typography variant="body2" sx={{ fontSize: 12, color: '#ef4444' }}>Clear All Data</Typography>
            </MenuItem>
          )}

          <Divider sx={{ my: 0.5, borderColor: '#1c2230' }} />

          <MenuItem
            onClick={() => {
              handleCloseSettings();
              setAboutDialogOpen(true);
            }}
            sx={{ fontSize: 12, py: 1 }}
          >
            <ListItemIcon sx={{ color: '#94a3b8' }}>
              <Info size={14} />
            </ListItemIcon>
            <Typography variant="body2" sx={{ fontSize: 12 }}>About Mels</Typography>
          </MenuItem>
        </Menu>
      </Box>

      {/* About Dialog */}
      <Dialog
        open={aboutDialogOpen}
        onClose={() => setAboutDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { bgcolor: '#11141c', border: 1, borderColor: '#1c2230', borderRadius: 2 },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700, pb: 1, color: '#f8fafc' }}>
          About Mels API Client
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontSize: 12, color: '#94a3b8', mb: 1 }}>
            <strong>Mels</strong> is a fast, local-first API client built for complete data ownership and privacy. All your requests, collections, and tokens stay securely on your machine.
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
            Version 1.2.0 &bull; Local Storage &bull; Zero Telemetry
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" variant="contained" onClick={() => setAboutDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
