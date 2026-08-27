import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Copy,
  Check,
  Clock,
  Layers,
  FileCode,
  Cookie,
  Eye,
  Send,
  Activity,
  CheckCircle2,
  XCircle,
  Terminal,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { ResponseData } from '../types';
import { formatBytes, formatDuration, formatJSON } from '../utils/formatters';
import { CodeEditor } from './CodeEditor';
import { ErrorBoundary } from './ErrorBoundary';

interface ResponseViewerProps {
  response: ResponseData | null;
  isLoading: boolean;
  requestUrl?: string;
  onRetry?: () => void;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({
  response,
  isLoading,
  requestUrl,
}) => {
  const [activeTab, setActiveTab] = useState<
    'pretty' | 'raw' | 'preview' | 'tests' | 'logs' | 'headers' | 'cookies' | 'redirects' | 'timing'
  >('pretty');
  const [copied, setCopied] = useState(false);

  const rawBody = response?.body || '';

  const isJSON = useMemo(() => {
    if (!response) return false;
    return (
      Boolean(response.contentType?.toLowerCase().includes('application/json')) ||
      (rawBody.trim().startsWith('{') && rawBody.trim().endsWith('}')) ||
      (rawBody.trim().startsWith('[') && rawBody.trim().endsWith(']'))
    );
  }, [response, rawBody]);

  const isHTML = useMemo(() => {
    if (!response) return false;
    return (
      Boolean(response.contentType?.toLowerCase().includes('html')) ||
      rawBody.trim().toLowerCase().startsWith('<!doctype html') ||
      rawBody.trim().toLowerCase().startsWith('<html')
    );
  }, [response, rawBody]);

  const isXML = useMemo(() => {
    if (!response) return false;
    return (
      Boolean(response.contentType?.toLowerCase().includes('xml')) ||
      rawBody.trim().toLowerCase().startsWith('<?xml')
    );
  }, [response, rawBody]);

  const isJS = useMemo(() => {
    if (!response) return false;
    return Boolean(response.contentType?.toLowerCase().includes('javascript'));
  }, [response]);

  const isImage = useMemo(() => {
    if (!response) return false;
    return (
      Boolean(response.isBinary && response.contentType?.toLowerCase().startsWith('image/')) ||
      Boolean(response.contentType?.toLowerCase().includes('image'))
    );
  }, [response]);

  const monacoLang: 'json' | 'xml' | 'html' | 'javascript' | 'text' = useMemo(() => {
    if (isJSON) return 'json';
    if (isHTML) return 'html';
    if (isXML) return 'xml';
    if (isJS) return 'javascript';
    return 'text';
  }, [isJSON, isHTML, isXML, isJS]);

  const formattedBody = useMemo(() => {
    if (!response || !rawBody) return '';
    return isJSON ? formatJSON(rawBody) : rawBody;
  }, [response, rawBody, isJSON]);

  const previewHtml = useMemo(() => {
    if (!response || !isHTML || !rawBody) return '';
    let html = rawBody;
    const targetUrl =
      (response.redirectHistory && response.redirectHistory.length > 0
        ? response.redirectHistory[response.redirectHistory.length - 1]
        : requestUrl) || '';

    if (targetUrl) {
      try {
        const baseHref = targetUrl.endsWith('/') ? targetUrl : targetUrl + '/';
        const baseTag = `<base href="${baseHref}">`;

        if (/<head[^>]*>/i.test(html)) {
          html = html.replace(/<head[^>]*>/i, `$&${baseTag}`);
        } else if (/<html[^>]*>/i.test(html)) {
          html = html.replace(/<html[^>]*>/i, `$&<head>${baseTag}</head>`);
        } else {
          html = `<head>${baseTag}</head>` + html;
        }
      } catch (e) {
        // Fallback
      }
    }
    return html;
  }, [response, isHTML, rawBody, requestUrl]);

  const statusTextClean = useMemo(() => {
    if (!response) return '';
    const raw = (response.statusText || '').trim();
    const codeStr = `${response.statusCode}`;
    if (raw.startsWith(codeStr)) {
      return raw.substring(codeStr.length).trim();
    }
    return raw;
  }, [response]);

  const handleCopy = () => {
    if (rawBody) {
      navigator.clipboard.writeText(rawBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={32} thickness={4} sx={{ color: 'primary.main' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Executing Request...
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Running Go HTTP engine & JS Sandbox
        </Typography>
      </Box>
    );
  }

  // 2. Empty State
  if (!response) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          bgcolor: 'background.default',
          color: 'text.disabled',
          p: 3,
          textAlign: 'center',
        }}
      >
        <Send size={40} style={{ color: '#252a3a' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          No Response Yet
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.disabled', maxWidth: 300, fontSize: 12 }}>
          Click <strong>Send</strong> or press <code style={{ background: '#191c28', padding: '2px 6px', borderRadius: 4, color: '#f8fafc' }}>Ctrl + Enter</code> to send.
        </Typography>
      </Box>
    );
  }

  // 3. Response State
  const passedTests = (response.testResults || []).filter((t) => t.passed).length;
  const totalTests = (response.testResults || []).length;
  const hasTests = totalTests > 0;

  const isNetworkError = Boolean(response.error) || response.statusCode === 0;
  const isSuccess = response.statusCode >= 200 && response.statusCode < 300;
  const isClientError = response.statusCode >= 400 && response.statusCode < 500;

  const statusColor: 'success' | 'warning' | 'error' = isSuccess
    ? 'success'
    : isClientError
    ? 'warning'
    : 'error';

  return (
    <ErrorBoundary fallbackTitle="Error rendering response">
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          overflow: 'hidden',
          minWidth: 380,
        }}
      >
        {/* Response Header Status matching screenshot */}
        <Box
          sx={{
            py: 1,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: '#1c2230',
            bgcolor: '#0c0f17',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isNetworkError ? (
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#ef4444', fontFamily: 'monospace' }}>
                Error
              </Typography>
            ) : (
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#20c997', fontFamily: "'JetBrains Mono', monospace" }}>
                {`${response.statusCode} ${statusTextClean || 'OK'}`}
              </Typography>
            )}

            <Typography sx={{ fontSize: 12, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
              {formatDuration(response.timeMs)}
            </Typography>

            <Typography sx={{ fontSize: 12, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
              {formatBytes(response.size)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: 12, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
              {response.contentType?.split(';')[0] || 'application/json'}
            </Typography>

            <Tooltip title="Copy response body">
              <IconButton size="small" onClick={handleCopy} disabled={!rawBody} sx={{ color: '#64748b', p: 0.5 }}>
                {copied ? <Check size={14} color="#20c997" /> : <Copy size={14} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Network Error Banner if request failed completely */}
        {isNetworkError && (
          <Box sx={{ p: 2, bgcolor: '#161014', borderBottom: 1, borderColor: 'error.dark' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <AlertTriangle size={20} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'error.light', mb: 0.5 }}>
                  Error: {response.error || 'Connection Failed'}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
                  The request could not be completed. Below are possible causes:
                </Typography>
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    pl: 2.5,
                    fontSize: 12,
                    color: 'text.secondary',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                  }}
                >
                  <li>
                    <strong>Invalid or Unreachable URL:</strong> Verify the protocol (<code>http://</code> or <code>https://</code>) and hostname.
                  </li>
                  <li>
                    <strong>Server Not Running:</strong> Ensure the destination port and service are active and listening.
                  </li>
                  <li>
                    <strong>SSL / TLS Error:</strong> If using self-signed certificates, toggle off <em>Verify SSL Certificates</em> in the <strong>Settings</strong> tab.
                  </li>
                  <li>
                    <strong>Offline or DNS Failure:</strong> Check your internet connection.
                  </li>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab value="pretty" label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><FileCode size={13} /> Pretty</Box>} />
            <Tab value="raw" label="Raw" />
            {(isHTML || isImage) && (
              <Tab value="preview" label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Eye size={13} /> Preview</Box>} />
            )}
            {hasTests && (
              <Tab
                value="tests"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircle2 size={13} color={passedTests === totalTests ? '#10b981' : '#f43f5e'} />
                    Tests ({passedTests}/{totalTests})
                  </Box>
                }
              />
            )}
            {response.scriptLogs?.length > 0 && (
              <Tab
                value="logs"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Terminal size={13} />
                    Logs ({response.scriptLogs.length})
                  </Box>
                }
              />
            )}
            <Tab
              value="headers"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Headers
                  {response.headers?.length > 0 && <Chip label={response.headers.length} size="small" sx={{ height: 16, fontSize: 10 }} />}
                </Box>
              }
            />
            <Tab
              value="cookies"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Cookie size={13} />
                  Cookies
                  {response.cookies?.length > 0 && <Chip label={response.cookies.length} size="small" sx={{ height: 16, fontSize: 10 }} />}
                </Box>
              }
            />
            {response.redirectHistory?.length > 0 && (
              <Tab
                value="redirects"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ArrowRight size={13} />
                    Redirects ({response.redirectHistory.length})
                  </Box>
                }
              />
            )}
            <Tab value="timing" label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Activity size={13} /> Timing</Box>} />
          </Tabs>
        </Box>

