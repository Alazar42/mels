import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { melsTheme } from './theme';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { RequestEditor } from './components/RequestEditor';
import { ResponseViewer } from './components/ResponseViewer';
import { NetworkTimingPanel } from './components/NetworkTimingPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  Collection,
  Environment,
  HistoryItem,
  RequestItem,
  ResponseData,
  createDefaultRequest,
} from './types';
import { buildVariableMap, resolveRequestVariables } from './utils/interpolation';
import { SaveFileDialog, ReadFileContent } from '../wailsjs/go/main/App';
import { executeRequest, cancelRequest } from './services/requestEngine';
import { AsyncStorage } from './utils/storage';

const DEFAULT_TESTING_COLLECTION: Collection = {
  schemaVersion: '1.0.0',
  id: 'col_testing_api',
  name: 'Testing API (httpbin)',
  items: [
    {
      id: 'req_httpbin_get',
      name: 'GET Request',
      type: 'request',
      request: {
        id: 'req_httpbin_get',
        name: 'GET Request',
        method: 'GET',
        url: 'https://httpbin.org/get',
        queryParams: [{ key: 'test', value: 'mels', enabled: true }],
        headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
        body: { type: 'none' },
        auth: { type: 'none' },
        settings: { timeoutMs: 30000, followRedirects: true, maxRedirects: 10, verifySSL: true },
        testScript: `mels.test("Status is 200", () => {\n  mels.expect(res.status).toBe(200);\n});`,
      },
    },
    {
      id: 'req_httpbin_post',
      name: 'POST JSON',
      type: 'request',
      request: {
        id: 'req_httpbin_post',
        name: 'POST JSON',
        method: 'POST',
        url: 'https://httpbin.org/post',
        queryParams: [],
        headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        body: {
          type: 'raw',
          rawType: 'json',
          raw: '{\n  "message": "Hello from Mels!",\n  "version": "1.0.0"\n}',
        },
        auth: { type: 'none' },
        settings: { timeoutMs: 30000, followRedirects: true, maxRedirects: 10, verifySSL: true },
        testScript: `mels.test("Response contains JSON", () => {\n  mels.expect(res.status).toBe(200);\n  mels.expect(res.json.json.message).toBe("Hello from Mels!");\n});`,
      },
    },
    {
      id: 'req_httpbin_delay',
      name: 'Delay Timing Test',
      type: 'request',
      request: {
        id: 'req_httpbin_delay',
        name: 'Delay Timing Test',
        method: 'GET',
        url: 'https://httpbin.org/delay/1',
        queryParams: [],
        headers: [],
        body: { type: 'none' },
        auth: { type: 'none' },
        settings: { timeoutMs: 30000, followRedirects: true, maxRedirects: 10, verifySSL: true },
      },
    },
  ],
};

const DEFAULT_TEST_ENVIRONMENTS: Environment[] = [
  {
    id: 'env_httpbin',
    name: 'httpbin Test',
    variables: [
      { key: 'baseUrl', value: 'https://httpbin.org', enabled: true },
    ],
  },
];

