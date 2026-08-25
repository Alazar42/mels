import React from 'react';
import Editor, { EditorProps } from '@monaco-editor/react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: 'json' | 'xml' | 'html' | 'javascript' | 'text';
  readOnly?: boolean;
  height?: string | number;
  placeholder?: string;
  minHeight?: number;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'json',
  readOnly = false,
  height = '100%',
  placeholder = '',
  minHeight = 220,
}) => {
  const monacoLanguage =
    language === 'json'
      ? 'json'
      : language === 'xml'
      ? 'xml'
      : language === 'html'
      ? 'html'
      : language === 'javascript'
      ? 'javascript'
      : 'plaintext';

  return (
    <Box
      sx={{
        height: height,
        minHeight: minHeight,
        width: '100%',
        bgcolor: '#10121a',
        borderRadius: 1,
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        position: 'relative',
      }}
    >
      <Editor
        height={height}
        language={monacoLanguage}
        theme="vs-dark"
        value={value}
        onChange={(val) => onChange && onChange(val || '')}
        options={{
          readOnly: readOnly,
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          lineNumbers: 'on',
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          padding: { top: 8, bottom: 8 },
          folding: true,
          bracketPairColorization: { enabled: true },
          formatOnPaste: true,
        }}
        loading={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Loading Editor...</Typography>
          </Box>
        }
      />
    </Box>
  );
};
