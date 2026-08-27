import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  InputBase,
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
  FilePlus,
  FolderPlus,
  Copy,
} from 'lucide-react';
import { Collection, CollectionNode, Environment, HistoryItem, RequestItem } from '../types';
import { formatDuration } from '../utils/formatters';

interface SidebarProps {
  collections: Collection[];
  activeRequestId?: string;
  onSelectRequest: (req: RequestItem) => void;
  onAddRequestToCollection: (collectionId: string, folderId?: string) => void;
  onAddFolder: (collectionId: string, parentFolderId?: string) => void;
  onDeleteNode: (collectionId: string, nodeId: string) => void;
  onRenameNode?: (collectionId: string, nodeId: string, newName: string) => void;
  onDuplicateRequest?: (collectionId: string, requestId: string) => void;
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
  activeNavTab?: 'collections' | 'envs' | 'history';
  onNavTabChange?: (tab: 'collections' | 'envs' | 'history') => void;
  width?: number;
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#10b981',
  POST: '#f59e0b',
  PUT: '#3b82f6',
  PATCH: '#a855f7',
  DELETE: '#ef4444',
  OPTIONS: '#06b6d4',
  HEAD: '#64748b',
};

export const Sidebar: React.FC<SidebarProps> = ({
  collections,
  activeRequestId,
  onSelectRequest,
  onAddRequestToCollection,
  onAddFolder,
  onDeleteNode,
  onRenameNode,
  onDuplicateRequest,
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
  activeNavTab = 'collections',
  onNavTabChange,
  width = 240,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [selectedEnvForEdit, setSelectedEnvForEdit] = useState<string | null>(
    environments[0]?.id || null
  );

  const activeEnv = environments.find((e) => e.id === activeEnvId);

  // New Collection Dialog State
  const [newCollectionDialogOpen, setNewCollectionDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Inline editing state for collections, folders, and requests
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editCollectionName, setEditCollectionName] = useState('');

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeCollectionId, setEditingNodeCollectionId] = useState<string | null>(null);
  const [editNodeName, setEditNodeName] = useState('');

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderId]: prev[folderId] === undefined ? false : !prev[folderId],
    }));
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

  const startRenameNode = (collectionId: string, node: CollectionNode) => {
    setEditingNodeCollectionId(collectionId);
    setEditingNodeId(node.id);
    setEditNodeName(node.name);
  };

  const saveRenameNode = (collectionId: string, nodeId: string) => {
    const trimmed = editNodeName.trim();
    if (trimmed && onRenameNode) {
      onRenameNode(collectionId, nodeId, trimmed);
    }
    setEditingNodeId(null);
    setEditingNodeCollectionId(null);
  };

  const handleAddEnv = () => {
    const newEnv: Environment = {
      id: 'env_' + Math.random().toString(36).substring(2, 9),
      name: `Environment ${environments.length + 1}`,
      variables: [{ key: 'base_url', value: 'https://api.staging.internal', enabled: true }],
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
        const isEditingThisNode = editingNodeId === node.id && editingNodeCollectionId === collectionId;

        if (isFolder) {
          return (
            <Box key={node.id} sx={{ pl: depth * 1.5 }}>
              <Box
                onClick={() => !isEditingThisNode && toggleFolder(node.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1,
                  py: 0.5,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  '&:hover .folder-actions': { opacity: 1 },
                }}
              >
                {isEditingThisNode ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }} onClick={(e) => e.stopPropagation()}>
                    <InputBase
                      autoFocus
                      value={editNodeName}
                      onChange={(e) => setEditNodeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRenameNode(collectionId, node.id);
                        if (e.key === 'Escape') setEditingNodeId(null);
                      }}
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        bgcolor: '#11141c',
                        px: 0.75,
                        py: 0.2,
                        borderRadius: 0.5,
                        border: 1,
                        borderColor: '#20c997',
                        flex: 1,
                        color: '#f1f5f9',
                      }}
                    />
                    <IconButton size="small" onClick={() => saveRenameNode(collectionId, node.id)} sx={{ p: 0.25 }}>
                      <Check size={12} color="#10b981" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setEditingNodeId(null)} sx={{ p: 0.25 }}>
                      <X size={12} color="#ef4444" />
                    </IconButton>
                  </Box>
                ) : (
                  <Box
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startRenameNode(collectionId, node);
                    }}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}
                  >
                    <ChevronRight
                      size={13}
                      style={{
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.15s ease',
                        color: '#64748b',
                        flexShrink: 0,
                      }}
                    />
                    <Folder size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#cbd5e1',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {node.name}
                    </Typography>
                  </Box>
                )}

                <Box className="folder-actions" sx={{ opacity: 0, display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Tooltip title="Add Request">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddRequestToCollection(collectionId, node.id);
                      }}
                      sx={{ p: 0.25, color: '#64748b', '&:hover': { color: '#20c997' } }}
                    >
                      <FilePlus size={12} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Add Subfolder">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddFolder(collectionId, node.id);
                      }}
                      sx={{ p: 0.25, color: '#64748b', '&:hover': { color: '#20c997' } }}
                    >
                      <FolderPlus size={12} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Rename Folder">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRenameNode(collectionId, node);
                      }}
                      sx={{ p: 0.25, color: '#64748b', '&:hover': { color: '#f1f5f9' } }}
                    >
                      <Edit2 size={12} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Folder">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNode(collectionId, node.id);
                      }}
                      sx={{ p: 0.25, color: '#64748b', '&:hover': { color: '#ef4444' } }}
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
                  <Typography variant="caption" sx={{ pl: (depth + 1) * 1.5 + 2, py: 0.25, color: '#475569', display: 'block', fontSize: 11 }}>
                    Empty
                  </Typography>
                )}
              </Collapse>
            </Box>
          );
        }

        const req = node.request;
        const color = METHOD_COLORS[req?.method || 'GET'] || '#10b981';
        const isActive = activeRequestId ? (activeRequestId === req?.id || activeRequestId === node.id) : false;

        return (
          <Box
            key={node.id}
            onClick={() => !isEditingThisNode && req && onSelectRequest(req)}
            sx={{
              pl: depth * 1.5 + 0.5,
              pr: 1,
              py: 0.5,
              my: 0.2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '6px',
              cursor: 'pointer',
              bgcolor: isActive ? '#181e29' : 'transparent',
              border: isActive ? '1px solid #232b3a' : '1px solid transparent',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: isActive ? '#181e29' : 'rgba(255,255,255,0.04)',
              },
              '&:hover .req-actions': { opacity: 1 },
            }}
          >
            {isEditingThisNode ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }} onClick={(e) => e.stopPropagation()}>
                <InputBase
                  autoFocus
                  value={editNodeName}
                  onChange={(e) => setEditNodeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRenameNode(collectionId, node.id);
                    if (e.key === 'Escape') setEditingNodeId(null);
                  }}
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    bgcolor: '#11141c',
                    px: 0.75,
                    py: 0.2,
                    borderRadius: 0.5,
                    border: 1,
                    borderColor: '#20c997',
                    flex: 1,
                    color: '#f1f5f9',
                  }}
                />
                <IconButton size="small" onClick={() => saveRenameNode(collectionId, node.id)} sx={{ p: 0.25 }}>
                  <Check size={12} color="#10b981" />
                </IconButton>
                <IconButton size="small" onClick={() => setEditingNodeId(null)} sx={{ p: 0.25 }}>
                  <X size={12} color="#ef4444" />
                </IconButton>
              </Box>
            ) : (
              <Box
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startRenameNode(collectionId, node);
                }}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}
              >
                {req && (
                  <Typography
                    sx={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      color: color,
                      minWidth: 44,
                    }}
                  >
                    {req.method}
                  </Typography>
                )}
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {node.name}
                </Typography>
              </Box>
            )}

            <Box className="req-actions" sx={{ opacity: 0, display: 'flex', alignItems: 'center', gap: 0.25 }}>
              {onDuplicateRequest && (
                <Tooltip title="Duplicate Request">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateRequest(collectionId, node.id);
                    }}
                    sx={{ p: 0.25, color: '#64748b', '&:hover': { color: '#20c997' } }}
                  >
                    <Copy size={12} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Rename Request">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRenameNode(collectionId, node);
                  }}
                  sx={{ p: 0.25, color: '#64748b', '&:hover': { color: '#f1f5f9' } }}
                >
                  <Edit2 size={12} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Request">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(collectionId, node.id);
                  }}
                  sx={{ p: 0.25, color: '#64748b', '&:hover': { color: '#ef4444' } }}
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
        minWidth: 200,
        maxWidth: 400,
        bgcolor: '#0c0f17',
        borderRight: 1,
        borderColor: '#1c2230',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Search Bar matching screenshot */}
      <Box sx={{ p: 1.5, pb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: '#11141c',
            border: 1,
            borderColor: '#1c2230',
            borderRadius: '8px',
            px: 1.25,
            py: 0.5,
          }}
        >
          <Search size={14} style={{ color: '#64748b', marginRight: 8 }} />
          <InputBase
            placeholder="Search requests"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              fontSize: 12,
              flex: 1,
              color: '#f1f5f9',
              '& input::placeholder': { color: '#64748b', opacity: 1 },
            }}
          />
        </Box>
      </Box>

      {/* View Selector / COLLECTIONS Header */}
      {activeNavTab === 'collections' && (
        <Box
          sx={{
            px: 1.75,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            COLLECTIONS
          </Typography>
          <Tooltip title="New Collection">
            <IconButton
              size="small"
              onClick={() => setNewCollectionDialogOpen(true)}
              sx={{ p: 0.5, color: '#64748b', '&:hover': { color: '#f1f5f9' } }}
            >
              <Plus size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {activeNavTab === 'envs' && (
        <Box
          sx={{
            px: 1.75,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            ENVIRONMENTS
          </Typography>
          <Tooltip title="New Environment">
            <IconButton
              size="small"
              onClick={handleAddEnv}
              sx={{ p: 0.5, color: '#64748b', '&:hover': { color: '#f1f5f9' } }}
            >
              <Plus size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {activeNavTab === 'history' && (
        <Box
          sx={{
            px: 1.75,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            HISTORY
          </Typography>
          {history.length > 0 && (
            <Button
              size="small"
              onClick={onClearHistory}
              sx={{ fontSize: 10, color: '#ef4444', p: 0, minWidth: 0 }}
            >
              Clear
            </Button>
          )}
        </Box>
      )}

      {/* Main List */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1, py: 0.5 }}>
        {/* COLLECTIONS VIEW */}
        {activeNavTab === 'collections' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {collections.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center', color: '#475569' }}>
                <Boxes size={24} style={{ margin: '0 auto 8px', color: '#334155' }} />
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  No collections yet
                </Typography>
                <Button
                  size="small"
                  startIcon={<Plus size={13} />}
                  onClick={() => setNewCollectionDialogOpen(true)}
                  sx={{ mt: 1, fontSize: 11, textTransform: 'none' }}
                >
                  Create Collection
                </Button>
              </Box>
            ) : (
              collections.map((col) => {
                const isOpen = openFolders[col.id] ?? true;

                return (
                  <Box key={col.id} sx={{ mb: 0.5 }}>
                    {/* Collection Header matching screenshot tree */}
                    <Box
                      onClick={() => editingCollectionId !== col.id && toggleFolder(col.id)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 0.75,
                        py: 0.5,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                        '&:hover .col-actions': { opacity: 1 },
                      }}
                    >
                      {editingCollectionId === col.id ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }} onClick={(e) => e.stopPropagation()}>
                          <InputBase
                            autoFocus
                            value={editCollectionName}
                            onChange={(e) => setEditCollectionName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRenameCollection(col.id);
                              if (e.key === 'Escape') setEditingCollectionId(null);
                            }}
                            sx={{
                              fontSize: 12,
                              fontWeight: 600,
                              bgcolor: '#11141c',
                              px: 0.75,
                              py: 0.2,
                              borderRadius: 0.5,
                              border: 1,
                              borderColor: '#20c997',
                              flex: 1,
                              color: '#f1f5f9',
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
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            startRenameCollection(col);
                          }}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}
                        >
                          <ChevronRight
                            size={13}
                            style={{
                              transform: isOpen ? 'rotate(90deg)' : 'none',
                              transition: 'transform 0.15s ease',
                              color: '#64748b',
                              flexShrink: 0,
                            }}
                          />
                          <Folder size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#e2e8f0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {col.name}
                          </Typography>
                        </Box>
                      )}

                      <Box className="col-actions" sx={{ opacity: 0, display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <Tooltip title="Add Request">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddRequestToCollection(col.id);
                            }}
                            sx={{ p: 0.25, color: '#64748b', '&:hover': { color: '#20c997' } }}
                          >
                            <FilePlus size={12} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Add Folder">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddFolder(col.id);
                            }}
                            sx={{ p: 0.25, color: '#64748b', '&:hover': { color: '#20c997' } }}
                          >
                            <FolderPlus size={12} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rename Collection">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              startRenameCollection(col);
                            }}
                            sx={{ p: 0.25, color: '#64748b', '&:hover': { color: '#f1f5f9' } }}
                          >
                            <Edit2 size={12} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Collection">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCollection(col.id);
                            }}
                            sx={{ p: 0.25, color: '#64748b', '&:hover': { color: '#ef4444' } }}
                          >
                            <Trash2 size={12} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Collection Items */}
                    <Collapse in={isOpen}>
                      <Box sx={{ pl: 0.5 }}>
                        {col.items && col.items.length > 0 ? (
                          renderNodes(col.id, col.items, 1)
                        ) : (
                          <Typography variant="caption" sx={{ pl: 3, py: 0.25, color: '#475569', display: 'block', fontSize: 11 }}>
                            Empty
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })
            )}
          </Box>
        )}

        {/* ENVIRONMENTS VIEW */}
        {activeNavTab === 'envs' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {environments.map((env) => {
              const isActive = activeEnvId === env.id;
              const isSelected = selectedEnvForEdit === env.id;

              return (
                <Box
                  key={env.id}
                  sx={{
                    bgcolor: isSelected ? '#161c28' : '#11141c',
                    border: 1,
                    borderColor: isSelected ? '#20c997' : '#1c2230',
                    borderRadius: '8px',
                    p: 1.25,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedEnvForEdit(env.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <InputBase
                      value={env.name}
                      onChange={(e) => handleEnvNameChange(env.id, e.target.value)}
                      sx={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Button
                        size="small"
                        variant={isActive ? 'contained' : 'outlined'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEnv(isActive ? null : env.id);
                        }}
                        sx={{
                          fontSize: 10,
                          py: 0.2,
                          px: 1,
                          height: 22,
                          textTransform: 'none',
                          bgcolor: isActive ? '#20c997' : 'transparent',
                          color: isActive ? '#000000' : '#20c997',
                          borderColor: '#20c997',
                          '&:hover': {
                            bgcolor: isActive ? '#1baa80' : 'rgba(32, 201, 151, 0.1)',
                          },
                        }}
                      >
                        {isActive ? 'Active' : 'Set Active'}
                      </Button>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEnv(env.id);
                        }}
                        sx={{ p: 0.25, color: '#64748b', '&:hover': { color: '#ef4444' } }}
                      >
                        <Trash2 size={12} />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Variables for selected environment */}
                  {isSelected && (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                        <Typography sx={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                          Variables
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<Plus size={10} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddVariable(env.id);
                          }}
                          sx={{ fontSize: 10, py: 0, px: 0.75, minWidth: 0, textTransform: 'none', color: '#20c997' }}
                        >
                          Add Var
                        </Button>
                      </Box>
                      {env.variables.map((v, vIdx) => (
                        <Box key={vIdx} sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
                          <InputBase
                            placeholder="Key (e.g. token)"
                            value={v.key}
                            onChange={(e) => handleUpdateVariable(env.id, vIdx, 'key', e.target.value)}
                            sx={{
                              fontSize: 11,
                              fontFamily: 'monospace',
                              bgcolor: '#0c0f17',
                              px: 0.75,
                              py: 0.2,
                              borderRadius: 0.5,
                              border: 1,
                              borderColor: '#1c2230',
                              flex: 1,
                              color: '#cbd5e1',
                            }}
                          />
                          <InputBase
                            placeholder="Value"
                            value={v.value}
                            onChange={(e) => handleUpdateVariable(env.id, vIdx, 'value', e.target.value)}
                            sx={{
                              fontSize: 11,
                              fontFamily: 'monospace',
                              bgcolor: '#0c0f17',
                              px: 0.75,
                              py: 0.2,
                              borderRadius: 0.5,
                              border: 1,
                              borderColor: '#1c2230',
                              flex: 1,
                              color: '#cbd5e1',
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVariable(env.id, vIdx);
                            }}
                            sx={{ p: 0.25, color: '#64748b' }}
                          >
                            <Trash2 size={11} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {/* HISTORY VIEW */}
        {activeNavTab === 'history' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {history.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center', color: '#475569' }}>
                <Clock size={24} style={{ margin: '0 auto 8px', color: '#334155' }} />
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  No request history yet
                </Typography>
              </Box>
            ) : (
              history.map((item) => {
                const methodColor = METHOD_COLORS[item.request.method] || '#10b981';
                const isSuccess = item.response && item.response.statusCode >= 200 && item.response.statusCode < 300;

                return (
                  <Box
                    key={item.id}
                    onClick={() => onSelectHistoryItem(item)}
                    sx={{
                      p: 1,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      bgcolor: '#11141c',
                      border: 1,
                      borderColor: '#1c2230',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: '#161c28', borderColor: '#2e384d' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: methodColor }}>
                          {item.request.method}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: isSuccess ? '#10b981' : '#ef4444', fontWeight: 600, fontFamily: 'monospace' }}>
                          {item.response ? `${item.response.statusCode} ${item.response.statusText}` : 'Error'}
                        </Typography>
                      </Box>
                      {item.response && (
                        <Typography sx={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
                          {formatDuration(item.response.timeMs)}
                        </Typography>
                      )}
                    </Box>
                    <Typography sx={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.request.url}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Box>
        )}
      </Box>

      {/* Pinned Bottom Navigation */}
      <Box sx={{ p: 1, borderTop: 1, borderColor: '#1c2230', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box
          onClick={() => onNavTabChange && onNavTabChange('collections')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.25,
            py: 0.75,
            borderRadius: '6px',
            cursor: 'pointer',
            bgcolor: activeNavTab === 'collections' ? '#181e29' : 'transparent',
            color: activeNavTab === 'collections' ? '#ffffff' : '#94a3b8',
            '&:hover': { bgcolor: '#161924', color: '#f8fafc' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Boxes size={14} color={activeNavTab === 'collections' ? '#20c997' : '#64748b'} />
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Collections</Typography>
          </Box>
          <Typography sx={{ fontSize: 11, color: '#64748b' }}>{collections.length}</Typography>
        </Box>

        <Box
          onClick={() => onNavTabChange && onNavTabChange('envs')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.25,
            py: 0.75,
            borderRadius: '6px',
            cursor: 'pointer',
            bgcolor: activeNavTab === 'envs' ? '#181e29' : 'transparent',
            color: activeNavTab === 'envs' ? '#ffffff' : '#94a3b8',
            '&:hover': { bgcolor: '#161924', color: '#f8fafc' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings size={14} color={activeNavTab === 'envs' ? '#20c997' : '#64748b'} />
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Environments</Typography>
          </Box>
          {activeEnv && (
            <Typography sx={{ fontSize: 10, color: '#20c997', bgcolor: 'rgba(32, 201, 151, 0.1)', px: 0.75, py: 0.1, borderRadius: 1 }}>
              {activeEnv.name}
            </Typography>
          )}
        </Box>

        <Box
          onClick={() => onNavTabChange && onNavTabChange('history')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.25,
            py: 0.75,
            borderRadius: '6px',
            cursor: 'pointer',
            bgcolor: activeNavTab === 'history' ? '#181e29' : 'transparent',
            color: activeNavTab === 'history' ? '#ffffff' : '#94a3b8',
            '&:hover': { bgcolor: '#161924', color: '#f8fafc' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock size={14} color={activeNavTab === 'history' ? '#20c997' : '#64748b'} />
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>History</Typography>
          </Box>
          <Typography sx={{ fontSize: 11, color: '#64748b' }}>{history.length}</Typography>
        </Box>
      </Box>

      {/* New Collection Modal */}
      <Dialog
        open={newCollectionDialogOpen}
        onClose={() => setNewCollectionDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { bgcolor: '#11141c', border: 1, borderColor: '#1c2230', borderRadius: 2 },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700, pb: 1, color: '#f8fafc' }}>
          Create New Collection
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Collection Name (e.g. Payments API)"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCollectionSubmit()}
            sx={{
              mt: 1,
              bgcolor: '#0c0f17',
              borderRadius: 1,
              '& .MuiInputBase-input': { fontSize: 13, color: '#f8fafc' },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setNewCollectionDialogOpen(false)} sx={{ color: '#94a3b8' }}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleCreateCollectionSubmit} sx={{ bgcolor: '#20c997', color: '#000000', fontWeight: 600 }}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