        {/* Panels */}
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {response.isTruncated && (
            <Box sx={{ p: 1 }}>
              <Alert severity="warning" sx={{ py: 0.25, fontSize: 12 }}>
                Payload exceeded 5MB memory limit and was truncated for speed. Total size: {formatBytes(response.size)}.
              </Alert>
            </Box>
          )}

          {/* PRETTY (VS Code Monaco Editor) */}
          {activeTab === 'pretty' && (
            <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
              {response.isBinary ? (
                <Typography variant="body2" sx={{ p: 3, color: 'text.disabled', textAlign: 'center' }}>
                  [Binary Payload ({formatBytes(response.size)})]
                </Typography>
              ) : rawBody ? (
                <CodeEditor
                  value={formattedBody}
                  language={monacoLang}
                  readOnly={true}
                  height="100%"
                  minHeight={280}
                />
              ) : (
                <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {isNetworkError ? 'No response received due to client error.' : 'Response body is empty (0 bytes received).'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* RAW (VS Code Monaco Editor) */}
          {activeTab === 'raw' && (
            <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
              {rawBody ? (
                <CodeEditor
                  value={rawBody}
                  language="text"
                  readOnly={true}
                  height="100%"
                  minHeight={280}
                />
              ) : (
                <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {isNetworkError ? 'No response received due to client error.' : 'Response body is empty (0 bytes received).'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* PREVIEW */}
          {activeTab === 'preview' && (
            <Box sx={{ flex: 1, height: '100%', width: '100%', bgcolor: '#ffffff', overflow: 'hidden' }}>
              {isImage ? (
                <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={`data:${response.contentType || 'image/png'};base64,${rawBody}`}
                    alt="Response preview"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }}
                  />
                </Box>
              ) : isHTML && previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  title="Response HTML Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff', display: 'block' }}
                />
              ) : (
                <Box sx={{ p: 2, bgcolor: 'background.default', height: '100%' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Preview not available for this content type ({response.contentType || 'unknown'}).
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* TESTS */}
          {activeTab === 'tests' && (
            <Box sx={{ p: 2, overflowY: 'auto' }}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: passedTests === totalTests ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: 1,
                  borderColor: passedTests === totalTests ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                  borderRadius: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {passedTests === totalTests ? 'All Tests Passed' : `${totalTests - passedTests} Test(s) Failed`}
                </Typography>
                <Chip
                  label={`${passedTests} / ${totalTests} Passed`}
                  size="small"
                  color={passedTests === totalTests ? 'success' : 'error'}
                  sx={{ fontWeight: 700, fontFamily: 'monospace' }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(response.testResults || []).map((tr, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.25,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {tr.passed ? <CheckCircle2 size={15} color="#10b981" /> : <XCircle size={15} color="#ef4444" />}
                      <Typography variant="body2" sx={{ fontWeight: 600, color: tr.passed ? 'text.primary' : 'error.light' }}>
                        {tr.name}
                      </Typography>
                    </Box>
                    {tr.error && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(239, 68, 68, 0.1)', borderLeft: 2, borderColor: 'error.main', fontFamily: 'monospace', fontSize: 11, color: 'error.light' }}>
                        {tr.error}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* LOGS */}
          {activeTab === 'logs' && (
            <Box sx={{ p: 2, overflowY: 'auto' }}>
              <Box sx={{ p: 1.5, bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 1, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}>
                {response.scriptLogs.map((log, i) => (
                  <div key={i} style={{ color: log.startsWith('[ERROR]') || log.startsWith('[Test Script Error]') ? '#f87171' : '#cbd5e1' }}>
                    {log}
                  </div>
                ))}
              </Box>
            </Box>
          )}

          {/* HEADERS */}
          {activeTab === 'headers' && (
            <Box sx={{ p: 1.5, overflowY: 'auto' }}>
              {(!response.headers || response.headers.length === 0) ? (
                <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 3, fontSize: 12 }}>
                  No headers returned.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '40%' }}>Header</TableCell>
                      <TableCell>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {response.headers.map((h, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ color: 'primary.light', fontFamily: 'monospace' }}>{h.key}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{h.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}

          {/* COOKIES */}
          {activeTab === 'cookies' && (
            <Box sx={{ p: 1.5, overflowY: 'auto' }}>
              {(!response.cookies || response.cookies.length === 0) ? (
                <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 3, fontSize: 12 }}>
                  No cookies returned in this response.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Domain</TableCell>
                      <TableCell>Path</TableCell>
                      <TableCell>Expires</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {response.cookies.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>{c.name}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{c.value}</TableCell>
                        <TableCell>{c.domain || '/'}</TableCell>
                        <TableCell>{c.path || '/'}</TableCell>
                        <TableCell>{c.expires || 'Session'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}

          {/* REDIRECTS */}
          {activeTab === 'redirects' && (
            <Box sx={{ p: 2, overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(response.redirectHistory || []).map((url, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: 12,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.disabled', width: 25 }}>#{i + 1}</Typography>
                    <ArrowRight size={13} color="#f59e0b" />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{url}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* TIMING */}
          {activeTab === 'timing' && (
            <Box sx={{ p: 2, overflowY: 'auto' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: 1,
                  p: 1.5,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase' }}>DNS Lookup</Typography>
                  <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{response.timing?.dnsLookupMs || 0} ms</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase' }}>TCP Connect</Typography>
                  <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{response.timing?.tcpConnMs || 0} ms</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase' }}>TLS Handshake</Typography>
                  <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{response.timing?.tlsHandshakeMs || 0} ms</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase' }}>TTFB (Server)</Typography>
                  <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{response.timing?.serverTimeMs || 0} ms</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase' }}>Download</Typography>
                  <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{response.timing?.downloadTimeMs || 0} ms</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase' }}>Total</Typography>
                  <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'success.main' }}>
                    {response.timing?.totalDurationMs || response.timeMs} ms
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </ErrorBoundary>
  );
};
