import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
  FolderOpen,
  CheckCircle2,
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
        height: 36,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.5,
        userSelect: 'none',
        zIndex: 100,
      }}
    >
      {/* Left: Brand & Menu Items */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <img src={logoImg} alt="Mels Logo" style={{ width: 18, height: 18, borderRadius: 4 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: -0.2, fontSize: 13, color: '#f8fafc' }}>
            Mels
          </Typography>
        </Box>

        {/* Quick Top Bar Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button
            size="small"
            startIcon={<Upload size={12} />}
            onClick={onImport}
            sx={{
              fontSize: 11,
              color: 'text.secondary',
              py: 0.2,
              px: 1,
              height: 24,
              '&:hover': { color: 'text.primary', bgcolor: '#161924' },
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
              color: 'text.secondary',
              py: 0.2,
              px: 1,
              height: 24,
              '&:hover': { color: 'text.primary', bgcolor: '#161924' },
            }}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Right: Settings Menu */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="Settings & Management">
          <IconButton size="small" onClick={handleOpenSettings} sx={{ width: 28, height: 28 }}>
            <Settings size={14} />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={settingsAnchorEl}
          open={isSettingsOpen}
          onClose={handleCloseSettings}
          slotProps={{
            paper: {
              sx: {
                bgcolor: '#131620',
                border: 1,
                borderColor: 'divider',
                minWidth: 200,
                borderRadius: 1.5,
                mt: 0.5,
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
            <ListItemIcon>
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
            <ListItemIcon>
              <Download size={14} />
            </ListItemIcon>
            <Typography variant="body2" sx={{ fontSize: 12 }}>Export Collection</Typography>
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          {onClearAllStorage && (
            <MenuItem
              onClick={() => {
                handleCloseSettings();
                onClearAllStorage();
              }}
              sx={{ fontSize: 12, py: 1, color: 'error.light' }}
            >
              <ListItemIcon sx={{ color: 'error.light' }}>
                <Trash2 size={14} />
              </ListItemIcon>
              <Typography variant="body2" sx={{ fontSize: 12, color: 'error.light' }}>Clear All Data</Typography>
            </MenuItem>
          )}

          <Divider sx={{ my: 0.5 }} />

          <MenuItem
            onClick={() => {
              handleCloseSettings();
              setAboutDialogOpen(true);
            }}
            sx={{ fontSize: 12, py: 1 }}
          >
            <ListItemIcon>
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
            sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700, pb: 1 }}>
          About Mels API Client
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
            <strong>Mels</strong> is a fast, local-first API client built for complete data ownership and privacy. All your requests, collections, and tokens stay securely on your machine.
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
            Version 1.0.0 &bull; Local Storage &bull; Zero Telemetry
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" variant="contained" onClick={() => setAboutDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
