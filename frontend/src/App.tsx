import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider, CssBaseline, Box, Chip, IconButton, Tooltip } from '@mui/material';
import { melsTheme } from './theme';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { RequestEditor } from './components/RequestEditor';
import { ResponseViewer } from './components/ResponseViewer';
import { StatusBar } from './components/StatusBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  Collection,
  Environment,
  HistoryItem,
  RequestItem,
  ResponseData,
  TabItem,
  createDefaultRequest,
} from './types';
import { buildVariableMap, resolveRequestVariables } from './utils/interpolation';
import { SaveFileDialog, ReadFileContent } from '../wailsjs/go/main/App';
import { executeRequest, cancelRequest } from './services/requestEngine';
import { AsyncStorage } from './utils/storage';
import { Boxes, Settings, Clock, Plus, X } from 'lucide-react';

const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  GET: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  POST: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  PUT: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  PATCH: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
  DELETE: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  OPTIONS: { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' },
  HEAD: { bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b' },
};

export function App() {
  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('mels_collections');
    return saved ? JSON.parse(saved) : [];
  });

  const [environments, setEnvironments] = useState<Environment[]>(() => {
    const saved = localStorage.getItem('mels_environments');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeEnvId, setActiveEnvId] = useState<string | null>(() => {
    return localStorage.getItem('mels_active_env_id') || null;
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('mels_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activityTab, setActivityTab] = useState<'collections' | 'envs' | 'history'>('collections');

  const [tabs, setTabs] = useState<TabItem[]>(() => {
    const firstReq = createDefaultRequest('Untitled Request');
    return [
      {
        id: 'tab_1',
        title: 'Untitled Request',
        request: firstReq,
        response: null,
        isLoading: false,
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>('tab_1');

  // Initial Load from Persistent Disk Storage (AsyncStorage)
  useEffect(() => {
    (async () => {
      try {
        const savedCols = await AsyncStorage.getItem<Collection[]>('mels_collections', []);
        if (savedCols && savedCols.length > 0) setCollections(savedCols);

        const savedEnvs = await AsyncStorage.getItem<Environment[]>('mels_environments', []);
        if (savedEnvs && savedEnvs.length > 0) setEnvironments(savedEnvs);

        const savedHistory = await AsyncStorage.getItem<HistoryItem[]>('mels_history', []);
        if (savedHistory && savedHistory.length > 0) setHistory(savedHistory);

        const savedEnvId = await AsyncStorage.getItem<string | null>('mels_active_env_id', null);
        if (savedEnvId) setActiveEnvId(savedEnvId);
      } catch (e) {
        console.error('AsyncStorage load failed:', e);
      }
    })();
  }, []);

  // Save to AsyncStorage on change
  useEffect(() => {
    AsyncStorage.setItem('mels_collections', collections);
  }, [collections]);

  useEffect(() => {
    AsyncStorage.setItem('mels_environments', environments);
  }, [environments]);

  useEffect(() => {
    if (activeEnvId) {
      AsyncStorage.setItem('mels_active_env_id', activeEnvId);
    } else {
      AsyncStorage.removeItem('mels_active_env_id');
    }
  }, [activeEnvId]);

  useEffect(() => {
    AsyncStorage.setItem('mels_history', history);
  }, [history]);

  // Resizable Views State
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('mels_sidebar_width');
    return saved ? parseInt(saved, 10) : 260;
  });
  const [editorPercent, setEditorPercent] = useState<number>(() => {
    const saved = localStorage.getItem('mels_editor_percent');
    return saved ? parseFloat(saved) : 50;
  });
  const contentAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('mels_sidebar_width', sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem('mels_editor_percent', editorPercent.toString());
  }, [editorPercent]);

  // Drag handler for sidebar width
  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(180, Math.min(500, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Drag handler for editor / response split percentage
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!contentAreaRef.current) return;
    const rect = contentAreaRef.current.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const offsetX = moveEvent.clientX - rect.left;
      const percent = (offsetX / rect.width) * 100;
      const clamped = Math.max(25, Math.min(75, percent));
      setEditorPercent(clamped);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeEnvironment = environments.find((e) => e.id === activeEnvId) || null;

  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
  };

  const handleNewTab = (req?: RequestItem) => {
    const newReq = req || createDefaultRequest('New Request');
    const newTab: TabItem = {
      id: 'tab_' + Math.random().toString(36).substring(2, 9),
      title: newReq.name || 'New Request',
      request: newReq,
      response: null,
      isLoading: false,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  const handleUpdateRequest = (updatedReq: RequestItem) => {
    setTabs(
      tabs.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              title: updatedReq.name || t.title,
              request: updatedReq,
              isDirty: true,
            }
          : t
      )
    );
  };

  const handleSendRequest = async () => {
    if (!activeTab || activeTab.isLoading) return;

    setTabs(
      tabs.map((t) => (t.id === activeTabId ? { ...t, isLoading: true } : t))
    );

    try {
      const variableMap = buildVariableMap(activeEnvironment);
      const resolvedReq = resolveRequestVariables(activeTab.request, variableMap);
      resolvedReq.variables = variableMap;

      // Execute Request via Native Desktop Engine
      const responseData = await executeRequest(resolvedReq);

      if (responseData.updatedVariables && activeEnvId) {
        const updatedMap = responseData.updatedVariables;
        setEnvironments((prevEnvs) =>
          prevEnvs.map((env) => {
            if (env.id === activeEnvId) {
              const mergedMap: Record<string, string> = {};
              env.variables.forEach((v) => {
                if (v.key) mergedMap[v.key] = v.value;
              });
              Object.entries(updatedMap).forEach(([k, v]) => {
                mergedMap[k] = v;
              });
              return {
                ...env,
                variables: Object.entries(mergedMap).map(([k, v]) => ({
                  key: k,
                  value: v,
                  enabled: true,
                })),
              };
            }
            return env;
          })
        );
      }

      setTabs(
        tabs.map((t) =>
          t.id === activeTabId
            ? { ...t, isLoading: false, response: responseData }
            : t
        )
      );

      const newHistoryItem: HistoryItem = {
        id: 'hist_' + Date.now(),
        timestamp: Date.now(),
        request: JSON.parse(JSON.stringify(activeTab.request)),
        response: {
          statusCode: responseData.statusCode,
          statusText: responseData.statusText,
          timeMs: responseData.timeMs,
          size: responseData.size,
          error: responseData.error,
          testResults: responseData.testResults,
        },
      };
      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 99)]);
    } catch (err: any) {
      const errorResp: ResponseData = {
        requestId: activeTab.request.id,
        statusCode: 0,
        statusText: 'Client Error',
        proto: 'HTTP/1.1',
        headers: [],
        cookies: [],
        body: '',
        contentType: 'text/plain',
        size: 0,
        headerSize: 0,
        timeMs: 0,
        timing: {
          dnsLookupMs: 0,
          tcpConnMs: 0,
          tlsHandshakeMs: 0,
          serverTimeMs: 0,
          downloadTimeMs: 0,
          totalDurationMs: 0,
        },
        isBinary: false,
        isTruncated: false,
        error: err.message || 'Unknown network error',
        testResults: [],
        scriptLogs: [],
        redirectHistory: [],
      };

      setTabs(
        tabs.map((t) =>
          t.id === activeTabId
            ? { ...t, isLoading: false, response: errorResp }
            : t
        )
      );
    }
  };

  const handleCancelRequest = async () => {
    if (!activeTab || !activeTab.isLoading) return;
    await cancelRequest(activeTab.request.id);
    setTabs(
      tabs.map((t) => (t.id === activeTabId ? { ...t, isLoading: false } : t))
    );
  };

  const handleSelectCollectionRequest = (req: RequestItem) => {
    handleNewTab(JSON.parse(JSON.stringify(req)));
  };

  const handleAddRequestToCollection = (collectionId: string, folderId?: string) => {
    const newReq = createDefaultRequest('New Request');
    setCollections(
      collections.map((col) => {
        if (col.id !== collectionId) return col;

        if (folderId) {
          const addToFolder = (nodes: any[]): any[] =>
            nodes.map((node) => {
              if (node.id === folderId) {
                return {
                  ...node,
                  children: [
                    ...(node.children || []),
                    { id: newReq.id, name: newReq.name, type: 'request', request: newReq },
                  ],
                };
              }
              if (node.children) {
                return { ...node, children: addToFolder(node.children) };
              }
              return node;
            });
          return { ...col, items: addToFolder(col.items) };
        }

        return {
          ...col,
          items: [
            ...col.items,
            { id: newReq.id, name: newReq.name, type: 'request', request: newReq },
          ],
        };
      })
    );
    handleNewTab(newReq);
  };

  const handleAddCollection = (name: string) => {
    const newCol: Collection = {
      schemaVersion: '1.0.0',
      id: 'col_' + Math.random().toString(36).substring(2, 9),
      name: name || 'New Collection',
      items: [],
    };
    setCollections((prev) => [newCol, ...prev]);
  };

  const handleDeleteCollection = (collectionId: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
  };

  const handleRenameCollection = (collectionId: string, newName: string) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === collectionId ? { ...c, name: newName } : c))
    );
  };

  const handleAddFolder = (collectionId: string) => {
    setCollections(
      collections.map((col) => {
        if (col.id !== collectionId) return col;
        return {
          ...col,
          items: [
            ...col.items,
            {
              id: 'folder_' + Math.random().toString(36).substring(2, 9),
              name: 'New Folder',
              type: 'folder',
              children: [],
            },
          ],
        };
      })
    );
  };

  const handleDeleteNode = (collectionId: string, nodeId: string) => {
    const filterNodes = (nodes: any[]): any[] =>
      nodes
        .filter((n) => n.id !== nodeId)
        .map((n) => (n.children ? { ...n, children: filterNodes(n.children) } : n));

    setCollections(
      collections.map((col) => {
        if (col.id !== collectionId) return col;
        return { ...col, items: filterNodes(col.items) };
      })
    );
  };

  const handleExportCollection = async () => {
    try {
      const dataStr = JSON.stringify(collections, null, 2);
      await SaveFileDialog('Export Mels Collections', 'mels_collections.json', dataStr);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleImportCollection = async () => {
    try {
      const fileContent = await ReadFileContent('Import Mels Collection');
      if (!fileContent) return;
      const parsed = JSON.parse(fileContent);
      if (Array.isArray(parsed)) {
        setCollections((prev) => [...prev, ...parsed]);
      } else if (parsed && parsed.items) {
        setCollections((prev) => [...prev, parsed]);
      }
    } catch (err) {
      console.error('Import failed:', err);
    }
  };

  const handleClearAllStorage = async () => {
    try {
      await AsyncStorage.clear();
      setCollections([]);
      setEnvironments([]);
      setHistory([]);
      setActiveEnvId(null);
    } catch (e) {
      console.error('Clear storage error:', e);
    }
  };

  return (
    <ThemeProvider theme={melsTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        {/* Top Bar with Settings, Import, Export */}
        <TitleBar
          onExport={handleExportCollection}
          onImport={handleImportCollection}
          onClearAllStorage={handleClearAllStorage}
        />

        {/* Tab Bar Strip */}
        <Box
          sx={{
            height: 36,
            bgcolor: '#0a0c11',
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            px: 1,
            gap: 0.5,
            overflowX: 'auto',
          }}
        >
          {tabs.map((tab) => {
            const method = tab.request.method;
            const isActive = tab.id === activeTabId;
            const mStyle = METHOD_COLORS[method] || { bg: '#252a3a', color: '#fff' };

            return (
              <Box
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.25,
                  py: 0.4,
                  fontSize: 12,
                  bgcolor: isActive ? 'background.paper' : '#11131c',
                  border: 1,
                  borderColor: isActive ? 'primary.dark' : 'divider',
                  borderRadius: 1,
                  color: isActive ? 'text.primary' : 'text.secondary',
                  cursor: 'pointer',
                  maxWidth: 200,
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: 'background.paper', color: 'text.primary' },
                }}
              >
                <Chip
                  label={method}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    bgcolor: mStyle.bg,
                    color: mStyle.color,
                  }}
                />
                <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tab.title || tab.request.name || 'Untitled'}
                </Box>
                {tabs.length > 1 && (
                  <Box
                    component="span"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 0.6,
                      '&:hover': { opacity: 1 },
                    }}
                  >
                    <X size={12} />
                  </Box>
                )}
              </Box>
            );
          })}
          <Tooltip title="New Request Tab">
            <IconButton size="small" onClick={() => handleNewTab()}>
              <Plus size={14} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Main Workspace */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Activity Bar */}
          <Box
            sx={{
              width: 44,
              bgcolor: '#0a0c11',
              borderRight: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 1,
              gap: 1,
              zIndex: 10,
            }}
          >
            <Tooltip title="Collections" placement="right">
              <IconButton
                size="small"
                color={sidebarOpen && activityTab === 'collections' ? 'primary' : 'default'}
                onClick={() => {
                  if (sidebarOpen && activityTab === 'collections') setSidebarOpen(false);
                  else { setSidebarOpen(true); setActivityTab('collections'); }
                }}
                sx={{
                  bgcolor: sidebarOpen && activityTab === 'collections' ? 'background.paper' : 'transparent',
                }}
              >
                <Boxes size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Environments" placement="right">
              <IconButton
                size="small"
                color={sidebarOpen && activityTab === 'envs' ? 'primary' : 'default'}
                onClick={() => {
                  if (sidebarOpen && activityTab === 'envs') setSidebarOpen(false);
                  else { setSidebarOpen(true); setActivityTab('envs'); }
                }}
                sx={{
                  bgcolor: sidebarOpen && activityTab === 'envs' ? 'background.paper' : 'transparent',
                }}
              >
                <Settings size={16} />
              </IconButton>
            </Tooltip>

            <Tooltip title="History" placement="right">
              <IconButton
                size="small"
                color={sidebarOpen && activityTab === 'history' ? 'primary' : 'default'}
                onClick={() => {
                  if (sidebarOpen && activityTab === 'history') setSidebarOpen(false);
                  else { setSidebarOpen(true); setActivityTab('history'); }
                }}
                sx={{
                  bgcolor: sidebarOpen && activityTab === 'history' ? 'background.paper' : 'transparent',
                }}
              >
                <Clock size={16} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Sidebar */}
          {sidebarOpen && (
            <>
              <Sidebar
                width={sidebarWidth}
                collections={collections}
                onSelectRequest={handleSelectCollectionRequest}
                onAddRequestToCollection={handleAddRequestToCollection}
                onAddFolder={handleAddFolder}
                onDeleteNode={handleDeleteNode}
                onAddCollection={handleAddCollection}
                onDeleteCollection={handleDeleteCollection}
                onRenameCollection={handleRenameCollection}
                environments={environments}
                onUpdateEnvironments={setEnvironments}
                activeEnvId={activeEnvId}
                onSelectEnv={setActiveEnvId}
                history={history}
                onSelectHistoryItem={(item) => handleNewTab(item.request)}
                onClearHistory={() => setHistory([])}
                activeNavTab={activityTab}
              />
              {/* Sidebar Draggable Splitter */}
              <Box
                onMouseDown={handleSidebarMouseDown}
                sx={{
                  width: 5,
                  cursor: 'col-resize',
                  bgcolor: 'transparent',
                  position: 'relative',
                  zIndex: 20,
                  flexShrink: 0,
                  transition: 'background-color 0.15s ease',
                  '&:hover, &:active': {
                    bgcolor: 'primary.main',
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 2,
                    width: 1,
                    bgcolor: 'divider',
                  },
                }}
              />
            </>
          )}

          {/* Content Area */}
          <ErrorBoundary fallbackTitle="An error occurred in the workspace">
            <Box ref={contentAreaRef} sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <Box sx={{ width: `${editorPercent}%`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <RequestEditor
                  request={activeTab.request}
                  onChange={handleUpdateRequest}
                  onSend={handleSendRequest}
                  onCancel={handleCancelRequest}
                  isLoading={activeTab.isLoading}
                />
              </Box>

              {/* Editor / Response Draggable Splitter */}
              <Box
                onMouseDown={handleSplitterMouseDown}
                sx={{
                  width: 5,
                  cursor: 'col-resize',
                  bgcolor: 'transparent',
                  position: 'relative',
                  zIndex: 20,
                  flexShrink: 0,
                  transition: 'background-color 0.15s ease',
                  '&:hover, &:active': {
                    bgcolor: 'primary.main',
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 2,
                    width: 1,
                    bgcolor: 'divider',
                  },
                }}
              />

              <Box sx={{ width: `${100 - editorPercent}%`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <ResponseViewer
                  response={activeTab.response}
                  isLoading={activeTab.isLoading}
                  requestUrl={activeTab.request.url}
                />
              </Box>
            </Box>
          </ErrorBoundary>
        </Box>

        {/* Status Bar */}
        <StatusBar
          environment={activeEnvironment}
          response={activeTab.response}
          isLoading={activeTab.isLoading}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