export function App() {
  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('mels_collections');
    return saved ? JSON.parse(saved) : [DEFAULT_TESTING_COLLECTION];
  });

  const [environments, setEnvironments] = useState<Environment[]>(() => {
    const saved = localStorage.getItem('mels_environments');
    return saved ? JSON.parse(saved) : DEFAULT_TEST_ENVIRONMENTS;
  });

  const [activeEnvId, setActiveEnvId] = useState<string | null>(() => {
    return localStorage.getItem('mels_active_env_id') || 'env_httpbin';
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('mels_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [activityTab, setActivityTab] = useState<'collections' | 'envs' | 'history'>('collections');

  const defaultReq =
    (DEFAULT_TESTING_COLLECTION.items[0]?.request as RequestItem) ||
    createDefaultRequest('GET Request');

  const [activeRequestId, setActiveRequestId] = useState<string>(() => {
    return defaultReq.id;
  });

  const [activeRequest, setActiveRequest] = useState<RequestItem>(() => {
    const saved = localStorage.getItem('mels_active_request');
    return saved ? JSON.parse(saved) : defaultReq;
  });

  const [activeResponse, setActiveResponse] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Resizable Views State
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('mels_sidebar_width');
    return saved ? parseInt(saved, 10) : 240;
  });
  const [topPercent, setTopPercent] = useState<number>(() => {
    const saved = localStorage.getItem('mels_top_percent');
    return saved ? parseFloat(saved) : 50;
  });

  const centerColumnRef = useRef<HTMLDivElement>(null);

  // Initial Load from Persistent Disk Storage (AsyncStorage)
  useEffect(() => {
    (async () => {
      try {
        const savedCols = await AsyncStorage.getItem<Collection[]>('mels_collections', []);
        if (savedCols && savedCols.length > 0) {
          setCollections(savedCols);
          // If active request belongs to saved collections, set it
          const firstReq = savedCols[0]?.items?.[0]?.request;
          if (firstReq) {
            setActiveRequestId(firstReq.id);
            setActiveRequest(firstReq);
          }
        }

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

  // Save to AsyncStorage and LocalStorage on change
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

  useEffect(() => {
    localStorage.setItem('mels_active_request', JSON.stringify(activeRequest));
  }, [activeRequest]);

  useEffect(() => {
    localStorage.setItem('mels_sidebar_width', sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem('mels_top_percent', topPercent.toString());
  }, [topPercent]);

  // Drag handler for sidebar width
  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(180, Math.min(450, startWidth + delta));
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

  // Drag handler for top/bottom center split percentage
  const handleVerticalSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!centerColumnRef.current) return;
    const rect = centerColumnRef.current.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const offsetY = moveEvent.clientY - rect.top;
      const percent = (offsetY / rect.height) * 100;
      const clamped = Math.max(25, Math.min(75, percent));
      setTopPercent(clamped);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const activeEnvironment = environments.find((e) => e.id === activeEnvId) || null;

  const handleSelectCollectionRequest = (req: RequestItem) => {
    setActiveRequestId(req.id);
    setActiveRequest(JSON.parse(JSON.stringify(req)));
  };

  const handleUpdateRequest = (updatedReq: RequestItem) => {
    setActiveRequest(updatedReq);

    // Also update inside collections tree
    const updateNodes = (nodes: any[]): any[] =>
      nodes.map((node) => {
        if (node.id === updatedReq.id && node.type === 'request') {
          return { ...node, name: updatedReq.name, request: updatedReq };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });

    setCollections((prev) =>
      prev.map((col) => ({
        ...col,
        items: updateNodes(col.items),
      }))
    );
  };

  const handleSendRequest = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const variableMap = buildVariableMap(activeEnvironment);
      const resolvedReq = resolveRequestVariables(activeRequest, variableMap);
      resolvedReq.variables = variableMap;

      const responseData = await executeRequest(resolvedReq);

      // If scripts updated environment variables
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

      setActiveResponse(responseData);
      setIsLoading(false);

      const newHistoryItem: HistoryItem = {
        id: 'hist_' + Date.now(),
        timestamp: Date.now(),
        request: JSON.parse(JSON.stringify(activeRequest)),
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
        requestId: activeRequest.id,
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
          connReused: false,
        },
        isBinary: false,
        isTruncated: false,
        error: err.message || 'Unknown network error',
        testResults: [],
        scriptLogs: [],
        redirectHistory: [],
      };
      setActiveResponse(errorResp);
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!isLoading) return;
    await cancelRequest(activeRequest.id);
    setIsLoading(false);
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
    setActiveRequestId(newReq.id);
    setActiveRequest(newReq);
  };

  const handleAddCollection = (name: string) => {
    const newCol: Collection = {
      schemaVersion: '1.0.0',
      id: 'col_' + Math.random().toString(36).substring(2, 9),
      name: name || 'New Collection',
      items: [],
    };
    setCollections((prev) => [...prev, newCol]);
  };

  const handleDeleteCollection = (collectionId: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
  };

  const handleRenameCollection = (collectionId: string, newName: string) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === collectionId ? { ...c, name: newName } : c))
    );
  };

  const handleAddFolder = (collectionId: string, parentFolderId?: string) => {
    const newFolder = {
      id: 'folder_' + Math.random().toString(36).substring(2, 9),
      name: 'New Folder',
      type: 'folder' as const,
      children: [],
    };

    setCollections(
      collections.map((col) => {
        if (col.id !== collectionId) return col;

        if (parentFolderId) {
          const addToFolder = (nodes: any[]): any[] =>
            nodes.map((node) => {
              if (node.id === parentFolderId) {
                return {
                  ...node,
                  children: [...(node.children || []), newFolder],
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
          items: [...col.items, newFolder],
        };
      })
    );
  };

  const handleRenameNode = (collectionId: string, nodeId: string, newName: string) => {
    const updateNodeName = (nodes: any[]): any[] =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          const updated = { ...node, name: newName };
          if (node.type === 'request' && node.request) {
            updated.request = { ...node.request, name: newName };
          }
          return updated;
        }
        if (node.children) {
          return { ...node, children: updateNodeName(node.children) };
        }
        return node;
      });

    setCollections((prev) =>
      prev.map((col) => {
        if (col.id !== collectionId) return col;
        return { ...col, items: updateNodeName(col.items) };
      })
    );

    if (activeRequest.id === nodeId) {
      setActiveRequest((prev) => ({ ...prev, name: newName }));
    }
  };

  const handleDuplicateRequest = (collectionId: string, requestId: string) => {
    let duplicatedReq: RequestItem | null = null;

    const findAndDuplicate = (nodes: any[]): any[] => {
      const result: any[] = [];
      for (const node of nodes) {
        result.push(node);
        if (node.id === requestId && node.type === 'request' && node.request) {
          const clonedReq: RequestItem = {
            ...JSON.parse(JSON.stringify(node.request)),
            id: 'req_' + Math.random().toString(36).substring(2, 9),
            name: `${node.name} (Copy)`,
          };
          duplicatedReq = clonedReq;
          result.push({
            id: clonedReq.id,
            name: clonedReq.name,
            type: 'request',
            request: clonedReq,
          });
        } else if (node.children) {
          result[result.length - 1] = {
            ...node,
            children: findAndDuplicate(node.children),
          };
        }
      }
      return result;
    };

    setCollections((prev) =>
      prev.map((col) => {
        if (col.id !== collectionId) return col;
        return { ...col, items: findAndDuplicate(col.items) };
      })
    );

    if (duplicatedReq) {
      setActiveRequestId((duplicatedReq as RequestItem).id);
      setActiveRequest(duplicatedReq);
    }
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
      setCollections([DEFAULT_TESTING_COLLECTION]);
      setEnvironments(DEFAULT_TEST_ENVIRONMENTS);
      setHistory([]);
      setActiveEnvId('env_httpbin');
      setActiveRequestId(defaultReq.id);
      setActiveRequest(defaultReq);
      setActiveResponse(null);
    } catch (e) {
      console.error('Clear storage error:', e);
    }
  };

  return (
    <ThemeProvider theme={melsTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', bgcolor: '#0c0f17' }}>
        {/* Sleek Top Navigation Bar with Logo, Import, Export, Settings */}
        <TitleBar
          onExport={handleExportCollection}
          onImport={handleImportCollection}
          onClearAllStorage={handleClearAllStorage}
        />

        {/* Main 3-Column Workspace */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Sidebar (COLLECTIONS, Environments, History) */}
          <Sidebar
            width={sidebarWidth}
            collections={collections}
            activeRequestId={activeRequestId}
            onSelectRequest={handleSelectCollectionRequest}
            onAddRequestToCollection={handleAddRequestToCollection}
            onAddFolder={handleAddFolder}
            onDeleteNode={handleDeleteNode}
            onRenameNode={handleRenameNode}
            onDuplicateRequest={handleDuplicateRequest}
            onAddCollection={handleAddCollection}
            onDeleteCollection={handleDeleteCollection}
            onRenameCollection={handleRenameCollection}
            environments={environments}
            onUpdateEnvironments={setEnvironments}
            activeEnvId={activeEnvId}
            onSelectEnv={setActiveEnvId}
            history={history}
            onSelectHistoryItem={(item) => {
              setActiveRequestId(item.request.id);
              setActiveRequest(item.request);
            }}
            onClearHistory={() => setHistory([])}
            activeNavTab={activityTab}
            onNavTabChange={setActivityTab}
          />

          {/* Sidebar Draggable Splitter */}
          <Box
            onMouseDown={handleSidebarMouseDown}
            sx={{
              width: 4,
              cursor: 'col-resize',
              bgcolor: 'transparent',
              position: 'relative',
              zIndex: 20,
              flexShrink: 0,
              transition: 'background-color 0.15s ease',
              '&:hover, &:active': {
                bgcolor: '#20c997',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 1,
                width: 1,
                bgcolor: '#1c2230',
              },
            }}
          />

          {/* Center Column: Top Request Editor & Bottom Response Viewer */}
          <ErrorBoundary fallbackTitle="An error occurred in the workspace">
            <Box
              ref={centerColumnRef}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                height: '100%',
                overflow: 'hidden',
                bgcolor: '#0c0f17',
              }}
            >
              {/* Top: Request Editor */}
              <Box
                sx={{
                  height: `${topPercent}%`,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <RequestEditor
                  request={activeRequest}
                  onChange={handleUpdateRequest}
                  onSend={handleSendRequest}
                  onCancel={handleCancelRequest}
                  isLoading={isLoading}
                />
              </Box>

              {/* Horizontal Resizable Splitter */}
              <Box
                onMouseDown={handleVerticalSplitterMouseDown}
                sx={{
                  height: 4,
                  cursor: 'row-resize',
                  bgcolor: 'transparent',
                  position: 'relative',
                  zIndex: 20,
                  flexShrink: 0,
                  transition: 'background-color 0.15s ease',
                  '&:hover, &:active': {
                    bgcolor: '#20c997',
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 1,
                    height: 1,
                    bgcolor: '#1c2230',
                  },
                }}
              />

              {/* Bottom: Response Viewer */}
              <Box
                sx={{
                  height: `${100 - topPercent}%`,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <ResponseViewer
                  response={activeResponse}
                  isLoading={isLoading}
                  requestUrl={activeRequest.url}
                />
              </Box>
            </Box>
          </ErrorBoundary>

          {/* Right Column: Network Timing Panel */}
          <NetworkTimingPanel
            timing={activeResponse?.timing}
            totalTimeMs={activeResponse?.timeMs}
            isLoading={isLoading}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
