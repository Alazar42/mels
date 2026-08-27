import React, { useState } from 'react';
import {
  Box,
  InputBase,
  Select,
  MenuItem,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Switch,
  Autocomplete,
  TextField,
} from '@mui/material';
import {
  Send,
  Square,
  Plus,
  Trash2,
  Code2,
  Sparkles,
  Sliders,
  Shield,
  Layers,
  FileCode,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { HttpMethod, KeyValue, RequestItem, FormDataField } from '../types';
import { formatJSON } from '../utils/formatters';
import { CodeEditor } from './CodeEditor';
import { COMMON_HEADER_NAMES, COMMON_HEADER_VALUES } from '../utils/httpHeaders';
import { OpenFileDialog } from '../../wailsjs/go/main/App';

interface RequestEditorProps {
  request: RequestItem;
  onChange: (req: RequestItem) => void;
  onSend: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

const METHOD_COLORS: Record<string, string> = {
  GET: '#10b981',
  POST: '#f59e0b',
  PUT: '#3b82f6',
  PATCH: '#a855f7',
  DELETE: '#ef4444',
  OPTIONS: '#06b6d4',
  HEAD: '#64748b',
};

export const RequestEditor: React.FC<RequestEditorProps> = ({
  request,
  onChange,
  onSend,
  onCancel,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<
    'params' | 'headers' | 'body' | 'auth' | 'pre-script' | 'tests' | 'settings'
  >('params');

  const updateField = (field: keyof RequestItem, value: any) => {
    onChange({ ...request, [field]: value });
  };

  const handleUrlChange = (newUrl: string) => {
    updateField('url', newUrl);
  };

  // Query Params
  const handleAddParam = () => {
    const next = [...(request.queryParams || []), { key: '', value: '', enabled: true }];
    updateField('queryParams', next);
  };

  const handleUpdateParam = (index: number, field: keyof KeyValue, value: any) => {
    const next = [...request.queryParams];
    next[index] = { ...next[index], [field]: value };
    updateField('queryParams', next);
  };

  const handleDeleteParam = (index: number) => {
    const next = request.queryParams.filter((_, i) => i !== index);
    updateField('queryParams', next);
  };

  // Headers
  const handleAddHeader = () => {
    const next = [...(request.headers || []), { key: '', value: '', enabled: true }];
    updateField('headers', next);
  };

  const handleUpdateHeader = (index: number, field: keyof KeyValue, value: any) => {
    const next = [...request.headers];
    next[index] = { ...next[index], [field]: value };
    updateField('headers', next);
  };

  const handleDeleteHeader = (index: number) => {
    const next = request.headers.filter((_, i) => i !== index);
    updateField('headers', next);
  };

  // Form Data
  const handleAddFormData = () => {
    const next: FormDataField[] = [
      ...(request.body.formData || []),
      { key: '', value: '', type: 'text', filePath: '', enabled: true },
    ];
    updateField('body', { ...request.body, formData: next });
  };

  const handleUpdateFormData = (index: number, field: keyof FormDataField, value: any) => {
    const next = [...(request.body.formData || [])];
    next[index] = { ...next[index], [field]: value };
    updateField('body', { ...request.body, formData: next });
  };

  const handleDeleteFormData = (index: number) => {
    const next = (request.body.formData || []).filter((_, i) => i !== index);
    updateField('body', { ...request.body, formData: next });
  };

  const handleBrowseFormDataFile = async (index: number) => {
    try {
      const selectedPath = await OpenFileDialog('Select File for Form Data');
      if (selectedPath) {
        handleUpdateFormData(index, 'filePath', selectedPath);
      }
    } catch (err) {
      console.error('File picker error:', err);
    }
  };

  const handleBrowseBinaryFile = async () => {
    try {
      const selectedPath = await OpenFileDialog('Select Binary File');
      if (selectedPath) {
        updateField('body', { ...request.body, binaryFilePath: selectedPath });
      }
    } catch (err) {
      console.error('File picker error:', err);
    }
  };

  // URL Encoded
  const handleAddUrlEncoded = () => {
    const next = [...(request.body.urlEncoded || []), { key: '', value: '', enabled: true }];
    updateField('body', { ...request.body, urlEncoded: next });
  };

  const handleUpdateUrlEncoded = (index: number, field: keyof KeyValue, value: any) => {
    const next = [...(request.body.urlEncoded || [])];
    next[index] = { ...next[index], [field]: value };
    updateField('body', { ...request.body, urlEncoded: next });
  };

  const handleDeleteUrlEncoded = (index: number) => {
    const next = (request.body.urlEncoded || []).filter((_, i) => i !== index);
    updateField('body', { ...request.body, urlEncoded: next });
  };

  const handleBeautifyJSON = () => {
    if (request.body.raw) {
      updateField('body', { ...request.body, raw: formatJSON(request.body.raw) });
    }
  };

  const insertSnippet = (target: 'preRequestScript' | 'testScript', snippet: string) => {
    const current = request[target] || '';
    updateField(target, current + (current ? '\n\n' : '') + snippet);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (isLoading) {
        onCancel();
      } else {
        onSend();
      }
    }
  };

  const activeParamsCount = (request.queryParams || []).filter((p) => p.enabled && p.key).length;
  const activeHeadersCount = (request.headers || []).filter((h) => h.enabled && h.key).length;

  return (
    <Box
      onKeyDown={handleKeyDown}
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
        overflow: 'hidden',
        minWidth: 380,
      }}
    >
      {/* URL & Method Bar */}
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          borderBottom: 1,
          borderColor: '#1c2230',
          bgcolor: '#0c0f17',
        }}
      >
        <Select
          size="small"
          value={request.method}
          onChange={(e) => updateField('method', e.target.value as HttpMethod)}
          sx={{
            minWidth: 90,
            fontWeight: 700,
            fontFamily: 'monospace',
            fontSize: 12,
            color: METHOD_COLORS[request.method] || '#f59e0b',
            bgcolor: '#11141c',
            borderRadius: '8px',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1c2230',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2e384d',
            },
          }}
        >
          {METHODS.map((m) => (
            <MenuItem key={m} value={m} sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: METHOD_COLORS[m] }}>
              {m}
            </MenuItem>
          ))}
        </Select>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            bgcolor: '#11141c',
            border: 1,
            borderColor: '#1c2230',
            borderRadius: '8px',
            px: 1.5,
            py: 0.6,
          }}
        >
          <InputBase
            fullWidth
            placeholder="{{base_url}}/v1/charges"
            value={request.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            sx={{
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              fontSize: 13,
              color: '#f1f5f9',
            }}
          />
        </Box>

        {isLoading ? (
          <Button
            variant="contained"
            color="error"
            startIcon={<Square size={13} fill="currentColor" />}
            onClick={onCancel}
            sx={{
              px: 2.5,
              height: 36,
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={onSend}
            sx={{
              px: 3,
              height: 36,
              bgcolor: '#ffffff',
              color: '#000000',
              fontWeight: 700,
              fontSize: 13,
              borderRadius: '8px',
              textTransform: 'none',
              '&:hover': {
                bgcolor: '#e2e8f0',
              },
            }}
          >
            Send
          </Button>
        )}
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: '#1c2230', bgcolor: '#0c0f17', px: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 36,
            '& .MuiTabs-indicator': {
              bgcolor: '#20c997',
              height: 2,
            },
          }}
        >
          <Tab
            value="params"
            label="Params"
            sx={{ minHeight: 36, py: 0.5, px: 1.5, fontSize: 13, textTransform: 'none', color: '#94a3b8', '&.Mui-selected': { color: '#f1f5f9', fontWeight: 600 } }}
          />
          <Tab
            value="headers"
            label="Headers"
            sx={{ minHeight: 36, py: 0.5, px: 1.5, fontSize: 13, textTransform: 'none', color: '#94a3b8', '&.Mui-selected': { color: '#f1f5f9', fontWeight: 600 } }}
          />
          <Tab
            value="body"
            label="Body"
            sx={{ minHeight: 36, py: 0.5, px: 1.5, fontSize: 13, textTransform: 'none', color: '#f1f5f9', '&.Mui-selected': { color: '#f1f5f9', fontWeight: 600 } }}
          />
          <Tab
            value="pre-script"
            label="Scripts"
            sx={{ minHeight: 36, py: 0.5, px: 1.5, fontSize: 13, textTransform: 'none', color: '#94a3b8', '&.Mui-selected': { color: '#f1f5f9', fontWeight: 600 } }}
          />
          <Tab
            value="tests"
            label="Tests"
            sx={{ minHeight: 36, py: 0.5, px: 1.5, fontSize: 13, textTransform: 'none', color: '#94a3b8', '&.Mui-selected': { color: '#f1f5f9', fontWeight: 600 } }}
          />
          <Tab
            value="auth"
            label="Auth"
            sx={{ minHeight: 36, py: 0.5, px: 1.5, fontSize: 13, textTransform: 'none', color: '#94a3b8', '&.Mui-selected': { color: '#f1f5f9', fontWeight: 600 } }}
          />
          <Tab
            value="settings"
            label="Settings"
            sx={{ minHeight: 36, py: 0.5, px: 1.5, fontSize: 13, textTransform: 'none', color: '#94a3b8', '&.Mui-selected': { color: '#f1f5f9', fontWeight: 600 } }}
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
        {/* PARAMS */}
        {activeTab === 'params' && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                Query Parameters
              </Typography>
              <Button size="small" startIcon={<Plus size={13} />} onClick={handleAddParam}>
                Add Param
              </Button>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 40 }}></TableCell>
                  <TableCell sx={{ width: '40%' }}>Key</TableCell>
                  <TableCell sx={{ width: '50%' }}>Value</TableCell>
                  <TableCell sx={{ width: 40 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(request.queryParams || []).map((param, index) => (
                  <TableRow key={index}>
                    <TableCell align="center">
                      <Checkbox
                        size="small"
                        checked={param.enabled}
                        onChange={(e) => handleUpdateParam(index, 'enabled', e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.25 }}>
                        <InputBase
                          fullWidth
                          placeholder="Parameter name"
                          value={param.key}
                          onChange={(e) => handleUpdateParam(index, 'key', e.target.value)}
                          sx={{ fontFamily: 'monospace', fontSize: 12 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.25 }}>
                        <InputBase
                          fullWidth
                          placeholder="Value (e.g. 123 or {{userId}})"
                          value={param.value}
                          onChange={(e) => handleUpdateParam(index, 'value', e.target.value)}
                          sx={{ fontFamily: 'monospace', fontSize: 12 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleDeleteParam(index)}>
                        <Trash2 size={13} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* HEADERS WITH AUTO-SUGGESTION */}
        {activeTab === 'headers' && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                Request Headers
              </Typography>
              <Button size="small" startIcon={<Plus size={13} />} onClick={handleAddHeader}>
                Add Header
              </Button>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 40 }}></TableCell>
                  <TableCell sx={{ width: '40%' }}>Header</TableCell>
                  <TableCell sx={{ width: '50%' }}>Value</TableCell>
                  <TableCell sx={{ width: 40 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(request.headers || []).map((header, index) => {
                  const suggestedValues = COMMON_HEADER_VALUES[header.key] || [];

                  return (
                    <TableRow key={index}>
                      <TableCell align="center">
                        <Checkbox
                          size="small"
                          checked={header.enabled}
                          onChange={(e) => handleUpdateHeader(index, 'enabled', e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Autocomplete
                          freeSolo
                          options={COMMON_HEADER_NAMES}
                          value={header.key}
                          onInputChange={(_, newVal) => handleUpdateHeader(index, 'key', newVal)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              placeholder="Header name"
                              sx={{ bgcolor: '#11131c', borderRadius: 0.75, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 12 } }}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Autocomplete
                          freeSolo
                          options={suggestedValues}
                          value={header.value}
                          onInputChange={(_, newVal) => handleUpdateHeader(index, 'value', newVal)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              placeholder="Header value"
                              sx={{ bgcolor: '#11131c', borderRadius: 0.75, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 12 } }}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => handleDeleteHeader(index)}>
                          <Trash2 size={13} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* BODY */}
        {activeTab === 'body' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <RadioGroup
                row
                value={request.body.type}
                onChange={(e) =>
                  updateField('body', {
                    ...request.body,
                    type: e.target.value,
                    rawType: request.body.rawType || 'json',
                  })
                }
              >
                {(['none', 'raw', 'x-www-form-urlencoded', 'form-data', 'binary'] as const).map((type) => (
                  <FormControlLabel
                    key={type}
                    value={type}
                    control={<Radio size="small" />}
                    label={<Typography variant="body2" sx={{ fontSize: 12 }}>{type}</Typography>}
                  />
                ))}
              </RadioGroup>

              {request.body.type === 'raw' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Select
                    size="small"
                    value={request.body.rawType || 'json'}
                    onChange={(e) => updateField('body', { ...request.body, rawType: e.target.value })}
                    sx={{ fontSize: 11, '& .MuiSelect-select': { py: 0.3, px: 1 } }}
                  >
                    <MenuItem value="json" sx={{ fontSize: 12 }}>JSON</MenuItem>
                    <MenuItem value="xml" sx={{ fontSize: 12 }}>XML</MenuItem>
                    <MenuItem value="html" sx={{ fontSize: 12 }}>HTML</MenuItem>
                    <MenuItem value="javascript" sx={{ fontSize: 12 }}>JavaScript</MenuItem>
                    <MenuItem value="text" sx={{ fontSize: 12 }}>Text</MenuItem>
                  </Select>

                  {request.body.rawType === 'json' && (
                    <Tooltip title="Format JSON">
                      <IconButton size="small" onClick={handleBeautifyJSON}>
                        <Sparkles size={13} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )}
            </Box>

            {/* RAW (Monaco VS Code Editor) */}
            {request.body.type === 'raw' && (
              <Box sx={{ flex: 1, height: '100%', minHeight: 280, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography
                  sx={{
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: 12,
                    color: '#64748b',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {`// request body — application/${request.body.rawType || 'json'}`}
                </Typography>
                <Box sx={{ flex: 1, height: '100%', minHeight: 250 }}>
                  <CodeEditor
                    value={request.body.raw || ''}
                    onChange={(val) => updateField('body', { ...request.body, raw: val })}
                    language={(request.body.rawType as any) || 'json'}
                    height="100%"
                    minHeight={250}
                  />
                </Box>
              </Box>
            )}

            {request.body.type === 'x-www-form-urlencoded' && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  <Button size="small" startIcon={<Plus size={13} />} onClick={handleAddUrlEncoded}>
                    Add Field
                  </Button>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 40 }}></TableCell>
                      <TableCell>Key</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell sx={{ width: 40 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(request.body.urlEncoded || []).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell align="center">
                          <Checkbox
                            size="small"
                            checked={item.enabled}
                            onChange={(e) => handleUpdateUrlEncoded(index, 'enabled', e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.25 }}>
                            <InputBase
                              fullWidth
                              placeholder="Key"
                              value={item.key}
                              onChange={(e) => handleUpdateUrlEncoded(index, 'key', e.target.value)}
                              sx={{ fontFamily: 'monospace', fontSize: 12 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.25 }}>
                            <InputBase
                              fullWidth
                              placeholder="Value"
                              value={item.value}
                              onChange={(e) => handleUpdateUrlEncoded(index, 'value', e.target.value)}
                              sx={{ fontFamily: 'monospace', fontSize: 12 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => handleDeleteUrlEncoded(index)}>
                            <Trash2 size={13} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {/* FORM DATA WITH NATIVE FILE PICKER */}
            {request.body.type === 'form-data' && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  <Button size="small" startIcon={<Plus size={13} />} onClick={handleAddFormData}>
                    Add Form Field
                  </Button>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 40 }}></TableCell>
                      <TableCell sx={{ width: '25%' }}>Key</TableCell>
                      <TableCell sx={{ width: '15%' }}>Type</TableCell>
                      <TableCell sx={{ width: '50%' }}>Value / File Path</TableCell>
                      <TableCell sx={{ width: 40 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(request.body.formData || []).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell align="center">
                          <Checkbox
                            size="small"
                            checked={item.enabled}
                            onChange={(e) => handleUpdateFormData(index, 'enabled', e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.25 }}>
                            <InputBase
                              fullWidth
                              placeholder="Key"
                              value={item.key}
                              onChange={(e) => handleUpdateFormData(index, 'key', e.target.value)}
                              sx={{ fontFamily: 'monospace', fontSize: 12 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Select
                            fullWidth
                            size="small"
                            value={item.type}
                            onChange={(e) => handleUpdateFormData(index, 'type', e.target.value as any)}
                            sx={{ fontSize: 12 }}
                          >
                            <MenuItem value="text" sx={{ fontSize: 12 }}>Text</MenuItem>
                            <MenuItem value="file" sx={{ fontSize: 12 }}>File</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {item.type === 'file' ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ flex: 1, bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.25 }}>
                                <InputBase
                                  fullWidth
                                  placeholder="Selected file path..."
                                  value={item.filePath || ''}
                                  onChange={(e) => handleUpdateFormData(index, 'filePath', e.target.value)}
                                  sx={{ fontFamily: 'monospace', fontSize: 12 }}
                                />
                              </Box>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<FolderOpen size={13} />}
                                onClick={() => handleBrowseFormDataFile(index)}
                                sx={{ whiteSpace: 'nowrap' }}
                              >
                                Browse
                              </Button>
                            </Box>
                          ) : (
                            <Box sx={{ bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.25 }}>
                              <InputBase
                                fullWidth
                                placeholder="Value"
                                value={item.value}
                                onChange={(e) => handleUpdateFormData(index, 'value', e.target.value)}
                                sx={{ fontFamily: 'monospace', fontSize: 12 }}
                              />
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => handleDeleteFormData(index)}>
                            <Trash2 size={13} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {/* BINARY WITH NATIVE FILE PICKER */}
            {request.body.type === 'binary' && (
              <Box sx={{ p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                  Binary File Upload:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ flex: 1, bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1.5, py: 0.5 }}>
                    <InputBase
                      fullWidth
                      placeholder="Selected file path..."
                      value={request.body.binaryFilePath || ''}
                      onChange={(e) => updateField('body', { ...request.body, binaryFilePath: e.target.value })}
                      sx={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<FolderOpen size={14} />}
                    onClick={handleBrowseBinaryFile}
                  >
                    Select File
                  </Button>
                </Box>
              </Box>
            )}

            {request.body.type === 'none' && (
              <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 5 }}>
                This request does not include a body payload.
              </Typography>
            )}
          </Box>
        )}

        {/* AUTH */}
        {activeTab === 'auth' && (
          <Box sx={{ maxWidth: 460 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 600 }}>
                Auth Type
              </Typography>
              <Select
                fullWidth
                size="small"
                value={request.auth.type}
                onChange={(e) => updateField('auth', { ...request.auth, type: e.target.value as any })}
              >
                <MenuItem value="none">No Auth</MenuItem>
                <MenuItem value="bearer">Bearer Token</MenuItem>
                <MenuItem value="basic">Basic Auth</MenuItem>
                <MenuItem value="api-key">API Key</MenuItem>
              </Select>
            </Box>

            {request.auth.type === 'bearer' && (
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5 }}>Bearer Token:</Typography>
                <Box sx={{ bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.5 }}>
                  <InputBase
                    fullWidth
                    placeholder="Token value (e.g. eyJhbGciOi... or {{token}})"
                    value={request.auth.bearer || ''}
                    onChange={(e) => updateField('auth', { ...request.auth, bearer: e.target.value })}
                    sx={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                </Box>
              </Box>
            )}

            {request.auth.type === 'basic' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Username:</Typography>
                  <Box sx={{ bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.5 }}>
                    <InputBase
                      fullWidth
                      placeholder="Username"
                      value={request.auth.username || ''}
                      onChange={(e) => updateField('auth', { ...request.auth, username: e.target.value })}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Password:</Typography>
                  <Box sx={{ bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.5 }}>
                    <InputBase
                      fullWidth
                      type="password"
                      placeholder="Password"
                      value={request.auth.password || ''}
                      onChange={(e) => updateField('auth', { ...request.auth, password: e.target.value })}
                    />
                  </Box>
                </Box>
              </Box>
            )}

            {request.auth.type === 'api-key' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Key Name:</Typography>
                  <Box sx={{ bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.5 }}>
                    <InputBase
                      fullWidth
                      placeholder="e.g. X-API-KEY"
                      value={request.auth.apiKey?.key || ''}
                      onChange={(e) =>
                        updateField('auth', {
                          ...request.auth,
                          apiKey: { ...(request.auth.apiKey || { addTo: 'header', value: '' }), key: e.target.value },
                        })
                      }
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Key Value:</Typography>
                  <Box sx={{ bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.5 }}>
                    <InputBase
                      fullWidth
                      placeholder="e.g. 123456"
                      value={request.auth.apiKey?.value || ''}
                      onChange={(e) =>
                        updateField('auth', {
                          ...request.auth,
                          apiKey: { ...(request.auth.apiKey || { addTo: 'header', key: '' }), value: e.target.value },
                        })
                      }
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Add To:</Typography>
                  <Select
                    fullWidth
                    size="small"
                    value={request.auth.apiKey?.addTo || 'header'}
                    onChange={(e) =>
                      updateField('auth', {
                        ...request.auth,
                        apiKey: { ...(request.auth.apiKey || { key: '', value: '' }), addTo: e.target.value as any },
                      })
                    }
                  >
                    <MenuItem value="header">Header</MenuItem>
                    <MenuItem value="query">Query Parameter</MenuItem>
                  </Select>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* PRE-REQUEST SCRIPT (Monaco VS Code Editor) */}
        {activeTab === 'pre-script' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', gap: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label="+ Set Env Variable"
                size="small"
                onClick={() => insertSnippet('preRequestScript', `mels.environment.set("timestamp", Date.now().toString());`)}
                sx={{ cursor: 'pointer', fontSize: 11 }}
              />
              <Chip
                label="+ Log Env Variable"
                size="small"
                onClick={() => insertSnippet('preRequestScript', `var token = mels.environment.get("auth_token");\nconsole.log("Using token: " + token);`)}
                sx={{ cursor: 'pointer', fontSize: 11 }}
              />
            </Box>
            <Box sx={{ flex: 1, minHeight: 260 }}>
              <CodeEditor
                value={request.preRequestScript || ''}
                onChange={(val) => updateField('preRequestScript', val)}
                language="javascript"
                height="100%"
                minHeight={260}
              />
            </Box>
          </Box>
        )}

        {/* TESTS (Monaco VS Code Editor) */}
        {activeTab === 'tests' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', gap: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label="+ Status 200 Check"
                size="small"
                onClick={() => insertSnippet('testScript', `mels.test("Status code is 200", () => {\n  mels.expect(res.status).toBe(200);\n});`)}
                sx={{ cursor: 'pointer', fontSize: 11, bgcolor: '#161c28', color: '#cbd5e1', '&:hover': { bgcolor: '#20c997', color: '#000000' } }}
              />
              <Chip
                label="+ Response Time Check"
                size="small"
                onClick={() => insertSnippet('testScript', `mels.test("Response time is under 1000ms", () => {\n  mels.expect(res.time).toBeLessThan(1000);\n});`)}
                sx={{ cursor: 'pointer', fontSize: 11, bgcolor: '#161c28', color: '#cbd5e1', '&:hover': { bgcolor: '#20c997', color: '#000000' } }}
              />
              <Chip
                label="+ JSON Property Check"
                size="small"
                onClick={() => insertSnippet('testScript', `mels.test("Check response data", () => {\n  mels.expect(res.json).toBeDefined();\n});`)}
                sx={{ cursor: 'pointer', fontSize: 11, bgcolor: '#161c28', color: '#cbd5e1', '&:hover': { bgcolor: '#20c997', color: '#000000' } }}
              />
              <Chip
                label="+ Body Text Check"
                size="small"
                onClick={() => insertSnippet('testScript', `mels.test("Body has content", () => {\n  mels.expect(res.body).toBeTruthy();\n});`)}
                sx={{ cursor: 'pointer', fontSize: 11, bgcolor: '#161c28', color: '#cbd5e1', '&:hover': { bgcolor: '#20c997', color: '#000000' } }}
              />
            </Box>
            <Box sx={{ flex: 1, minHeight: 260 }}>
              <CodeEditor
                value={request.testScript || ''}
                onChange={(val) => updateField('testScript', val)}
                language="javascript"
                height="100%"
                minHeight={260}
              />
            </Box>
          </Box>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <Box sx={{ maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 600 }}>
                Request Timeout (milliseconds):
              </Typography>
              <Box sx={{ bgcolor: '#11131c', border: 1, borderColor: 'divider', borderRadius: 0.75, px: 1, py: 0.5 }}>
                <InputBase
                  fullWidth
                  type="number"
                  value={request.settings.timeoutMs}
                  onChange={(e) =>
                    updateField('settings', {
                      ...request.settings,
                      timeoutMs: parseInt(e.target.value) || 30000,
                    })
                  }
                />
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={request.settings.followRedirects}
                  onChange={(e) =>
                    updateField('settings', {
                      ...request.settings,
                      followRedirects: e.target.checked,
                    })
                  }
                />
              }
              label={<Typography variant="body2">Follow HTTP Redirects</Typography>}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={request.settings.enableHttp2 ?? true}
                  onChange={(e) =>
                    updateField('settings', {
                      ...request.settings,
                      enableHttp2: e.target.checked,
                    })
                  }
                />
              }
              label={<Typography variant="body2">Enable HTTP/2 Multiplexing</Typography>}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={request.settings.verifySSL}
                  onChange={(e) =>
                    updateField('settings', {
                      ...request.settings,
                      verifySSL: e.target.checked,
                    })
                  }
                />
              }
              label={<Typography variant="body2">Verify SSL Certificates</Typography>}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};
