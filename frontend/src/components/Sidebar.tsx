import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Chip,
  Tooltip,
  Collapse,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Folder,
  FolderPlus,
  FilePlus,
  ChevronRight,
  Trash2,
  Clock,
  Settings,
  Boxes,
  Search,
  Plus,
  Edit2,
  Check,
  X,
  PlusCircle,
} from 'lucide-react';
import { Collection, CollectionNode, Environment, HistoryItem, RequestItem } from '../types';
import { formatDuration } from '../utils/formatters';

interface SidebarProps {
  collections: Collection[];
  onSelectRequest: (req: RequestItem) => void;
  onAddRequestToCollection: (collectionId: string, folderId?: string) => void;
  onAddFolder: (collectionId: string, parentFolderId?: string) => void;
  onDeleteNode: (collectionId: string, nodeId: string) => void;
  onAddCollection: (name: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onRenameCollection: (collectionId: string, newName: string) => void;
  environments: Environment[];
  onUpdateEnvironments: (envs: Environment[]) => void;
  activeEnvId: string | null;
  onSelectEnv: (id: string | null) => void;
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  activeNavTab: 'collections' | 'envs' | 'history';
  width?: number;
}

const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  GET: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  POST: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  PUT: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  PATCH: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
  DELETE: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  OPTIONS: { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' },
  HEAD: { bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b' },
};

export const Sidebar: React.FC<SidebarProps> = ({
  collections,
  onSelectRequest,
  onAddRequestToCollection,
  onAddFolder,
  onDeleteNode,
  onAddCollection,
  onDeleteCollection,
  onRenameCollection,
  environments,
  onUpdateEnvironments,
  activeEnvId,
  onSelectEnv,
  history,
  onSelectHistoryItem,
  onClearHistory,
  activeNavTab,
  width = 260,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [selectedEnvForEdit, setSelectedEnvForEdit] = useState<string | null>(
    environments[0]?.id || null
  );

  // New Collection Dialog State (replaces alerts/prompts)
  const [newCollectionDialogOpen, setNewCollectionDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Editing Collection Name inline
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editCollectionName, setEditCollectionName] = useState('');

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCreateCollectionSubmit = () => {
    const trimmed = newCollectionName.trim();
    if (trimmed) {
      onAddCollection(trimmed);
    } else {
      onAddCollection('New Collection');
    }
    setNewCollectionName('');
    setNewCollectionDialogOpen(false);
  };

  const startRenameCollection = (col: Collection) => {
    setEditingCollectionId(col.id);
    setEditCollectionName(col.name);
  };

  const saveRenameCollection = (collectionId: string) => {
    const trimmed = editCollectionName.trim();
    if (trimmed) {
      onRenameCollection(collectionId, trimmed);
    }
    setEditingCollectionId(null);
  };

  const handleAddEnv = () => {
    const newEnv: Environment = {
      id: 'env_' + Math.random().toString(36).substring(2, 9),
      name: `Environment ${environments.length + 1}`,
      variables: [{ key: 'baseUrl', value: 'https://httpbin.org', enabled: true }],
    };
    onUpdateEnvironments([...environments, newEnv]);
    setSelectedEnvForEdit(newEnv.id);
  };

  const handleDeleteEnv = (id: string) => {
    const next = environments.filter((e) => e.id !== id);
    onUpdateEnvironments(next);
    if (activeEnvId === id) onSelectEnv(null);
    if (selectedEnvForEdit === id) setSelectedEnvForEdit(next[0]?.id || null);
  };

  const handleEnvNameChange = (id: string, name: string) => {
    onUpdateEnvironments(
      environments.map((e) => (e.id === id ? { ...e, name } : e))
    );
  };

  const handleAddVariable = (envId: string) => {
    onUpdateEnvironments(
      environments.map((e) => {
        if (e.id === envId) {
          return {
            ...e,
            variables: [...e.variables, { key: '', value: '', enabled: true }],
          };
        }
        return e;
      })
    );
  };

  const handleUpdateVariable = (
    envId: string,
    index: number,
    field: 'key' | 'value' | 'enabled',
    val: any
  ) => {
    onUpdateEnvironments(
      environments.map((e) => {
        if (e.id === envId) {
          const nextVars = [...e.variables];
          nextVars[index] = { ...nextVars[index], [field]: val };
          return { ...e, variables: nextVars };
        }
        return e;
      })
    );
  };

  const handleDeleteVariable = (envId: string, index: number) => {
    onUpdateEnvironments(
      environments.map((e) => {
        if (e.id === envId) {
          return {
            ...e,
            variables: e.variables.filter((_, i) => i !== index),
          };
        }
        return e;
      })
    );
  };

  const renderNodes = (
    collectionId: string,
    nodes: CollectionNode[],
    depth: number = 0
  ) => {
    return nodes
      .filter((node) => {
        if (!searchQuery) return true;
        return node.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .map((node) => {
        const isFolder = node.type === 'folder';
        const isOpen = openFolders[node.id] ?? true;

        if (isFolder) {
          return (
            <Box key={node.id} sx={{ pl: depth * 1.5 }}>
              <Box
                onClick={() => toggleFolder(node.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1,
                  py: 0.6,
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#161924' },
                  '&:hover .folder-actions': { opacity: 1 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                  <ChevronRight
                    size={13}
                    style={{
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.15s ease',
                      color: '#64748b',
                    }}
                  />
                  <Folder size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.name}
                  </Typography>
                </Box>

                <Box className="folder-actions" sx={{ opacity: 0, display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Tooltip title="New Request in Folder">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddRequestToCollection(collectionId, node.id);
                      }}
                    >
                      <FilePlus size={12} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Folder">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNode(collectionId, node.id);
                      }}
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Collapse in={isOpen}>
                {node.children && node.children.length > 0 ? (
                  renderNodes(collectionId, node.children, depth + 1)
                ) : (
                  <Typography variant="caption" sx={{ pl: (depth + 1) * 1.5 + 2, py: 0.5, color: 'text.disabled', display: 'block', fontSize: 11 }}>
                    Empty Folder
                  </Typography>
                )}
              </Collapse>
            </Box>
          );
        }

        const req = node.request;
        const methodStyle = METHOD_COLORS[req?.method || 'GET'] || METHOD_COLORS.GET;

        return (
          <Box
            key={node.id}
            onClick={() => req && onSelectRequest(req)}
            sx={{
              pl: depth * 1.5 + 1,
              pr: 1,
              py: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 1,
              cursor: 'pointer',
              '&:hover': { bgcolor: '#161924' },
              '&:hover .req-actions': { opacity: 1 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              {req && (
                <Chip
                  label={req.method}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    bgcolor: methodStyle.bg,
                    color: methodStyle.color,
                    borderRadius: 0.75,
                  }}
                />
              )}
              <Typography variant="body2" sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.name}
              </Typography>
            </Box>
            <Box className="req-actions" sx={{ opacity: 0 }}>
              <Tooltip title="Delete Request">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(collectionId, node.id);
                  }}
                >
                  <Trash2 size={12} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        );
      });
  };

  return (
    <Box
      sx={{
        width: width,
        minWidth: 180,
        maxWidth: 500,
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
      }}
    >
      {/* Search Bar */}
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: '#11131c',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            px: 1,
            py: 0.3,
          }}
        >
          <Search size={13} style={{ color: '#64748b', marginRight: 6 }} />
          <InputBase
            placeholder={
              activeNavTab === 'collections'
                ? 'Filter requests...'
                : activeNavTab === 'envs'
                ? 'Filter environments...'
                : 'Filter history...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ fontSize: 12, flex: 1 }}
          />
        </Box>
      </Box>

      {/* Main List */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {/* COLLECTIONS VIEW */}
        {activeNavTab === 'collections' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Postman-like + New Collection Button */}
            <Button
              variant="outlined"
              size="small"
              fullWidth
              startIcon={<Plus size={14} />}
              onClick={() => setNewCollectionDialogOpen(true)}
              sx={{
                justifyContent: 'flex-start',
                py: 0.75,
                borderColor: 'divider',
                color: 'text.primary',
                bgcolor: '#11131c',
                '&:hover': { bgcolor: '#161924', borderColor: 'primary.main' },
              }}
            >
              New Collection
            </Button>

            {collections.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
                <Boxes size={28} style={{ margin: '0 auto 8px', color: '#2b3040' }} />
                <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
                  No Collections
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                  Click <strong>New Collection</strong> above to organize your requests.
                </Typography>
              </Box>
            ) : (
              collections.map((col) => (
                <Box
                  key={col.id}
                  sx={{
                    bgcolor: '#10121a',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  {/* Collection Header */}
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: '#131620',
                      '&:hover .col-actions': { opacity: 1 },
                    }}
                  >
                    {editingCollectionId === col.id ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, mr: 1 }}>
                        <InputBase
                          autoFocus
                          value={editCollectionName}
                          onChange={(e) => setEditCollectionName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRenameCollection(col.id);
                            if (e.key === 'Escape') setEditingCollectionId(null);
                          }}
                          sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            bgcolor: '#0a0c10',
                            px: 0.75,
                            py: 0.2,
                            borderRadius: 0.5,
                            border: 1,
                            borderColor: 'primary.main',
                            flex: 1,
                          }}
                        />
                        <IconButton size="small" onClick={() => saveRenameCollection(col.id)}>
                          <Check size={12} color="#10b981" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setEditingCollectionId(null)}>
                          <X size={12} color="#ef4444" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box
                        onDoubleClick={() => startRenameCollection(col)}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0, cursor: 'pointer' }}
                      >
                        <Boxes size={13} style={{ color: '#818cf8', flexShrink: 0 }} />
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {col.name}
                        </Typography>
                      </Box>
                    )}

                    <Box className="col-actions" sx={{ display: 'flex', alignItems: 'center', gap: 0.25, opacity: 0.7 }}>
                      <Tooltip title="Add Request">
                        <IconButton
                          size="small"
                          onClick={() => onAddRequestToCollection(col.id)}
                        >
                          <FilePlus size={13} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Add Folder">
                        <IconButton
                          size="small"
                          onClick={() => onAddFolder(col.id)}
                        >
                          <FolderPlus size={13} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Rename Collection">
                        <IconButton
                          size="small"
                          onClick={() => startRenameCollection(col)}
                        >
                          <Edit2 size={12} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Collection">
                        <IconButton
                          size="small"
                          onClick={() => onDeleteCollection(col.id)}
                          sx={{ '&:hover': { color: 'error.main' } }}
                        >
                          <Trash2 size={13} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Collection Items */}
                  <Box sx={{ p: 0.5 }}>
                    {col.items && col.items.length > 0 ? (
                      renderNodes(col.id, col.items)
                    ) : (
                      <Box sx={{ p: 1.5, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 11 }}>
                          No requests in this collection
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              ))
            )}
          </Box>
        )}

        {/* ENVIRONMENTS VIEW */}
        {activeNavTab === 'envs' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              startIcon={<Plus size={14} />}
              onClick={handleAddEnv}
              sx={{
                justifyContent: 'flex-start',
                py: 0.75,
                borderColor: 'divider',
                color: 'text.primary',
                bgcolor: '#11131c',
                '&:hover': { bgcolor: '#161924', borderColor: 'primary.main' },
              }}
            >
              New Environment
            </Button>

            {environments.map((env) => {
              const isActive = activeEnvId === env.id;
              const isSelected = selectedEnvForEdit === env.id;

              return (
                <Box
                  key={env.id}
                  sx={{
                    bgcolor: isSelected ? '#161924' : '#10121a',
                    border: 1,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    p: 1.25,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedEnvForEdit(env.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <InputBase
                      value={env.name}
                      onChange={(e) => handleEnvNameChange(env.id, e.target.value)}
                      sx={{ fontSize: 12, fontWeight: 700 }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Button
                        size="small"
                        variant={isActive ? 'contained' : 'outlined'}
                        color={isActive ? 'success' : 'inherit'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEnv(isActive ? null : env.id);
                        }}
                        sx={{ fontSize: 10, py: 0.2, px: 1, minWidth: 0, height: 22 }}
                      >
                        {isActive ? 'Active' : 'Activate'}
                      </Button>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEnv(env.id);
                        }}
                      >
                        <Trash2 size={12} />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Variables */}
                  <Collapse in={isSelected}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          Variables ({env.variables?.length || 0})
                        </Typography>
                        <IconButton size="small" onClick={() => handleAddVariable(env.id)}>
                          <Plus size={12} />
                        </IconButton>
                      </Box>

                      {(env.variables || []).map((v, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <InputBase
                            placeholder="Key"
                            value={v.key}
                            onChange={(e) => handleUpdateVariable(env.id, idx, 'key', e.target.value)}
                            sx={{
                              fontSize: 11,
                              fontFamily: 'monospace',
                              bgcolor: '#0c0e14',
                              px: 0.75,
                              borderRadius: 0.5,
                              border: 1,
                              borderColor: 'divider',
                              flex: 1,
                            }}
                          />
                          <InputBase
                            placeholder="Value"
                            value={v.value}
                            onChange={(e) => handleUpdateVariable(env.id, idx, 'value', e.target.value)}
                            sx={{
                              fontSize: 11,
                              fontFamily: 'monospace',
                              bgcolor: '#0c0e14',
                              px: 0.75,
                              borderRadius: 0.5,
                              border: 1,
                              borderColor: 'divider',
                              flex: 1,
                            }}
                          />
                          <IconButton size="small" onClick={() => handleDeleteVariable(env.id, idx)}>
                            <Trash2 size={11} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        )}

        {/* HISTORY VIEW */}
        {activeNavTab === 'history' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Recent Requests
              </Typography>
              {history.length > 0 && (
                <Button size="small" color="error" onClick={onClearHistory} sx={{ fontSize: 11, py: 0 }}>
                  Clear History
                </Button>
              )}
            </Box>

            {history.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
                <Clock size={28} style={{ margin: '0 auto 8px', color: '#2b3040' }} />
                <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                  No Request History
                </Typography>
              </Box>
            ) : (
              history.map((item) => {
                const methodStyle = METHOD_COLORS[item.request.method] || METHOD_COLORS.GET;

                return (
                  <Box
                    key={item.id}
                    onClick={() => onSelectHistoryItem(item)}
                    sx={{
                      p: 1,
                      bgcolor: '#10121a',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#161924', borderColor: 'primary.main' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Chip
                        label={item.request.method}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: 9,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          bgcolor: methodStyle.bg,
                          color: methodStyle.color,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
                        {item.response ? formatDuration(item.response.timeMs) : ''}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.request.url || 'Empty URL'}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Box>
        )}
      </Box>

      {/* Clean Postman-like New Collection Dialog (NO browser prompts or alerts) */}
      <Dialog
        open={newCollectionDialogOpen}
        onClose={() => setNewCollectionDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700, pb: 1 }}>
          Create New Collection
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
            Enter a name for your collection:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="e.g. Authentication APIs"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateCollectionSubmit();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setNewCollectionDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleCreateCollectionSubmit}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
